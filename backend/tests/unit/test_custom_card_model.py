"""
Unit tests for CustomCard model and schema.

TDD: RED phase - Write tests before implementation.
"""

import pytest
import pytest_asyncio
from datetime import datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


class TestCustomCardModel:
    """Test CustomCard SQLModel."""

    @pytest.mark.asyncio
    async def test_create_custom_card(self, test_session: AsyncSession, test_user):
        """Custom card can be created with required fields."""
        from app.models.custom_card import CustomCard

        custom_card = CustomCard(
            id=uuid4(),
            user_id=test_user.id,
            name="未発売リーダー",
            color="Red",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_session.add(custom_card)
        await test_session.commit()
        await test_session.refresh(custom_card)

        assert custom_card.id is not None
        assert custom_card.user_id == test_user.id
        assert custom_card.name == "未発売リーダー"
        assert custom_card.color == "Red"

    @pytest.mark.asyncio
    async def test_custom_card_belongs_to_user(self, test_session: AsyncSession, test_user):
        """Custom card has a user_id foreign key."""
        from app.models.custom_card import CustomCard

        custom_card = CustomCard(
            id=uuid4(),
            user_id=test_user.id,
            name="テストカード",
            color="Blue",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_session.add(custom_card)
        await test_session.commit()

        result = await test_session.execute(
            select(CustomCard).where(CustomCard.user_id == test_user.id)
        )
        cards = result.scalars().all()
        assert len(cards) == 1
        assert cards[0].name == "テストカード"

    @pytest.mark.asyncio
    async def test_custom_card_has_timestamps(self, test_session: AsyncSession, test_user):
        """Custom card has created_at and updated_at timestamps."""
        from app.models.custom_card import CustomCard

        now = datetime.utcnow()
        custom_card = CustomCard(
            id=uuid4(),
            user_id=test_user.id,
            name="タイムスタンプテスト",
            color="Green",
            created_at=now,
            updated_at=now,
        )
        test_session.add(custom_card)
        await test_session.commit()
        await test_session.refresh(custom_card)

        assert custom_card.created_at is not None
        assert custom_card.updated_at is not None


class TestCustomCardSchema:
    """Test CustomCard Pydantic schemas."""

    def test_custom_card_create_valid(self):
        """CustomCardCreate accepts valid name and color."""
        from app.schemas.custom_card import CustomCardCreate

        schema = CustomCardCreate(name="テストカード", color="Red")
        assert schema.name == "テストカード"
        assert schema.color == "Red"

    def test_custom_card_create_trims_whitespace(self):
        """CustomCardCreate trims whitespace from name."""
        from app.schemas.custom_card import CustomCardCreate

        schema = CustomCardCreate(name="  テストカード  ", color="Red")
        assert schema.name == "テストカード"

    def test_custom_card_create_rejects_empty_name(self):
        """CustomCardCreate rejects empty name."""
        from app.schemas.custom_card import CustomCardCreate
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CustomCardCreate(name="", color="Red")

    def test_custom_card_create_rejects_whitespace_only_name(self):
        """CustomCardCreate rejects whitespace-only name."""
        from app.schemas.custom_card import CustomCardCreate
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CustomCardCreate(name="   ", color="Red")

    def test_custom_card_create_rejects_empty_color(self):
        """CustomCardCreate rejects empty color."""
        from app.schemas.custom_card import CustomCardCreate
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CustomCardCreate(name="テスト", color="")

    def test_custom_card_create_name_max_length(self):
        """CustomCardCreate rejects names over 100 characters."""
        from app.schemas.custom_card import CustomCardCreate
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CustomCardCreate(name="a" * 101, color="Red")

    def test_custom_card_public_from_model(self):
        """CustomCardPublic can be created from model attributes."""
        from app.schemas.custom_card import CustomCardPublic

        card_id = uuid4()
        user_id = uuid4()
        now = datetime.utcnow()

        public = CustomCardPublic(
            id=card_id,
            user_id=user_id,
            name="テストカード",
            color="Red",
            created_at=now,
            updated_at=now,
        )
        assert public.id == card_id
        assert public.name == "テストカード"
        assert public.color == "Red"
