"""Allow unknown memory measurements when the runner cannot observe a peak.

Revision ID: f2a61b04c7d9
Revises: 3ce3fdabef45
Create Date: 2026-10-09
"""
from typing import Sequence, Union

from alembic import op


revision: str = "f2a61b04c7d9"
down_revision: Union[str, Sequence[str], None] = "3ce3fdabef45"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("submission_result", "memory_used_mb", nullable=True)


def downgrade() -> None:
    op.alter_column("submission_result", "memory_used_mb", nullable=False)
