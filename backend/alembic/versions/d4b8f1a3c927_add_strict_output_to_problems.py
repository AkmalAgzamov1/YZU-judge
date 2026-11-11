"""Add strict_output to problems, off for problems that are not on UVa.

Revision ID: d4b8f1a3c927
Revises: c7d9e2f4a816
Create Date: 2026-11-11
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d4b8f1a3c927"
down_revision: Union[str, Sequence[str], None] = "c7d9e2f4a816"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "problems",
        sa.Column("strict_output", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    # Warm-ups such as A + B have no official judge to match, so they stay lenient.
    op.execute("UPDATE problems SET strict_output = false WHERE uva_id IS NULL")


def downgrade() -> None:
    op.drop_column("problems", "strict_output")
