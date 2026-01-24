"""
Integration tests for Users API endpoints.

Tests the /api/v1/users/me endpoint to ensure it returns
complete user information including role.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from app.main import app
from app.models.user import User
from app.models.role import UserRole


client = TestClient(app)


class TestUsersMeEndpoint:
    """Test /api/v1/users/me endpoint."""

    def test_users_me_returns_user_with_role(self):
        """GET /api/v1/users/me should return user with role field."""
        # Mock user
        mock_user = User(
            id="test-user-id",
            google_id="google-123",
            email="test@example.com",
            nickname="TestUser",
            image="https://example.com/avatar.jpg",
            role=UserRole.ADMIN.value
        )

        # Mock get_current_user dependency
        with patch("app.api.v1.endpoints.users.get_current_user", return_value=mock_user):
            response = client.get("/api/v1/users/me")

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["nickname"] == "TestUser"
        assert data["role"] == "admin"
        assert data["image"] == "https://example.com/avatar.jpg"

    def test_users_me_returns_user_without_nickname(self):
        """GET /api/v1/users/me should work when nickname is None."""
        mock_user = User(
            id="test-user-id",
            google_id="google-123",
            email="test@example.com",
            nickname=None,
            image=None,
            role=UserRole.MEMBER.value
        )

        with patch("app.api.v1.endpoints.users.get_current_user", return_value=mock_user):
            response = client.get("/api/v1/users/me")

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["nickname"] is None
        assert data["role"] == "member"
        assert data["image"] is None

    def test_users_me_unauthorized_without_token(self):
        """GET /api/v1/users/me should return 401 without valid token."""
        # Mock get_current_user to raise HTTPException
        from fastapi import HTTPException

        def mock_auth_error():
            raise HTTPException(status_code=401, detail="Unauthorized")

        with patch("app.api.v1.endpoints.users.get_current_user", side_effect=mock_auth_error):
            response = client.get("/api/v1/users/me")

        assert response.status_code == 401

    def test_users_me_includes_all_required_fields(self):
        """GET /api/v1/users/me should include email, nickname, role, image."""
        mock_user = User(
            id="test-user-id",
            google_id="google-123",
            email="complete@example.com",
            nickname="CompleteUser",
            image="https://example.com/complete.jpg",
            role=UserRole.OWNER.value
        )

        with patch("app.api.v1.endpoints.users.get_current_user", return_value=mock_user):
            response = client.get("/api/v1/users/me")

        assert response.status_code == 200
        data = response.json()

        # Verify all required fields are present
        required_fields = ["email", "nickname", "role", "image"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

        # Verify values
        assert data["email"] == "complete@example.com"
        assert data["nickname"] == "CompleteUser"
        assert data["role"] == "owner"
        assert data["image"] == "https://example.com/complete.jpg"
