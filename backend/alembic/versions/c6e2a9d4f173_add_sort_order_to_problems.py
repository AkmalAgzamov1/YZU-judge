"""Add sort_order to problems.

Higher sort_order comes first within the same difficulty. Every existing problem gets 0,
so the list looks the same until an admin raises a problem (for example A + B).

Revision ID: c6e2a9d4f173
Revises: b8d1f4a6c215
Create Date: 2026-11-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c6e2a9d4f173"
down_revision: Union[str, Sequence[str], None] = "b8d1f4a6c215"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "problems",
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("problems", "sort_order")
