"""Let an admin end every session of a user.

Revision ID: c6e2a9d4f871
Revises: b8d1f4a6c215
Create Date: 2026-11-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c6e2a9d4f871"
down_revision: Union[str, Sequence[str], None] = "b8d1f4a6c215"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("users", "token_version")
