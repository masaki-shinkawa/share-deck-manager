"""add_purchase_allocations_table

Revision ID: bb53c2ca8bf2
Revises: a9530e745988
Create Date: 2026-02-01 23:12:35.669159

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel



# revision identifiers, used by Alembic.
revision: str = 'bb53c2ca8bf2'
down_revision: Union[str, Sequence[str], None] = 'a9530e745988'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: Add purchase_allocations table and migrate data."""
    # 1. Create purchase_allocations table
    op.create_table(
        'purchase_allocations',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('item_id', sa.UUID(), nullable=False),
        sa.Column('store_id', sa.UUID(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['item_id'], ['purchase_items.id'], name='fk_purchase_allocations_item_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], name='fk_purchase_allocations_store_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('item_id', 'store_id', name='uq_purchase_allocations_item_store'),
        sa.CheckConstraint('quantity >= 1 AND quantity <= 10', name='ck_purchase_allocations_quantity')
    )
    op.create_index('ix_purchase_allocations_item_id', 'purchase_allocations', ['item_id'])
    op.create_index('ix_purchase_allocations_store_id', 'purchase_allocations', ['store_id'])

    # 2. Migrate existing selected_store_id data to purchase_allocations
    # Insert allocations for items that have a selected_store_id
    op.execute("""
        INSERT INTO purchase_allocations (item_id, store_id, quantity)
        SELECT id, selected_store_id, quantity
        FROM purchase_items
        WHERE selected_store_id IS NOT NULL
    """)

    # 3. Drop selected_store_id column from purchase_items
    op.drop_column('purchase_items', 'selected_store_id')


def downgrade() -> None:
    """Downgrade schema: Restore selected_store_id and remove purchase_allocations."""
    # 1. Add selected_store_id column back to purchase_items
    op.add_column('purchase_items', sa.Column('selected_store_id', sa.UUID(), nullable=True))

    # 2. Migrate data back from purchase_allocations
    # Only migrate if there's exactly one allocation per item
    op.execute("""
        UPDATE purchase_items pi
        SET selected_store_id = pa.store_id
        FROM purchase_allocations pa
        WHERE pi.id = pa.item_id
        AND pa.quantity = pi.quantity
        AND (
            SELECT COUNT(*) FROM purchase_allocations pa2 WHERE pa2.item_id = pi.id
        ) = 1
    """)

    # 3. Drop purchase_allocations table
    op.drop_index('ix_purchase_allocations_store_id', 'purchase_allocations')
    op.drop_index('ix_purchase_allocations_item_id', 'purchase_allocations')
    op.drop_table('purchase_allocations')
