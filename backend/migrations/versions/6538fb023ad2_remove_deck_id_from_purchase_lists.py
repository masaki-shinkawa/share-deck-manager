"""remove deck_id from purchase_lists

Revision ID: 6538fb023ad2
Revises: 9dab9ac600e2
Create Date: 2026-01-31 09:24:20.446357

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel



# revision identifiers, used by Alembic.
revision: str = '6538fb023ad2'
down_revision: Union[str, Sequence[str], None] = '9dab9ac600e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove deck_id from purchase_lists table (if exists)
    try:
        op.drop_index(op.f('ix_purchase_lists_deck_id'), table_name='purchase_lists')
    except Exception:
        pass  # Index doesn't exist, ignore

    try:
        op.drop_constraint('purchase_lists_deck_id_fkey', 'purchase_lists', type_='foreignkey')
    except Exception:
        pass  # Constraint doesn't exist, ignore

    try:
        op.drop_column('purchase_lists', 'deck_id')
    except Exception:
        pass  # Column doesn't exist, ignore


def downgrade() -> None:
    """Downgrade schema."""
    # Re-add deck_id to purchase_lists table
    op.add_column('purchase_lists', sa.Column('deck_id', sa.Uuid(), nullable=True))
    op.create_foreign_key('purchase_lists_deck_id_fkey', 'purchase_lists', 'decks', ['deck_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_purchase_lists_deck_id'), 'purchase_lists', ['deck_id'], unique=False)
