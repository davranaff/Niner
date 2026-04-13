import logging

from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings

logger = logging.getLogger(__name__)


async def _enqueue(job_name: str, *args) -> None:
    redis = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    try:
        await redis.enqueue_job(job_name, *args)
    finally:
        await redis.close()


async def enqueue_table_parse(kind: str, block_id: int) -> None:
    await _enqueue("parse_table_completion", kind, block_id)


async def enqueue_writing_evaluation(exam_part_id: int) -> None:
    await _enqueue("evaluate_writing_exam_part", exam_part_id)


async def enqueue_module_summary(summary_id: int) -> None:
    await _enqueue("generate_module_summary", summary_id)


async def enqueue_assignment_test_generation(assignment_id: int) -> None:
    await _enqueue("generate_assignment_test", assignment_id)
