"""add post-exam assignments subsystem

Revision ID: f5c7d9a1b2e3
Revises: e8a1c2d3f4ab
Create Date: 2026-04-13 18:20:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f5c7d9a1b2e3"
down_revision: str | None = "e8a1c2d3f4ab"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


progress_test_type_enum = sa.Enum(
    "reading",
    "listening",
    "writing",
    "speaking",
    name="progress_test_type_enum",
    native_enum=False,
)
skill_gap_status_enum = sa.Enum(
    "open",
    "improving",
    "resolved",
    name="skill_gap_status_enum",
    native_enum=False,
)
assignment_status_enum = sa.Enum(
    "recommended",
    "in_progress",
    "completed",
    "cancelled",
    name="assignment_status_enum",
    native_enum=False,
)
assignment_attempt_status_enum = sa.Enum(
    "submitted",
    "evaluated",
    name="assignment_attempt_status_enum",
    native_enum=False,
)


def upgrade() -> None:
    op.create_table(
        "assignment_error_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("module", progress_test_type_enum, nullable=False),
        sa.Column("exam_kind", sa.String(length=32), nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("source_key", sa.String(length=128), nullable=False),
        sa.Column("skill_key", sa.String(length=128), nullable=False),
        sa.Column("skill_label", sa.String(length=255), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column("expected_answer", sa.Text(), nullable=True),
        sa.Column("user_answer", sa.Text(), nullable=True),
        sa.Column("severity", sa.Integer(), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_assignment_error_items_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assignment_error_items")),
        sa.UniqueConstraint(
            "user_id",
            "exam_kind",
            "exam_id",
            "source_key",
            name="uq_assignment_error_item_source",
        ),
    )
    op.create_index(op.f("ix_assignment_error_items_user_id"), "assignment_error_items", ["user_id"], unique=False)
    op.create_index("ix_assignment_error_exam", "assignment_error_items", ["exam_kind", "exam_id"], unique=False)
    op.create_index(
        "ix_assignment_error_skill",
        "assignment_error_items",
        ["user_id", "skill_key"],
        unique=False,
    )

    op.create_table(
        "assignment_skill_gaps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("module", progress_test_type_enum, nullable=False),
        sa.Column("skill_key", sa.String(length=128), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("status", skill_gap_status_enum, nullable=False),
        sa.Column("severity_score", sa.Numeric(precision=4, scale=2), nullable=False),
        sa.Column("occurrences", sa.Integer(), nullable=False),
        sa.Column("last_error_item_id", sa.Integer(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(
            ["last_error_item_id"],
            ["assignment_error_items.id"],
            name=op.f("fk_assignment_skill_gaps_last_error_item_id_assignment_error_items"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_assignment_skill_gaps_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assignment_skill_gaps")),
        sa.UniqueConstraint("user_id", "module", "skill_key", name="uq_assignment_skill_gap_key"),
    )
    op.create_index(op.f("ix_assignment_skill_gaps_user_id"), "assignment_skill_gaps", ["user_id"], unique=False)
    op.create_index(
        "ix_assignment_gap_user_seen",
        "assignment_skill_gaps",
        ["user_id", "last_seen_at"],
        unique=False,
    )

    op.create_table(
        "training_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("module", progress_test_type_enum, nullable=False),
        sa.Column("skill_gap_id", sa.Integer(), nullable=True),
        sa.Column("source_error_item_id", sa.Integer(), nullable=True),
        sa.Column("source_exam_kind", sa.String(length=32), nullable=False),
        sa.Column("source_exam_id", sa.Integer(), nullable=False),
        sa.Column("dedupe_key", sa.String(length=191), nullable=False),
        sa.Column("task_type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", assignment_status_enum, nullable=False),
        sa.Column("recommended_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(
            ["skill_gap_id"],
            ["assignment_skill_gaps.id"],
            name=op.f("fk_training_assignments_skill_gap_id_assignment_skill_gaps"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["source_error_item_id"],
            ["assignment_error_items.id"],
            name=op.f("fk_training_assignments_source_error_item_id_assignment_error_items"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_training_assignments_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_training_assignments")),
        sa.UniqueConstraint("user_id", "dedupe_key", name="uq_training_assignment_dedupe"),
    )
    op.create_index(op.f("ix_training_assignments_user_id"), "training_assignments", ["user_id"], unique=False)
    op.create_index(
        "ix_training_assignment_user_status",
        "training_assignments",
        ["user_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_training_assignment_exam",
        "training_assignments",
        ["source_exam_kind", "source_exam_id"],
        unique=False,
    )

    op.create_table(
        "training_assignment_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("status", assignment_attempt_status_enum, nullable=False),
        sa.Column("response_text", sa.Text(), nullable=False),
        sa.Column("score", sa.Numeric(precision=4, scale=2), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(
            ["assignment_id"],
            ["training_assignments.id"],
            name=op.f("fk_training_assignment_attempts_assignment_id_training_assignments"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_training_assignment_attempts_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_training_assignment_attempts")),
    )
    op.create_index(
        op.f("ix_training_assignment_attempts_assignment_id"),
        "training_assignment_attempts",
        ["assignment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_training_assignment_attempts_user_id"),
        "training_assignment_attempts",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_training_assignment_attempts_user_id"), table_name="training_assignment_attempts")
    op.drop_index(op.f("ix_training_assignment_attempts_assignment_id"), table_name="training_assignment_attempts")
    op.drop_table("training_assignment_attempts")

    op.drop_index("ix_training_assignment_exam", table_name="training_assignments")
    op.drop_index("ix_training_assignment_user_status", table_name="training_assignments")
    op.drop_index(op.f("ix_training_assignments_user_id"), table_name="training_assignments")
    op.drop_table("training_assignments")

    op.drop_index("ix_assignment_gap_user_seen", table_name="assignment_skill_gaps")
    op.drop_index(op.f("ix_assignment_skill_gaps_user_id"), table_name="assignment_skill_gaps")
    op.drop_table("assignment_skill_gaps")

    op.drop_index("ix_assignment_error_skill", table_name="assignment_error_items")
    op.drop_index("ix_assignment_error_exam", table_name="assignment_error_items")
    op.drop_index(op.f("ix_assignment_error_items_user_id"), table_name="assignment_error_items")
    op.drop_table("assignment_error_items")
