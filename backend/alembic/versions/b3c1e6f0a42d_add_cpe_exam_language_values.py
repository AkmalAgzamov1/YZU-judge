"""add CPE exam language values

Adds the new selectable submission languages to the existing PostgreSQL enum
type: c_gcc, c_msvc, java8, java11. The older python / java / cpp values already
exist and stay for stored solutions and submission history.

Revision ID: b3c1e6f0a42d
Revises: d4b8f1a3c927
Create Date: 2026-11-16
"""
from typing import Sequence, Union

from alembic import op


revision: str = "b3c1e6f0a42d"
down_revision: Union[str, Sequence[str], None] = "d4b8f1a3c927"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NEW_VALUES = ("c_gcc", "c_msvc", "java8", "java11")


def upgrade() -> None:
    for value in NEW_VALUES:
        op.execute(
            f"ALTER TYPE submission_language ADD VALUE IF NOT EXISTS '{value}'"
        )


def downgrade() -> None:
    # PostgreSQL cannot drop a single enum value without rebuilding the type and the
    # submissions table that uses it. Leaving them in place is harmless: SubmissionCreate
    # no longer offers them, and IF NOT EXISTS above lets the migration run again.
    pass
