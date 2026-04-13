"""add generated weak-area test state to assignments

Revision ID: ab42c7d9e1f0
Revises: f5c7d9a1b2e3
Create Date: 2026-04-13 20:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ab42c7d9e1f0"
down_revision: str | None = "f5c7d9a1b2e3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "training_assignments",
        sa.Column("generation_status", sa.String(length=32), nullable=False, server_default="idle"),
    )
    op.add_column(
        "training_assignments",
        sa.Column("generation_progress", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("training_assignments", sa.Column("generation_error", sa.Text(), nullable=True))
    op.add_column("training_assignments", sa.Column("generation_requested_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("training_assignments", sa.Column("generation_started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("training_assignments", sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("training_assignments", sa.Column("generated_test_id", sa.Integer(), nullable=True))
    op.create_index(
        "ix_training_assignment_generated_test",
        "training_assignments",
        ["module", "generated_test_id"],
        unique=False,
    )
    op.alter_column("training_assignments", "generation_status", server_default=None)
    op.alter_column("training_assignments", "generation_progress", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_training_assignment_generated_test", table_name="training_assignments")
    op.drop_column("training_assignments", "generated_test_id")
    op.drop_column("training_assignments", "generated_at")
    op.drop_column("training_assignments", "generation_started_at")
    op.drop_column("training_assignments", "generation_requested_at")
    op.drop_column("training_assignments", "generation_error")
    op.drop_column("training_assignments", "generation_progress")
    op.drop_column("training_assignments", "generation_status")
