"""
Integration tests for grouped decks API endpoint.

Tests the GET /api/v1/decks/grouped endpoint that returns all decks
grouped by users in the current user's group.
"""

import pytest
from uuid import uuid4
from datetime import datetime, UTC
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

from app.main import app
from app.models.user import User
from app.models.deck import Deck
from app.models.card import Card
from app.models.role import UserRole


client = TestClient(app)


class TestGroupedDecksEndpoint:
    """Test suite for grouped decks API endpoint."""

    def test_get_grouped_decks_returns_empty_response(self):
        """Test that endpoint returns 200 with empty data when no decks exist."""
        from app.core.dependencies import get_current_user
        from app.db.session import get_session

        # Mock authentication
        mock_user = User(
            id=uuid4(),
            google_id="test-google-id",
            email="test@example.com",
            nickname="Test User",
            role=UserRole.MEMBER.value
        )

        async def override_get_current_user():
            return mock_user

        # Mock database session that returns empty results
        async def override_get_session():
            mock_session = MagicMock()
            mock_result = MagicMock()
            mock_result.all.return_value = []
            mock_session.execute = AsyncMock(return_value=mock_result)
            return mock_session

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_session] = override_get_session

        try:
            response = client.get("/api/v1/decks/grouped")
            assert response.status_code == 200

            data = response.json()
            assert "users" in data
            assert "decks" in data
            assert "total_count" in data
            assert data["users"] == []
            assert data["decks"] == []
            assert data["total_count"] == 0
        finally:
            app.dependency_overrides.clear()

    def test_get_grouped_decks_with_data(self):
        """Test that endpoint returns correctly formatted data with decks."""
        from app.core.dependencies import get_current_user
        from app.db.session import get_session

        # Mock authentication
        mock_user = User(
            id=uuid4(),
            google_id="test-google-id",
            email="test@example.com",
            nickname="Test User",
            role=UserRole.MEMBER.value
        )

        # Create mock data
        user1_id = uuid4()
        user2_id = uuid4()
        card1_id = uuid4()
        card2_id = uuid4()
        deck1_id = uuid4()
        deck2_id = uuid4()

        mock_user1 = User(
            id=user1_id,
            google_id="user1-google",
            email="user1@example.com",
            nickname="User One",
            image="https://example.com/user1.jpg",
            role=UserRole.MEMBER.value
        )

        mock_user2 = User(
            id=user2_id,
            google_id="user2-google",
            email="user2@example.com",
            nickname="User Two",
            image=None,
            role=UserRole.MEMBER.value
        )

        mock_card1 = Card(
            id=card1_id,
            card_id="OP01-001",
            name="Monkey D. Luffy",
            color="Red",
            block_icon=1,
            image_path="https://example.com/cards/op01-001.jpg"
        )

        mock_card2 = Card(
            id=card2_id,
            card_id="OP01-060",
            name="Roronoa Zoro",
            color="Green",
            block_icon=1,
            image_path="https://example.com/cards/op01-060.jpg"
        )

        mock_deck1 = Deck(
            id=deck1_id,
            user_id=user1_id,
            leader_card_id=card1_id,
            name="Red Luffy Deck",
            created_at=datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        )

        mock_deck2 = Deck(
            id=deck2_id,
            user_id=user2_id,
            leader_card_id=card2_id,
            name="Green Zoro Deck",
            created_at=datetime(2024, 1, 2, 12, 0, 0, tzinfo=UTC)
        )

        async def override_get_current_user():
            return mock_user

        async def override_get_session():
            mock_session = MagicMock()
            mock_result = MagicMock()
            # Return rows in order: newer deck first
            # Tuple is (Deck, User, Card|None, CustomCard|None)
            mock_result.all.return_value = [
                (mock_deck2, mock_user2, mock_card2, None),
                (mock_deck1, mock_user1, mock_card1, None),
            ]
            mock_session.execute = AsyncMock(return_value=mock_result)
            return mock_session

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_session] = override_get_session

        try:
            response = client.get("/api/v1/decks/grouped")
            assert response.status_code == 200

            data = response.json()

            # Verify structure
            assert "users" in data
            assert "decks" in data
            assert "total_count" in data

            # Verify counts
            assert data["total_count"] == 2
            assert len(data["decks"]) == 2
            assert len(data["users"]) == 2

            # Verify first deck (newer one)
            deck = data["decks"][0]
            assert deck["id"] == str(deck2_id)
            assert deck["name"] == "Green Zoro Deck"
            assert deck["user"]["email"] == "user2@example.com"
            assert deck["user"]["nickname"] == "User Two"
            assert deck["user"]["image"] is None
            assert deck["leader_card"]["card_id"] == "OP01-060"
            assert deck["leader_card"]["name"] == "Roronoa Zoro"
            assert deck["leader_card"]["color"] == "Green"

            # Verify second deck
            deck = data["decks"][1]
            assert deck["id"] == str(deck1_id)
            assert deck["name"] == "Red Luffy Deck"
            assert deck["user"]["email"] == "user1@example.com"

        finally:
            app.dependency_overrides.clear()

    def test_get_grouped_decks_unauthorized_without_auth(self):
        """Test that endpoint requires authentication."""
        from fastapi import HTTPException

        def mock_auth_error():
            raise HTTPException(status_code=401, detail="Unauthorized")

        with patch("app.core.dependencies.get_current_user", side_effect=mock_auth_error):
            response = client.get("/api/v1/decks/grouped")

        assert response.status_code == 401
