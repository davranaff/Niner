"""add overall exams

Revision ID: c1a84d9b7e31
Revises: b7d150c74490
Create Date: 2026-04-12 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1a84d9b7e31"
down_revision: Union[str, None] = "b7d150c74490"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "overall_exams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("phase", sa.Text(), nullable=False),
        sa.Column("current_module", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "finish_reason",
            sa.Enum("completed", "left", "time_is_up", name="finish_reason_enum", native_enum=False),
            nullable=True,
        ),
        sa.Column("break_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("break_duration_seconds", sa.Integer(), nullable=False),
        sa.Column("listening_test_id", sa.Integer(), nullable=False),
        sa.Column("reading_test_id", sa.Integer(), nullable=False),
        sa.Column("writing_test_id", sa.Integer(), nullable=False),
        sa.Column("listening_exam_id", sa.Integer(), nullable=True),
        sa.Column("reading_exam_id", sa.Integer(), nullable=True),
        sa.Column("writing_exam_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["listening_exam_id"], ["listening_exams.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["listening_test_id"], ["listening_tests.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["reading_exam_id"], ["reading_exams.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reading_test_id"], ["reading_tests.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["writing_exam_id"], ["writing_exams.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["writing_test_id"], ["writing_tests.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_overall_exams")),
        sa.UniqueConstraint("listening_exam_id", name="uq_overall_exams_listening_exam_id"),
        sa.UniqueConstraint("reading_exam_id", name="uq_overall_exams_reading_exam_id"),
        sa.UniqueConstraint("writing_exam_id", name="uq_overall_exams_writing_exam_id"),
    )
    op.create_index(op.f("ix_overall_exams_user_id"), "overall_exams", ["user_id"], unique=False)
    op.create_index(op.f("ix_overall_exams_listening_test_id"), "overall_exams", ["listening_test_id"], unique=False)
    op.create_index(op.f("ix_overall_exams_reading_test_id"), "overall_exams", ["reading_test_id"], unique=False)
    op.create_index(op.f("ix_overall_exams_writing_test_id"), "overall_exams", ["writing_test_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_overall_exams_writing_test_id"), table_name="overall_exams")
    op.drop_index(op.f("ix_overall_exams_reading_test_id"), table_name="overall_exams")
    op.drop_index(op.f("ix_overall_exams_listening_test_id"), table_name="overall_exams")
    op.drop_index(op.f("ix_overall_exams_user_id"), table_name="overall_exams")
    op.drop_table("overall_exams")
