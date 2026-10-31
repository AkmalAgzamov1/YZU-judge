"""Store compiler output on submissions.

Revision ID: e5f2a8b1c637
Revises: d3a5b7c9e104
Create Date: 2026-10-31
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e5f2a8b1c637"
down_revision: Union[str, Sequence[str], None] = "d3a5b7c9e104"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("submissions", sa.Column("compile_output", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("submissions", "compile_output")
