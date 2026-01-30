"""split color into color1 and color2

Revision ID: 7d8e9f0a1b2c
Revises: a1b2c3d4e5f6
Create Date: 2026-01-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '7d8e9f0a1b2c'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Split the 'color' field into 'color1' (required) and 'color2' (optional).

    Migration strategy:
    1. Add color1 column (nullable temporarily)
    2. Add color2 column (nullable)
    3. Copy existing color data to color1
    4. Make color1 not nullable
    5. Drop old color column
    """
    # Step 1: Add color1 column (nullable temporarily to allow data migration)
    op.add_column('custom_cards', sa.Column('color1', sqlmodel.sql.sqltypes.AutoString(), nullable=True))

    # Step 2: Add color2 column (nullable, optional field)
    op.add_column('custom_cards', sa.Column('color2', sqlmodel.sql.sqltypes.AutoString(), nullable=True))

    # Step 3: Migrate existing data (color → color1)
    op.execute("UPDATE custom_cards SET color1 = color WHERE color1 IS NULL")

    # Step 4: Make color1 not nullable
    op.alter_column('custom_cards', 'color1',
                    existing_type=sqlmodel.sql.sqltypes.AutoString(),
                    nullable=False)

    # Step 5: Drop old color column
    op.drop_column('custom_cards', 'color')


def downgrade() -> None:
    """
    Revert back to single 'color' field.

    Downgrade strategy:
    1. Add color column back (nullable)
    2. Copy color1 data to color
    3. Make color not nullable
    4. Drop color1 and color2 columns

    Note: Multi-color information (color2) will be lost during downgrade.
    """
    # Step 1: Add color column back (nullable temporarily)
    op.add_column('custom_cards', sa.Column('color', sqlmodel.sql.sqltypes.AutoString(), nullable=True))

    # Step 2: Migrate data back (color1 → color, losing color2 information)
    op.execute("UPDATE custom_cards SET color = color1 WHERE color IS NULL")

    # Step 3: Make color not nullable
    op.alter_column('custom_cards', 'color',
                    existing_type=sqlmodel.sql.sqltypes.AutoString(),
                    nullable=False)

    # Step 4: Drop color1 and color2 columns
    op.drop_column('custom_cards', 'color2')
    op.drop_column('custom_cards', 'color1')
