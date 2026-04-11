"""add ai summary and teacher-student binding

Revision ID: 9c2f3d8a1b7e
Revises: 027ebca4a96b
Create Date: 2026-04-11 20:10:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9c2f3d8a1b7e"
down_revision: str | None = "027ebca4a96b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "teacher_student_links",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], name=op.f("fk_teacher_student_links_student_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"], name=op.f("fk_teacher_student_links_teacher_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_teacher_student_links")),
        sa.UniqueConstraint("student_id", name=op.f("uq_teacher_student_links_student_id")),
    )
    op.create_index(op.f("ix_teacher_student_links_teacher_id"), "teacher_student_links", ["teacher_id"], unique=False)
    op.create_index(op.f("ix_teacher_student_links_student_id"), "teacher_student_links", ["student_id"], unique=False)
    op.create_index(
        "ix_teacher_student_link_teacher_student",
        "teacher_student_links",
        ["teacher_id", "student_id"],
        unique=False,
    )

    op.create_table(
        "teacher_student_invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("used_by_student_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"], name=op.f("fk_teacher_student_invites_teacher_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["used_by_student_id"], ["users.id"], name=op.f("fk_teacher_student_invites_used_by_student_id_users"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_teacher_student_invites")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_teacher_student_invites_token_hash")),
    )
    op.create_index(op.f("ix_teacher_student_invites_teacher_id"), "teacher_student_invites", ["teacher_id"], unique=False)
    op.create_index(op.f("ix_teacher_student_invites_token_hash"), "teacher_student_invites", ["token_hash"], unique=True)
    op.create_index(op.f("ix_teacher_student_invites_used_by_student_id"), "teacher_student_invites", ["used_by_student_id"], unique=False)

    op.create_table(
        "ai_module_summaries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("module", sa.Enum("reading", "listening", "writing", name="ai_summary_module_enum", native_enum=False), nullable=False),
        sa.Column("source", sa.Enum("manual", "auto_submit", name="ai_summary_source_enum", native_enum=False), nullable=False),
        sa.Column("status", sa.Enum("pending", "running", "done", "failed", name="ai_summary_status_enum", native_enum=False), nullable=False),
        sa.Column("lang", sa.String(length=8), nullable=False),
        sa.Column("attempts_limit", sa.Integer(), nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=True),
        sa.Column("trigger_user_id", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stream_text", sa.Text(), nullable=True),
        sa.Column("result_json", sa.JSON(), nullable=True),
        sa.Column("result_text", sa.Text(), nullable=True),
        sa.Column("error_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["trigger_user_id"], ["users.id"], name=op.f("fk_ai_module_summaries_trigger_user_id_users"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_ai_module_summaries_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_module_summaries")),
    )
    op.create_index(op.f("ix_ai_module_summaries_user_id"), "ai_module_summaries", ["user_id"], unique=False)
    op.create_index("ix_ai_summary_user_module_created", "ai_module_summaries", ["user_id", "module", "created_at"], unique=False)
    op.create_index("ix_ai_summary_status", "ai_module_summaries", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_ai_summary_status", table_name="ai_module_summaries")
    op.drop_index("ix_ai_summary_user_module_created", table_name="ai_module_summaries")
    op.drop_index(op.f("ix_ai_module_summaries_user_id"), table_name="ai_module_summaries")
    op.drop_table("ai_module_summaries")

    op.drop_index(op.f("ix_teacher_student_invites_used_by_student_id"), table_name="teacher_student_invites")
    op.drop_index(op.f("ix_teacher_student_invites_token_hash"), table_name="teacher_student_invites")
    op.drop_index(op.f("ix_teacher_student_invites_teacher_id"), table_name="teacher_student_invites")
    op.drop_table("teacher_student_invites")

    op.drop_index("ix_teacher_student_link_teacher_student", table_name="teacher_student_links")
    op.drop_index(op.f("ix_teacher_student_links_student_id"), table_name="teacher_student_links")
    op.drop_index(op.f("ix_teacher_student_links_teacher_id"), table_name="teacher_student_links")
    op.drop_table("teacher_student_links")
