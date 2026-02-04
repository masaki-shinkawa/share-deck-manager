"""add_deck_id_to_purchase_lists

Revision ID: c68bc819d256
Revises: 6538fb023ad2
Create Date: 2026-02-01 00:59:24.086000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel



# revision identifiers, used by Alembic.
revision: str = 'c68bc819d256'
down_revision: Union[str, Sequence[str], None] = '6538fb023ad2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add deck_id column to purchase_lists table
    op.add_column(
        'purchase_lists',
        sa.Column('deck_id', sa.UUID(), nullable=True)
    )

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_purchase_lists_deck_id_decks',
        'purchase_lists',
        'decks',
        ['deck_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Add index for performance
    op.create_index(
        'ix_purchase_lists_deck_id',
        'purchase_lists',
        ['deck_id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop index
    op.drop_index('ix_purchase_lists_deck_id', table_name='purchase_lists')

    # Drop foreign key constraint
    op.drop_constraint(
        'fk_purchase_lists_deck_id_decks',
        'purchase_lists',
        type_='foreignkey'
    )

    # Drop column
    op.drop_column('purchase_lists', 'deck_id')
