"""
Unit tests for User schemas.

Tests the UserPublic schema to ensure it includes all necessary
fields for the dashboard display.
"""

import pytest
from app.schemas.user import UserPublic


class TestUserPublicSchema:
    """Test UserPublic schema for dashboard display."""

    def test_user_public_has_email_field(self):
        """UserPublic schema should include email field."""
        user_data = {
            "email": "test@example.com",
            "nickname": "TestUser",
            "role": "admin",
            "image": "https://example.com/avatar.jpg"
        }

        user = UserPublic(**user_data)

        assert user.email == "test@example.com"

    def test_user_public_has_nickname_field(self):
        """UserPublic schema should include nickname field."""
        user_data = {
            "email": "test@example.com",
            "nickname": "TestUser",
            "role": "admin",
            "image": "https://example.com/avatar.jpg"
        }

        user = UserPublic(**user_data)

        assert user.nickname == "TestUser"

    def test_user_public_has_role_field(self):
        """UserPublic schema should include role field."""
        user_data = {
            "email": "test@example.com",
            "nickname": "TestUser",
            "role": "admin",
            "image": "https://example.com/avatar.jpg"
        }

        user = UserPublic(**user_data)

        assert user.role == "admin"

    def test_user_public_has_image_field(self):
        """UserPublic schema should include image field."""
        user_data = {
            "email": "test@example.com",
            "nickname": "TestUser",
            "role": "admin",
            "image": "https://example.com/avatar.jpg"
        }

        user = UserPublic(**user_data)

        assert user.image == "https://example.com/avatar.jpg"

    def test_user_public_allows_optional_fields(self):
        """UserPublic schema should allow optional nickname and image."""
        user_data = {
            "email": "test@example.com",
            "role": "member"
        }

        user = UserPublic(**user_data)

        assert user.email == "test@example.com"
        assert user.role == "member"
        assert user.nickname is None
        assert user.image is None

    def test_user_public_serialization(self):
        """UserPublic schema should serialize to dict correctly."""
        user_data = {
            "email": "test@example.com",
            "nickname": "TestUser",
            "role": "owner",
            "image": "https://example.com/avatar.jpg"
        }

        user = UserPublic(**user_data)
        user_dict = user.model_dump()

        assert user_dict["email"] == "test@example.com"
        assert user_dict["nickname"] == "TestUser"
        assert user_dict["role"] == "owner"
        assert user_dict["image"] == "https://example.com/avatar.jpg"
