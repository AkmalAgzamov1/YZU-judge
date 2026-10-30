"""Add CPE papers, mock exams, and link submissions to mock exams.

Revision ID: b4f2d8c61e93
Revises: a7c3e91d5b20
Create Date: 2026-10-31
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b4f2d8c61e93"
down_revision: Union[str, Sequence[str], None] = "a7c3e91d5b20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cpe_papers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("held_on", sa.Date(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="180"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "cpe_paper_problems",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("paper_id", sa.Integer(), sa.ForeignKey("cpe_papers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.UniqueConstraint("paper_id", "position", name="uq_cpe_paper_problems_position"),
        sa.UniqueConstraint("paper_id", "problem_id", name="uq_cpe_paper_problems_problem"),
    )

    op.create_table(
        "mock_exams",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("paper_id", sa.Integer(), sa.ForeignKey("cpe_papers.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ends_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_mock_exams_user_id", "mock_exams", ["user_id"])

    op.add_column("submissions", sa.Column("mock_exam_id", sa.Integer(), sa.ForeignKey("mock_exams.id"), nullable=True))
    op.create_index("ix_submissions_mock_exam_id", "submissions", ["mock_exam_id"])


def downgrade() -> None:
    op.drop_index("ix_submissions_mock_exam_id", table_name="submissions")
    op.drop_column("submissions", "mock_exam_id")
    op.drop_index("ix_mock_exams_user_id", table_name="mock_exams")
    op.drop_table("mock_exams")
    op.drop_table("cpe_paper_problems")
    op.drop_table("cpe_papers")
