"""Add a draft or published flag to problems.

Problems that already exist stay visible, so students see no change.

Revision ID: c91e7a3f0d42
Revises: b4f2d8c61e93
Create Date: 2026-10-31
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c91e7a3f0d42"
down_revision: Union[str, Sequence[str], None] = "b4f2d8c61e93"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "problems",
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    # New problems start as drafts from now on.
    op.alter_column("problems", "is_published", server_default=sa.false())


def downgrade() -> None:
    op.drop_column("problems", "is_published")
