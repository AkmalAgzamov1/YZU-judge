"""Add the UVa Online Judge number to problems.

Revision ID: a7c3e91d5b20
Revises: 284f3ffb1f5e
Create Date: 2026-10-31
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a7c3e91d5b20"
down_revision: Union[str, Sequence[str], None] = "284f3ffb1f5e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("problems", sa.Column("uva_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("uq_problems_uva_id", "problems", ["uva_id"])


def downgrade() -> None:
    op.drop_constraint("uq_problems_uva_id", "problems", type_="unique")
    op.drop_column("problems", "uva_id")
