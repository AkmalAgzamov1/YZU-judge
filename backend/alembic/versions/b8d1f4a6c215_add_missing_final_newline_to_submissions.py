"""Flag accepted submissions whose output lacks a final newline.

Revision ID: b8d1f4a6c215
Revises: a9c4e7d21b30
Create Date: 2026-11-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b8d1f4a6c215"
down_revision: Union[str, Sequence[str], None] = "a9c4e7d21b30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "submissions",
        sa.Column("missing_final_newline", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("submissions", "missing_final_newline")
