"""
Unit tests for admin endpoints.

Tests admin-only functionality including:
- Permission checks
- Card scraping endpoint
- Admin statistics endpoint
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException
from app.api.v1.endpoints.admin import get_current_admin_user
from app.models.user import User
from app.models.role import UserRole


class TestAdminPermissionChecks:
    """Test admin permission verification."""

    @pytest.mark.asyncio
    async def test_get_current_admin_user_success(self):
        """Test successful admin user retrieval."""
        # Create mock session
        mock_session = AsyncMock()

        # Create admin user
        admin_user = User(
            id="test-user-id",
            google_id="google-123",
            email="admin@example.com",
            name="Admin User",
            role=UserRole.ADMIN.value
        )

        # Mock the database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = admin_user
        mock_session.execute.return_value = mock_result

        # Mock payload
        payload = {"sub": "google-123"}

        # Call function
        result = await get_current_admin_user(payload, mock_session)

        # Assertions
        assert result.id == admin_user.id
        assert result.email == admin_user.email
        assert result.role == UserRole.ADMIN.value

    @pytest.mark.asyncio
    async def test_get_current_admin_user_no_google_id(self):
        """Test admin check fails when no google_id in token."""
        mock_session = AsyncMock()
        payload = {}  # Missing 'sub'

        with pytest.raises(HTTPException) as exc_info:
            await get_current_admin_user(payload, mock_session)

        assert exc_info.value.status_code == 401
        assert "Invalid token" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_current_admin_user_not_found(self):
        """Test admin check fails when user doesn't exist."""
        mock_session = AsyncMock()

        # Mock empty result (user not found)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        payload = {"sub": "google-123"}

        with pytest.raises(HTTPException) as exc_info:
            await get_current_admin_user(payload, mock_session)

        assert exc_info.value.status_code == 401
        assert "User not found" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_current_admin_user_not_admin(self):
        """Test admin check fails when user is not admin."""
        mock_session = AsyncMock()

        # Create non-admin user
        regular_user = User(
            id="test-user-id",
            google_id="google-123",
            email="user@example.com",
            name="Regular User",
            role=UserRole.MEMBER.value  # Not admin
        )

        # Mock the database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = regular_user
        mock_session.execute.return_value = mock_result

        payload = {"sub": "google-123"}

        with pytest.raises(HTTPException) as exc_info:
            await get_current_admin_user(payload, mock_session)

        assert exc_info.value.status_code == 403
        assert "Admin access required" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_current_admin_user_owner_not_allowed(self):
        """Test that owner role is not sufficient for admin endpoints."""
        mock_session = AsyncMock()

        # Create owner user
        owner_user = User(
            id="test-user-id",
            google_id="google-123",
            email="owner@example.com",
            name="Owner User",
            role=UserRole.OWNER.value  # Owner, not admin
        )

        # Mock the database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = owner_user
        mock_session.execute.return_value = mock_result

        payload = {"sub": "google-123"}

        with pytest.raises(HTTPException) as exc_info:
            await get_current_admin_user(payload, mock_session)

        assert exc_info.value.status_code == 403
        assert "Admin access required" in exc_info.value.detail


class TestCardScrapingEndpoint:
    """Test card scraping endpoint."""

    @pytest.mark.asyncio
    async def test_scrape_cards_success(self):
        """Test successful card scraping."""
        from app.api.v1.endpoints.admin import scrape_cards

        # Mock admin user
        admin_user = User(
            id="admin-id",
            google_id="google-admin",
            email="admin@example.com",
            name="Admin",
            role=UserRole.ADMIN.value
        )

        # Mock session
        mock_session = AsyncMock()

        # Mock background tasks
        mock_background_tasks = MagicMock()

        # Mock scraping result
        mock_scrape_result = {
            "new_cards": 5,
            "updated_cards": 3,
            "total_cards": 10
        }

        with patch("app.api.v1.endpoints.admin.scrape_and_save_cards") as mock_scrape:
            mock_scrape.return_value = mock_scrape_result

            result = await scrape_cards(
                mock_background_tasks,
                admin_user,
                mock_session
            )

            assert result.status == "success"
            assert result.new_cards == 5
            assert result.updated_cards == 3
            assert result.total_cards == 10
            assert "completed successfully" in result.message.lower()

    @pytest.mark.asyncio
    async def test_scrape_cards_failure(self):
        """Test card scraping with error."""
        from app.api.v1.endpoints.admin import scrape_cards

        admin_user = User(
            id="admin-id",
            google_id="google-admin",
            email="admin@example.com",
            name="Admin",
            role=UserRole.ADMIN.value
        )

        mock_session = AsyncMock()
        mock_background_tasks = MagicMock()

        # Mock scraping to raise an exception
        with patch("app.api.v1.endpoints.admin.scrape_and_save_cards") as mock_scrape:
            mock_scrape.side_effect = Exception("Network error")

            result = await scrape_cards(
                mock_background_tasks,
                admin_user,
                mock_session
            )

            assert result.status == "error"
            assert "Network error" in result.message
            assert len(result.errors) > 0


class TestAdminStatsEndpoint:
    """Test admin statistics endpoint."""

    @pytest.mark.asyncio
    async def test_get_admin_stats_success(self):
        """Test successful retrieval of admin statistics."""
        from app.api.v1.endpoints.admin import get_admin_stats

        admin_user = User(
            id="admin-id",
            google_id="google-admin",
            email="admin@example.com",
            name="Admin",
            role=UserRole.ADMIN.value
        )

        mock_session = AsyncMock()

        # Mock database results
        mock_cards_result = MagicMock()
        mock_cards_result.all.return_value = [MagicMock()] * 50  # 50 cards

        mock_decks_result = MagicMock()
        mock_decks_result.all.return_value = [MagicMock()] * 10  # 10 decks

        mock_users_result = MagicMock()
        mock_users_result.all.return_value = [MagicMock()] * 5  # 5 users

        # Setup mock to return different results for each query
        mock_session.execute.side_effect = [
            mock_cards_result,
            mock_decks_result,
            mock_users_result
        ]

        result = await get_admin_stats(admin_user, mock_session)

        assert result["total_cards"] == 50
        assert result["total_decks"] == 10
        assert result["total_users"] == 5

    @pytest.mark.asyncio
    async def test_get_admin_stats_empty_database(self):
        """Test admin stats with empty database."""
        from app.api.v1.endpoints.admin import get_admin_stats

        admin_user = User(
            id="admin-id",
            google_id="google-admin",
            email="admin@example.com",
            name="Admin",
            role=UserRole.ADMIN.value
        )

        mock_session = AsyncMock()

        # Mock empty results
        mock_empty_result = MagicMock()
        mock_empty_result.all.return_value = []

        mock_session.execute.return_value = mock_empty_result

        result = await get_admin_stats(admin_user, mock_session)

        assert result["total_cards"] == 0
        assert result["total_decks"] == 0
        assert result["total_users"] == 0
