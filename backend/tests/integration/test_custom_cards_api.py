"""
Integration tests for custom cards API and deck creation with custom cards.

TDD: RED phase - Write tests before implementation.
"""

import pytest
from uuid import uuid4
from datetime import datetime, UTC
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock

from app.main import app
from app.models.user import User
from app.models.deck import Deck
from app.models.card import Card
from app.models.custom_card import CustomCard
from app.models.role import UserRole


client = TestClient(app)


def _mock_user():
    return User(
        id=uuid4(),
        google_id="test-google-id",
        email="test@example.com",
        nickname="Test User",
        role=UserRole.ADMIN.value,
    )


class TestCustomCardCreation:
    """Test POST /api/v1/custom-cards/"""

    def test_create_custom_card_success(self):
        """Custom card is created with valid name and color."""
        from app.core.dependencies import get_current_user
        from app.db.session import get_session

        mock_user = _mock_user()

        async def override_get_current_user():
            return mock_user

        created_card = None

        async def override_get_session():
            mock_session = MagicMock()

            async def mock_add(obj):
                nonlocal created_card
                created_card = obj

            mock_session.add = mock_add
            mock_session.commit = AsyncMock()

            async def mock_refresh(obj):
                obj.id = uuid4()
                obj.created_at = datetime.utcnow()
                obj.updated_at = datetime.utcnow()

            mock_session.refresh = mock_refresh
            return mock_session

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_session] = override_get_session

        try:
            response = client.post(
                "/api/v1/custom-cards/",
                json={"name": "未発売リーダー", "color": "Red"},
            )
            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "未発売リーダー"
            assert data["color"] == "Red"
            assert data["user_id"] == str(mock_user.id)
            assert "id" in data
        finally:
            app.dependency_overrides.clear()

    def test_create_custom_card_rejects_empty_name(self):
        """Custom card creation fails with empty name."""
        from app.core.dependencies import get_current_user
        from app.db.session import get_session

        mock_user = _mock_user()

        async def override_get_current_user():
            return mock_user

        async def override_get_session():
            return MagicMock()

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_session] = override_get_session

        try:
            response = client.post(
                "/api/v1/custom-cards/",
                json={"name": "", "color": "Red"},
            )
            assert response.status_code == 422
        finally:
            app.dependency_overrides.clear()

    def test_create_custom_card_requires_auth(self):
        """Custom card creation requires authentication."""
        response = client.post(
            "/api/v1/custom-cards/",
            json={"name": "テスト", "color": "Red"},
        )
        # Should get 401 or 403 (auth required)
        assert response.status_code in [401, 403]


class TestDeckCreationWithCustomCard:
    """Test POST /api/v1/decks/ with custom_card_id."""

    def test_create_deck_with_custom_card(self):
        """Deck can be created with custom_card_id instead of leader_card_id."""
        from app.core.dependencies import get_current_user
        from app.db.session import get_session

        mock_user = _mock_user()
        custom_card_id = uuid4()

        async def override_get_current_user():
            return mock_user

        created_deck = None

        async def override_get_session():
            mock_session = MagicMock()

            # Mock the custom card lookup
            mock_custom_card = CustomCard(
                id=custom_card_id,
                user_id=mock_user.id,
                name="未発売リーダー",
                color="Red",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            async def mock_execute(stmt):
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = mock_custom_card
                # For the final reload query
                deck_obj = Deck(
                    id=uuid4(),
                    user_id=mock_user.id,
                    custom_card_id=custom_card_id,
                    name="Red 未発売リーダー",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                deck_obj.custom_card = mock_custom_card
                mock_result.scalar_one.return_value = deck_obj
                return mock_result

            mock_session.execute = mock_execute

            async def mock_add(obj):
                nonlocal created_deck
                created_deck = obj

            mock_session.add = mock_add
            mock_session.commit = AsyncMock()

            async def mock_refresh(obj):
                if not hasattr(obj, 'id') or obj.id is None:
                    obj.id = uuid4()

            mock_session.refresh = mock_refresh
            return mock_session

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_session] = override_get_session

        try:
            response = client.post(
                "/api/v1/decks/",
                json={
                    "name": "Red 未発売リーダー",
                    "custom_card_id": str(custom_card_id),
                },
            )
            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "Red 未発売リーダー"
            assert data["custom_card_id"] == str(custom_card_id)
            assert data.get("leader_card_id") is None
        finally:
            app.dependency_overrides.clear()

    def test_create_deck_rejects_neither_card(self):
        """Deck creation fails when neither leader_card_id nor custom_card_id is provided."""
        from app.core.dependencies import get_current_user
        from app.db.session import get_session

        mock_user = _mock_user()

        async def override_get_current_user():
            return mock_user

        async def override_get_session():
            return MagicMock()

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_session] = override_get_session

        try:
            response = client.post(
                "/api/v1/decks/",
                json={"name": "テストデッキ"},
            )
            assert response.status_code == 422
        finally:
            app.dependency_overrides.clear()


