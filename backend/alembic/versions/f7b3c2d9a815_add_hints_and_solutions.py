"""Add hints and reference solutions for easy problems.

Revision ID: f7b3c2d9a815
Revises: e5f2a8b1c637
Create Date: 2026-11-01
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "f7b3c2d9a815"
down_revision: Union[str, Sequence[str], None] = "e5f2a8b1c637"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "problems",
        sa.Column("hints", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
    )
    op.add_column("problems", sa.Column("solution_explanation", sa.Text(), nullable=True))
    op.add_column("problems", sa.Column("solution_python", sa.Text(), nullable=True))
    op.add_column("problems", sa.Column("solution_cpp", sa.Text(), nullable=True))

    op.create_table(
        "hint_reveals",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id"), primary_key=True),
        sa.Column("revealed_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("hint_reveals")
    op.drop_column("problems", "solution_cpp")
    op.drop_column("problems", "solution_python")
    op.drop_column("problems", "solution_explanation")
    op.drop_column("problems", "hints")
