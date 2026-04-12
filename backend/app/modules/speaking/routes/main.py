from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, Response, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

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


@router.get("/tests")
async def list_tests(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await services.list_speaking_tests(db, current_user, offset=offset, limit=limit)


@router.get("/tests/{test_id}", response_model=SpeakingTestDetail)
async def get_test_detail(test_id: int, db: AsyncSession = Depends(get_db)) -> SpeakingTestDetail:
    payload = await services.get_speaking_test_detail(db, test_id)
    return SpeakingTestDetail.model_validate(payload)


@router.post("/tts")
async def tts(payload: SpeakingTtsRequest):
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
    stop_event = asyncio.Event()
    await speaking_realtime_hub.connect(exam_id, websocket)
    heartbeat_task = asyncio.create_task(speaking_realtime_hub.heartbeat(exam_id, stop_event))

    async with SessionLocal() as db:
        session_payload = await exam_services.get_speaking_exam_session(exam_id, db)
    await speaking_realtime_hub.emit(
        exam_id,
        LiveServerEvent(
            type="server.connected",
            exam_id=exam_id,
            message="Realtime speaking socket connected.",
            payload={"session": session_payload},
        ),
    )

    try:
        while True:
            raw = await websocket.receive_json()
            incoming = LiveClientEvent.model_validate(raw)

            if incoming.type == "session.snapshot":
                snapshot = incoming.payload.get("session")
                if snapshot:
                    parsed = SpeakingSessionState.model_validate(snapshot)
                    async with SessionLocal() as db:
                        await exam_services.persist_speaking_session_payload(exam_id, parsed, db)

            if incoming.type == "session.end":
                async with SessionLocal() as db:
                    await exam_services.mark_speaking_session_terminated(exam_id, db)

            await speaking_realtime_hub.acknowledge(exam_id, incoming)
    except WebSocketDisconnect:
        async with SessionLocal() as db:
            await exam_services.mark_speaking_connection_disconnected(exam_id, db)
        speaking_realtime_hub.disconnect(exam_id, websocket)
    finally:
        stop_event.set()
        heartbeat_task.cancel()