class TestDeckListWithCustomCard:
    """Test GET /api/v1/decks/ includes custom_card info."""

    def test_list_decks_includes_custom_card(self):
        """Deck list returns custom_card data for custom card decks."""
        from app.core.dependencies import get_current_user
        from app.db.session import get_session

        mock_user = _mock_user()
        custom_card_id = uuid4()
        deck_id = uuid4()

        mock_custom_card = CustomCard(
            id=custom_card_id,
            user_id=mock_user.id,
            name="未発売リーダー",
            color="Red",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        mock_deck = MagicMock()
        mock_deck.id = deck_id
        mock_deck.name = "Red 未発売リーダー"
        mock_deck.user_id = mock_user.id
        mock_deck.leader_card_id = None
        mock_deck.custom_card_id = custom_card_id
        mock_deck.leader_card = None
        mock_deck.custom_card = mock_custom_card
        mock_deck.created_at = datetime.utcnow()
        mock_deck.updated_at = datetime.utcnow()

        async def override_get_current_user():
            return mock_user

        async def override_get_session():
            mock_session = MagicMock()
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = [mock_deck]
            mock_session.execute = AsyncMock(return_value=mock_result)
            return mock_session

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_session] = override_get_session

        try:
            response = client.get("/api/v1/decks/")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            deck = data[0]
            assert deck["custom_card_id"] == str(custom_card_id)
            assert deck["leader_card_id"] is None
            assert deck["custom_card"]["name"] == "未発売リーダー"
            assert deck["custom_card"]["color"] == "Red"
        finally:
            app.dependency_overrides.clear()


class TestGroupedDecksWithCustomCard:
    """Test GET /api/v1/decks/grouped includes custom card decks."""

    def test_grouped_decks_includes_custom_card_deck(self):
        """Grouped decks endpoint returns decks with custom cards."""
        from app.core.dependencies import get_current_user
        from app.db.session import get_session

        mock_user = _mock_user()
        custom_card_id = uuid4()
        deck_id = uuid4()

        mock_custom_card = CustomCard(
            id=custom_card_id,
            user_id=mock_user.id,
            name="未発売リーダー",
            color="Red",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        mock_deck = Deck(
            id=deck_id,
            user_id=mock_user.id,
            custom_card_id=custom_card_id,
            name="Red 未発売リーダー",
            created_at=datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC),
        )

        async def override_get_current_user():
            return mock_user

        async def override_get_session():
            mock_session = MagicMock()
            mock_result = MagicMock()
            # Grouped endpoint returns (Deck, User, Card|None, CustomCard|None)
            mock_result.all.return_value = [
                (mock_deck, mock_user, None, mock_custom_card),
            ]
            mock_session.execute = AsyncMock(return_value=mock_result)
            return mock_session

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_session] = override_get_session

        try:
            response = client.get("/api/v1/decks/grouped")
            assert response.status_code == 200
            data = response.json()
            assert data["total_count"] == 1
            deck = data["decks"][0]
            assert deck["name"] == "Red 未発売リーダー"
            assert deck["custom_card"]["name"] == "未発売リーダー"
            assert deck["custom_card"]["color"] == "Red"
            assert deck.get("leader_card") is None
        finally:
            app.dependency_overrides.clear()
