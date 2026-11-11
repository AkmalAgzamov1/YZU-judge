"""add presentation error verdict

Revision ID: c7d9e2f4a816
Revises: d8e4b2f7a613
Create Date: 2026-11-11
"""
from typing import Sequence, Union

from alembic import op


revision: str = "c7d9e2f4a816"
down_revision: Union[str, Sequence[str], None] = "d8e4b2f7a613"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'presentation_error'")
    op.execute("ALTER TYPE submission_result_verdict ADD VALUE IF NOT EXISTS 'presentation_error'")


def downgrade() -> None:
    # PostgreSQL does not support removing an enum value directly. IF NOT EXISTS
    # above lets the migration go up again.
    pass
