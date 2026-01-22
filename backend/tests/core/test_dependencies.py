"""
Tests for FastAPI dependencies, specifically get_current_user().

Test Coverage:
- Valid JWT payload
- Missing 'sub' field
- Non-existent user (404)
- Invalid token (401)
"""
import pytest
from fastapi import HTTPException
from datetime import datetime
from uuid import uuid4

from app.core.dependencies import get_current_user
from app.models.user import User


@pytest.mark.unit
@pytest.mark.asyncio
class TestGetCurrentUserDependency:
    """Test suite for get_current_user dependency."""

    async def test_get_current_user_valid_payload(
        self, test_session, test_user: User, mock_jwt_payload
    ):
        """
        Test get_current_user with valid JWT payload.

        Arrange:
            Create test user with google_id = "test-user-123"
            Create mock JWT payload with matching sub
        Act:
            Call get_current_user with valid payload and session
        Assert:
            Returns the correct user object
        """
        # Act
        user = await get_current_user(
            payload=mock_jwt_payload,
            session=test_session
        )

        # Assert
        assert user is not None
        assert user.id == test_user.id
        assert user.google_id == "test-user-123"
        assert user.email == "testuser@example.com"
        assert user.nickname == "Test User"

    async def test_get_current_user_missing_sub_field(self, test_session):
        """
        Test get_current_user with missing 'sub' field in payload.

        Arrange:
            Create payload without 'sub' field
        Act:
            Call get_current_user with invalid payload
        Assert:
            Raises HTTPException with 401 status
        """
        # Arrange
        invalid_payload = {
            "iss": "https://accounts.google.com",
            "aud": "test-client-id",
            # Missing 'sub' field
            "iat": 1234567890,
        }

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(
                payload=invalid_payload,
                session=test_session
            )

        assert exc_info.value.status_code == 401
        assert "missing subject" in exc_info.value.detail.lower()

    async def test_get_current_user_non_existent_user(self, test_session):
        """
        Test get_current_user with non-existent user.

        Arrange:
            Create payload with google_id that doesn't exist in DB
        Act:
            Call get_current_user with non-existent user payload
        Assert:
            Raises HTTPException with 404 status
        """
        # Arrange
        payload_nonexistent = {
            "sub": "non-existent-user-id",
            "email": "nonexistent@example.com",
            "iat": 1234567890,
        }

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(
                payload=payload_nonexistent,
                session=test_session
            )

        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()

    async def test_get_current_user_with_multiple_users(
        self, test_session, test_user: User, test_user_no_nickname: User
    ):
        """
        Test get_current_user finds correct user among multiple.

        Arrange:
            Create two test users in database
        Act:
            Get current user with first user's google_id
        Assert:
            Returns first user, not the second
        """
        # Act
        user = await get_current_user(
            payload={"sub": test_user.google_id},
            session=test_session
        )

        # Assert
        assert user.id == test_user.id
        assert user.google_id == "test-user-123"
        assert user.nickname == "Test User"

    async def test_get_current_user_returns_user_object(
        self, test_session, test_user: User, mock_jwt_payload
    ):
        """
        Test that get_current_user returns User model instance.

        Arrange:
            Create test user and valid payload
        Act:
            Call get_current_user
        Assert:
            Returns User object with all fields
        """
        # Act
        user = await get_current_user(
            payload=mock_jwt_payload,
            session=test_session
        )

        # Assert
        assert isinstance(user, User)
        assert hasattr(user, "id")
        assert hasattr(user, "google_id")
        assert hasattr(user, "email")
        assert hasattr(user, "nickname")
        assert hasattr(user, "image")
        assert hasattr(user, "is_active")
        assert hasattr(user, "created_at")
        assert hasattr(user, "updated_at")

    async def test_get_current_user_preserves_user_attributes(
        self, test_session, test_user: User, mock_jwt_payload
    ):
        """
        Test that all user attributes are correctly preserved.

        Arrange:
            Create test user with all fields populated
        Act:
            Get current user
        Assert:
            All attributes match original values
        """
        # Act
        user = await get_current_user(
            payload=mock_jwt_payload,
            session=test_session
        )

        # Assert
        assert user.id == test_user.id
        assert user.google_id == test_user.google_id
        assert user.email == test_user.email
        assert user.nickname == test_user.nickname
        assert user.image == test_user.image
        assert user.is_active == test_user.is_active
        assert user.created_at is not None
        assert user.updated_at is not None

    async def test_get_current_user_inactive_user(self, test_session):
        """
        Test get_current_user with inactive user.

        Arrange:
            Create an inactive user (is_active=False)
        Act:
            Call get_current_user with inactive user's google_id
        Assert:
            Still returns the user (doesn't check is_active)
            Note: Activation check may be done at endpoint level
        """
        # Arrange
        inactive_user = User(
            id=uuid4(),
            google_id="inactive-user",
            email="inactive@example.com",
            is_active=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_session.add(inactive_user)
        await test_session.commit()

        payload = {"sub": "inactive-user"}

        # Act
        user = await get_current_user(
            payload=payload,
            session=test_session
        )

        # Assert
        # get_current_user returns the user regardless of is_active
        assert user.id == inactive_user.id
        assert user.is_active is False

    async def test_get_current_user_empty_sub_string(self, test_session):
        """
        Test get_current_user with empty string 'sub' field.

        Arrange:
            Create payload with empty string sub
        Act:
            Call get_current_user
        Assert:
            Raises HTTPException with 401 status (invalid token)
        """
        # Arrange
        payload_empty_sub = {
            "sub": "",  # Empty string
            "iat": 1234567890,
        }

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(
                payload=payload_empty_sub,
                session=test_session
            )

        assert exc_info.value.status_code == 401

    async def test_get_current_user_case_sensitive_google_id(
        self, test_session, test_user: User
    ):
        """
        Test that google_id lookup is case-sensitive.

        Arrange:
            Create user with google_id "test-user-123"
            Try to get with "TEST-USER-123" (different case)
        Act:
            Call get_current_user with different case
        Assert:
            Should not find the user (unless DB is case-insensitive)
        """
        # Arrange
        payload_different_case = {
            "sub": "TEST-USER-123",  # Different case
        }

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(
                payload=payload_different_case,
                session=test_session
            )

        assert exc_info.value.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
class TestGetCurrentUserIntegration:
    """Integration tests for get_current_user with real session."""

    async def test_get_current_user_database_query(
        self, test_session, test_user: User
    ):
        """
        Test that get_current_user performs correct database query.

        Arrange:
            Create test user
        Act:
            Get current user via dependency
        Assert:
            Database query returns correct user
        """
        # Act
        user = await get_current_user(
            payload={"sub": test_user.google_id},
            session=test_session
        )

        # Assert
        assert user.id == test_user.id

    async def test_get_current_user_doesnt_create_user(self, test_session):
        """
        Test that get_current_user doesn't create user if not found.

        Arrange:
            Query for non-existent user
        Act:
            Call get_current_user with non-existent google_id
        Assert:
            Raises 404, doesn't create new user
        """
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(
                payload={"sub": "new-user-not-in-db"},
                session=test_session
            )

        assert exc_info.value.status_code == 404

    async def test_get_current_user_returns_same_session_user(
        self, test_session, test_user: User
    ):
        """
        Test that get_current_user returns user from same session.

        Note: In SQLAlchemy, modifications within the same session persist
        across queries because the object is cached in the session identity map.

        Arrange:
            Get user via dependency
        Act:
            Call get_current_user twice for same user
        Assert:
            Both queries return the same user ID
        """
        # Act
        user_1 = await get_current_user(
            payload={"sub": test_user.google_id},
            session=test_session
        )

        user_2 = await get_current_user(
            payload={"sub": test_user.google_id},
            session=test_session
        )

        # Assert
        assert user_1.id == user_2.id
        assert user_1.google_id == user_2.google_id
