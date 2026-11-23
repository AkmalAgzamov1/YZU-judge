"""Add random_count for runs against a random selection of hidden tests.

Revision ID: f4c8a2b7d901
Revises: e3b7a1c9d4f2
Create Date: 2026-11-24
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "f4c8a2b7d901"
down_revision: Union[str, Sequence[str], None] = "e3b7a1c9d4f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("runs", sa.Column("random_count", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("runs", "random_count")
