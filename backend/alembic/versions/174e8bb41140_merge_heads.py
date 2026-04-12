"""merge_heads

Revision ID: 174e8bb41140
Revises: c1a84d9b7e31, d6f9f6a2c111
Create Date: 2026-04-12 07:21:53.269714

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '174e8bb41140'
down_revision: Union[str, None] = ('c1a84d9b7e31', 'd6f9f6a2c111')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
