from arq.connections import RedisSettings

from app.core.config import settings
from app.workers.tasks import (
    evaluate_writing_exam_part,
    generate_assignment_test,
    generate_module_summary,
    parse_table_completion,
)


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    functions = [
        parse_table_completion,
        evaluate_writing_exam_part,
        generate_module_summary,
        generate_assignment_test,
    ]
    max_jobs = 10
    max_tries = 3
