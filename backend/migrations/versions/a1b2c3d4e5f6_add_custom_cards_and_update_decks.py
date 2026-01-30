"""add custom_cards table and update decks

Revision ID: a1b2c3d4e5f6
Revises: ef6a021586c8
Create Date: 2026-01-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'ef6a021586c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create custom_cards table
    op.create_table(
        'custom_cards',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('color', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_custom_cards_user_id'), 'custom_cards', ['user_id'], unique=False)

    # Make leader_card_id nullable on decks
    op.alter_column('decks', 'leader_card_id',
                    existing_type=sa.Uuid(),
                    nullable=True)

    # Add custom_card_id column to decks
    op.add_column('decks', sa.Column('custom_card_id', sa.Uuid(), nullable=True))
    op.create_index(op.f('ix_decks_custom_card_id'), 'decks', ['custom_card_id'], unique=False)
    op.create_foreign_key('fk_decks_custom_card_id', 'decks', 'custom_cards', ['custom_card_id'], ['id'])

    # Add CHECK constraint to ensure exactly one card type is set
    op.create_check_constraint(
        'ck_decks_one_card_type',
        'decks',
        '(leader_card_id IS NOT NULL AND custom_card_id IS NULL) OR '
        '(leader_card_id IS NULL AND custom_card_id IS NOT NULL)'
    )


def downgrade() -> None:
    # Remove CHECK constraint
    op.drop_constraint('ck_decks_one_card_type', 'decks', type_='check')

    # Remove custom_card_id from decks
    op.drop_constraint('fk_decks_custom_card_id', 'decks', type_='foreignkey')
    op.drop_index(op.f('ix_decks_custom_card_id'), table_name='decks')
    op.drop_column('decks', 'custom_card_id')

    # Make leader_card_id not nullable again
    op.alter_column('decks', 'leader_card_id',
                    existing_type=sa.Uuid(),
                    nullable=False)

    # Drop custom_cards table
    op.drop_index(op.f('ix_custom_cards_user_id'), table_name='custom_cards')
    op.drop_table('custom_cards')
