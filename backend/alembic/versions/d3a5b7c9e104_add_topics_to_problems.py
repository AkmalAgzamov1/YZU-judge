"""Add topics to problems.

Revision ID: d3a5b7c9e104
Revises: c91e7a3f0d42
Create Date: 2026-10-31
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "d3a5b7c9e104"
down_revision: Union[str, Sequence[str], None] = "c91e7a3f0d42"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "problems",
        sa.Column("topics", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("problems", "topics")
