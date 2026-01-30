"""add_deck_status

Revision ID: 0c35b5ff07e1
Revises: 7d8e9f0a1b2c
Create Date: 2026-01-30 14:23:42.603636

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel



# revision identifiers, used by Alembic.
revision: str = '0c35b5ff07e1'
down_revision: Union[str, Sequence[str], None] = '7d8e9f0a1b2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add status column to decks table."""
    # Add status column with default value 'built'
    op.add_column(
        'decks',
        sa.Column(
            'status',
            sa.String(),
            nullable=False,
            server_default='built'
        )
    )
    
    # Add CHECK constraint to ensure only 'built' or 'planning' values
    op.create_check_constraint(
        'deck_status_check',
        'decks',
        "status IN ('built', 'planning')"
    )


def downgrade() -> None:
    """Remove status column from decks table."""
    # Drop CHECK constraint first
    op.drop_constraint('deck_status_check', 'decks', type_='check')
    
    # Drop status column
    op.drop_column('decks', 'status')
