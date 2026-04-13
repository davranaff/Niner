from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, Response, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.security import decode_token
from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.db.session import SessionLocal
from app.modules.exams import services as exam_services
from app.modules.speaking import services
from app.modules.speaking.schemas import (
    LiveClientEvent,
    LiveServerEvent,
    SpeakingSessionState,
    SpeakingTestDetail,
    SpeakingTtsRequest,
)
from app.modules.speaking.services.realtime import speaking_realtime_hub
from app.modules.speaking.services.tts import synthesize_examiner_audio

router = APIRouter(prefix="/speaking", tags=["speaking"])


def _extract_ws_token(websocket: WebSocket) -> str:
    token = str(websocket.query_params.get("token") or "").strip()
    if token:
        return token

    authorization = str(websocket.headers.get("authorization") or "").strip()
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()

    return ""


async def _authenticate_ws_user(websocket: WebSocket) -> User:
    token = _extract_ws_token(websocket)
    if not token:
        raise ApiError(code="unauthorized", message="Missing websocket access token", status_code=401)

    payload = decode_token(token)
    if payload.get("type") != "access":
        raise ApiError(code="invalid_token", message="Invalid websocket access token", status_code=401)

    user_id = payload.get("sub")
    if not user_id or not str(user_id).isdigit():
        raise ApiError(code="invalid_token", message="Malformed websocket token subject", status_code=401)

    async with SessionLocal() as db:
        user = await db.get(User, int(user_id))

    if user is None or not user.is_active:
        raise ApiError(code="unauthorized", message="Inactive websocket user", status_code=401)

    return user


@router.get("/tests")
async def list_tests(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await services.list_speaking_tests(db, current_user, offset=offset, limit=limit)


@router.get("/tests/{test_id}", response_model=SpeakingTestDetail)
async def get_test_detail(
    test_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpeakingTestDetail:
    payload = await services.get_speaking_test_detail(db, current_user, test_id)
    return SpeakingTestDetail.model_validate(payload)


@router.post("/tts")
async def tts(
    payload: SpeakingTtsRequest,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="TTS text must not be empty.")

    try:
        audio = await synthesize_examiner_audio(text=text, voice=payload.voice)
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"TTS synthesis failed: {error}") from error

    return Response(content=audio, media_type="audio/mpeg")


@router.websocket("/live/{exam_id}")
async def speaking_live_socket(websocket: WebSocket, exam_id: int):
    client_id = str(websocket.query_params.get("client_id") or "").strip()
    if not client_id:
        await websocket.close(code=4400, reason="Missing client_id")
        return

    try:
        current_user = await _authenticate_ws_user(websocket)
    except ApiError as error:
        close_code = 4401 if error.status_code == 401 else 4403
        await websocket.close(code=close_code, reason=error.message)
        return

    exam_test_id: int | None = None
    try:
        async with SessionLocal() as db:
            session_payload = await exam_services.get_speaking_exam_session_owned(db, current_user, exam_id)
            exam_test_id = int(session_payload.get("test_id"))
    except ApiError as error:
        close_code = 4404 if error.status_code == 404 else 4403
        await websocket.close(code=close_code, reason=error.message)
        return

    stop_event = asyncio.Event()
    await speaking_realtime_hub.connect(
        exam_id,
        websocket,
        user_id=current_user.id,
        client_id=client_id,
    )
    heartbeat_task = asyncio.create_task(speaking_realtime_hub.heartbeat(exam_id, stop_event))
    await speaking_realtime_hub.emit(
        exam_id,
        LiveServerEvent(
            type="server.connected",
            exam_id=exam_id,
            message="Realtime speaking socket connected.",
            payload={"session": session_payload},
        ),
    )

    last_seq = -1
    seen_nonces: set[str] = set()

    try:
        while True:
            raw = await websocket.receive_json()
            incoming = LiveClientEvent.model_validate(raw)
            context = speaking_realtime_hub.get_context(exam_id, websocket)
            if context is None:
                raise ApiError(code="forbidden", message="Realtime websocket context missing", status_code=403)
            if incoming.exam_id != exam_id:
                raise ApiError(
                    code="invalid_exam_submission",
                    message="Realtime event exam_id mismatch.",
                    status_code=400,
                )
            if incoming.client_id != context.client_id:
                raise ApiError(code="forbidden", message="Realtime event client identity mismatch.", status_code=403)
            if incoming.seq <= last_seq:
                raise ApiError(code="forbidden", message="Realtime event sequence is out of order.", status_code=403)
            if incoming.nonce in seen_nonces:
                raise ApiError(code="forbidden", message="Realtime event nonce replay detected.", status_code=403)

            last_seq = incoming.seq
            seen_nonces.add(incoming.nonce)
            if len(seen_nonces) > 512:
                seen_nonces.clear()

            if incoming.type == "session.snapshot":
                snapshot = incoming.payload.get("session")
                if snapshot:
                    parsed = SpeakingSessionState.model_validate(snapshot)
                    if parsed.id != str(exam_id):
                        raise ApiError(
                            code="exam_session_mismatch",
                            message="Realtime snapshot session id mismatch.",
                            status_code=400,
                        )
                    if exam_test_id is not None and parsed.test_id != exam_test_id:
                        raise ApiError(
                            code="exam_session_mismatch",
                            message="Realtime snapshot test id mismatch.",
                            status_code=400,
                        )
                    async with SessionLocal() as db:
                        await exam_services.persist_speaking_session_payload(exam_id, parsed, db)

            if incoming.type == "session.end":
                async with SessionLocal() as db:
                    await exam_services.mark_speaking_session_terminated(exam_id, db)

            await speaking_realtime_hub.acknowledge(exam_id, incoming)
    except ApiError as error:
        await websocket.close(code=4403, reason=error.message)
    except WebSocketDisconnect:
        pass
    finally:
        stop_event.set()
        heartbeat_task.cancel()
        async with SessionLocal() as db:
            await exam_services.mark_speaking_connection_disconnected(exam_id, db)
        speaking_realtime_hub.disconnect(exam_id, websocket)
