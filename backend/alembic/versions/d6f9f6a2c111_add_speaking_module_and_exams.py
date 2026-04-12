"""add speaking module and speaking exams

Revision ID: d6f9f6a2c111
Revises: b7d150c74490
Create Date: 2026-04-12 04:45:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d6f9f6a2c111"
down_revision: str | None = "b7d150c74490"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "speaking_tests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("level", sa.String(length=32), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("instructions", sa.JSON(), nullable=False),
        sa.Column("scoring_focus", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_tests")),
        sa.UniqueConstraint("slug", name=op.f("uq_speaking_tests_slug")),
    )

    op.create_table(
        "speaking_parts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("test_id", sa.Integer(), nullable=False),
        sa.Column("part_id", sa.String(length=16), nullable=False),
        sa.Column("part_order", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("examiner_guidance", sa.Text(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["test_id"], ["speaking_tests.id"], name=op.f("fk_speaking_parts_test_id_speaking_tests"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_parts")),
        sa.UniqueConstraint("test_id", "part_id", name="uq_speaking_part_test_part_id"),
        sa.UniqueConstraint("test_id", "part_order", name="uq_speaking_part_test_part_order"),
    )
    op.create_index(op.f("ix_speaking_parts_test_id"), "speaking_parts", ["test_id"], unique=False)

    op.create_table(
        "speaking_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("part_id", sa.Integer(), nullable=False),
        sa.Column("question_code", sa.String(length=32), nullable=False),
        sa.Column("question_order", sa.Integer(), nullable=False),
        sa.Column("short_label", sa.String(length=120), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("expected_answer_seconds", sa.Integer(), nullable=False),
        sa.Column("rephrase_prompt", sa.Text(), nullable=True),
        sa.Column("follow_ups", sa.JSON(), nullable=True),
        sa.Column("cue_card", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["part_id"], ["speaking_parts.id"], name=op.f("fk_speaking_questions_part_id_speaking_parts"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_questions")),
        sa.UniqueConstraint("part_id", "question_code", name="uq_speaking_question_part_question_code"),
        sa.UniqueConstraint("part_id", "question_order", name="uq_speaking_question_part_order"),
    )
    op.create_index(op.f("ix_speaking_questions_part_id"), "speaking_questions", ["part_id"], unique=False)

    op.create_table(
        "speaking_exams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("speaking_test_id", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "finish_reason",
            sa.Enum("completed", "left", "time_is_up", name="finish_reason_enum", native_enum=False),
            nullable=True,
        ),
        sa.Column("session_status", sa.String(length=64), server_default=sa.text("'idle'"), nullable=False),
        sa.Column("connection_state", sa.String(length=32), server_default=sa.text("'offline'"), nullable=False),
        sa.Column("current_speaker", sa.String(length=16), server_default=sa.text("'none'"), nullable=False),
        sa.Column("current_part_id", sa.String(length=16), server_default=sa.text("'part1'"), nullable=False),
        sa.Column("current_question_index", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("asked_question_ids", sa.JSON(), nullable=False),
        sa.Column("note_draft", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("elapsed_seconds", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("prep_remaining_seconds", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("transcript_segments", sa.JSON(), nullable=False),
        sa.Column("turns", sa.JSON(), nullable=False),
        sa.Column("integrity_events", sa.JSON(), nullable=False),
        sa.Column("result_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["speaking_test_id"], ["speaking_tests.id"], name=op.f("fk_speaking_exams_speaking_test_id_speaking_tests"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_speaking_exams_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_exams")),
    )
    op.create_index(op.f("ix_speaking_exams_user_id"), "speaking_exams", ["user_id"], unique=False)
    op.create_index(op.f("ix_speaking_exams_speaking_test_id"), "speaking_exams", ["speaking_test_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_speaking_exams_speaking_test_id"), table_name="speaking_exams")
    op.drop_index(op.f("ix_speaking_exams_user_id"), table_name="speaking_exams")
    op.drop_table("speaking_exams")

    op.drop_index(op.f("ix_speaking_questions_part_id"), table_name="speaking_questions")
    op.drop_table("speaking_questions")

    op.drop_index(op.f("ix_speaking_parts_test_id"), table_name="speaking_parts")
    op.drop_table("speaking_parts")

    op.drop_table("speaking_tests")
