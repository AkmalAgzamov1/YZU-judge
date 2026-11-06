"""add output limit exceeded verdict

Revision ID: a9c4e7d21b30
Revises: f7b3c2d9a815

"""
from typing import Sequence, Union

from alembic import op


revision: str = "a9c4e7d21b30"
down_revision: Union[str, Sequence[str], None] = "f7b3c2d9a815"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'output_limit_exceeded'")
    op.execute("ALTER TYPE submission_result_verdict ADD VALUE IF NOT EXISTS 'output_limit_exceeded'")


def downgrade() -> None:
    # PostgreSQL does not support removing an enum value directly.
    pass
