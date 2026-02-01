"""drop_deck_id_from_purchase_lists

Revision ID: a9530e745988
Revises: c68bc819d256
Create Date: 2026-02-01 10:05:27.337568

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel



# revision identifiers, used by Alembic.
revision: str = 'a9530e745988'
down_revision: Union[str, Sequence[str], None] = 'c68bc819d256'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: Drop deck_id column from purchase_lists."""
    # Drop the foreign key constraint first
    op.drop_constraint('purchase_lists_deck_id_fkey', 'purchase_lists', type_='foreignkey')

    # Drop the index
    op.drop_index('ix_purchase_lists_deck_id', table_name='purchase_lists')

    # Drop the column
    op.drop_column('purchase_lists', 'deck_id')


def downgrade() -> None:
    """Downgrade schema: Re-add deck_id column to purchase_lists."""
    # Add the column back
    op.add_column('purchase_lists',
        sa.Column('deck_id', sa.UUID(), nullable=True)
    )

    # Recreate the index
    op.create_index('ix_purchase_lists_deck_id', 'purchase_lists', ['deck_id'])

    # Recreate the foreign key constraint
    op.create_foreign_key(
        'purchase_lists_deck_id_fkey',
        'purchase_lists', 'decks',
        ['deck_id'], ['id'],
        ondelete='SET NULL'
    )
