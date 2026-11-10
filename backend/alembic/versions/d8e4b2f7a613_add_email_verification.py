"""Add email verification and password reset codes.

Every account that exists today is marked verified, so nobody who already
signs in has to do anything. New accounts start unverified.

Revision ID: d8e4b2f7a613
Revises: c6e2a9d4f173
Create Date: 2026-11-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d8e4b2f7a613"
down_revision: Union[str, Sequence[str], None] = "c6e2a9d4f173"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default true fills the existing rows, then new rows default to false.
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.alter_column("users", "email_verified", server_default=sa.false())

    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "email_codes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("purpose", sa.String(length=16), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_email_codes_user_id", "email_codes", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_email_codes_user_id", table_name="email_codes")
    op.drop_table("email_codes")
    op.drop_column("users", "token_version")
    op.drop_column("users", "email_verified")
