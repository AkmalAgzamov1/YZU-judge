"""change problem difficulty values

Revision ID: 3ce3fdabef45
Revises: d5c8417cce11
Create Date: 2026-09-22 11:30:49.080967

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3ce3fdabef45'
down_revision: Union[str, Sequence[str], None] = 'd5c8417cce11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None: 
    op.execute(
        "ALTER TYPE problem_difficulty RENAME VALUE 'Easy' TO 'easy'"
    )
    op.execute(
        "ALTER TYPE problem_difficulty RENAME VALUE 'Medium' TO 'medium'"
    )
    op.execute(
        "ALTER TYPE problem_difficulty RENAME VALUE 'Hard' TO 'hard'"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TYPE problem_difficulty RENAME VALUE 'easy' TO 'Easy'"
    )
    op.execute(
        "ALTER TYPE problem_difficulty RENAME VALUE 'medium' TO 'Medium'"
    )
    op.execute(
        "ALTER TYPE problem_difficulty RENAME VALUE 'hard' TO 'Hard'"
    )
