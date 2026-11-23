"""Add throwaway test runs for the editor's Run button.

Revision ID: e3b7a1c9d4f2
Revises: b3c1e6f0a42d
Create Date: 2026-11-23
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e3b7a1c9d4f2"
down_revision: Union[str, Sequence[str], None] = "b3c1e6f0a42d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.Column("language", sa.String(), nullable=False),
        sa.Column("mode", sa.String(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("custom_input", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("verdict", sa.String(), nullable=True),
        sa.Column("compile_output", sa.Text(), nullable=True),
        sa.Column("results_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_runs_user_id", "runs", ["user_id"])
    op.create_index("ix_runs_created_at", "runs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_runs_created_at", table_name="runs")
    op.drop_index("ix_runs_user_id", table_name="runs")
    op.drop_table("runs")
