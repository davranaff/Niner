import asyncio
import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.models import AiSummaryStatusEnum, User
from app.db.session import get_db
from app.modules.ai_summary import services
from app.modules.teacher_students.services.core import assert_access_to_student

router = APIRouter(tags=["ai-stream"])


def _sse_line(event: str, data: dict) -> str:
    return f"event: {event}\\ndata: {json.dumps(data, ensure_ascii=False)}\\n\\n"


@router.get("/ai/summaries/{summary_id}/stream")
async def stream_ai_summary(
    summary_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    row = await services.get_summary_or_404(db, summary_id)
    await assert_access_to_student(db, current_user, row.user_id)

    async def event_stream() -> AsyncIterator[str]:
        sent_chars = 0
        last_status = None

        yield _sse_line(
            "meta",
            {
                "id": row.id,
                "user_id": row.user_id,
                "module": row.module.value,
                "source": row.source.value,
            },
        )

        while True:
            current = await services.get_summary_or_404(db, summary_id)
            await db.refresh(current)

            if current.status.value != last_status:
                last_status = current.status.value
                yield _sse_line("status", {"status": current.status.value})

            text = current.stream_text or ""
            if len(text) > sent_chars:
                chunk = text[sent_chars:]
                sent_chars = len(text)
                yield _sse_line("token", {"text": chunk})

            if current.status == AiSummaryStatusEnum.done:
                yield _sse_line(
                    "done",
                    {
                        "id": current.id,
                        "finished_at": current.finished_at.isoformat() if current.finished_at else None,
                        "result": current.result_json,
                        "summary_text": current.result_text,
                    },
                )
                break

            if current.status == AiSummaryStatusEnum.failed:
                yield _sse_line(
                    "error",
                    {
                        "id": current.id,
                        "message": current.error_text or "AI summary generation failed",
                    },
                )
                break

            yield _sse_line("heartbeat", {"ts": datetime.now(UTC).isoformat()})
            await asyncio.sleep(0.5)

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    }
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=headers)
