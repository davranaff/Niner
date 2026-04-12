"""Compatibility re-export for ORM models.

Domain model classes now live inside their respective module packages:
- app.modules.users.models
- app.modules.auth.models
- app.modules.lessons.models
- app.modules.reading.models
- app.modules.listening.models
- app.modules.writing.models
- app.modules.exams.models
- app.modules.admin.models
- app.modules.teacher_students.models
- app.modules.ai_summary.models
"""

from app.db.model_enums import *  # noqa: F401,F403
from app.modules.admin.models import *  # noqa: F401,F403
from app.modules.ai_summary.models import *  # noqa: F401,F403
from app.modules.assignments.models import *  # noqa: F401,F403
from app.modules.auth.models import *  # noqa: F401,F403
from app.modules.exams.models import *  # noqa: F401,F403
from app.modules.lessons.models import *  # noqa: F401,F403
from app.modules.listening.models import *  # noqa: F401,F403
from app.modules.reading.models import *  # noqa: F401,F403
from app.modules.teacher_students.models import *  # noqa: F401,F403
from app.modules.users.models import *  # noqa: F401,F403
from app.modules.writing.models import *  # noqa: F401,F403
from app.modules.speaking.models import *  # noqa: F401,F403
