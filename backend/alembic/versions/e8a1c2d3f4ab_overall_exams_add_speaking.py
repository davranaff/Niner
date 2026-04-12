"""overall exams: speaking module

Revision ID: e8a1c2d3f4ab
Revises: 174e8bb41140
Create Date: 2026-04-12 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8a1c2d3f4ab"
down_revision: Union[str, None] = "174e8bb41140"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("overall_exams", sa.Column("speaking_test_id", sa.Integer(), nullable=True))
    op.add_column("overall_exams", sa.Column("speaking_exam_id", sa.Integer(), nullable=True))

    bind = op.get_bind()
    first_speaking = bind.execute(sa.text("SELECT id FROM speaking_tests ORDER BY id ASC LIMIT 1")).first()
    if first_speaking is not None:
        bind.execute(
            sa.text("UPDATE overall_exams SET speaking_test_id = :tid WHERE speaking_test_id IS NULL"),
            {"tid": int(first_speaking[0])},
        )

    op.alter_column("overall_exams", "speaking_test_id", existing_type=sa.Integer(), nullable=False)

    op.create_foreign_key(
        op.f("fk_overall_exams_speaking_test_id_speaking_tests"),
        "overall_exams",
        "speaking_tests",
        ["speaking_test_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        op.f("fk_overall_exams_speaking_exam_id_speaking_exams"),
        "overall_exams",
        "speaking_exams",
        ["speaking_exam_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_overall_exams_speaking_test_id"),
        "overall_exams",
        ["speaking_test_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_overall_exams_speaking_exam_id",
        "overall_exams",
        ["speaking_exam_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_overall_exams_speaking_exam_id", "overall_exams", type_="unique")
    op.drop_index(op.f("ix_overall_exams_speaking_test_id"), table_name="overall_exams")
    op.drop_constraint(
        op.f("fk_overall_exams_speaking_exam_id_speaking_exams"),
        "overall_exams",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("fk_overall_exams_speaking_test_id_speaking_tests"),
        "overall_exams",
        type_="foreignkey",
    )
    op.drop_column("overall_exams", "speaking_exam_id")
    op.drop_column("overall_exams", "speaking_test_id")
