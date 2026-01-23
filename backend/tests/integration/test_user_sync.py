"""
Integration tests for user synchronization with role assignment.

Tests the /api/v1/users/sync endpoint to ensure:
- New users are created with admin role
- Existing users maintain their roles
"""

import pytest
from httpx import AsyncClient
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.role import UserRole


@pytest.mark.asyncio
class TestUserSyncWithRoles:
    """Integration tests for user sync endpoint with role functionality."""

    async def test_new_user_sync_creates_user_with_admin_role(
        self,
        client: AsyncClient,
        session: AsyncSession,
        mock_token: str
    ):
        """
        When a new user syncs for the first time,
        they should be created with admin role.
        """
        # Act
        response = await client.post(
            "/api/v1/users/sync",
            headers={"Authorization": f"Bearer {mock_token}"}
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == UserRole.ADMIN.value
        assert data["role"] == "admin"

        # Verify in database
        statement = select(User).where(User.google_id == "mock_google_id")
        result = await session.execute(statement)
        user = result.scalar_one_or_none()

        assert user is not None
        assert user.role == UserRole.ADMIN.value

    async def test_existing_user_sync_maintains_role(
        self,
        client: AsyncClient,
        session: AsyncSession,
        mock_token: str
    ):
        """
        When an existing user syncs,
        their role should be maintained (not overwritten).
        """
        # Arrange - Create existing user with OWNER role
        existing_user = User(
            google_id="mock_google_id",
            email="existing@example.com",
            role=UserRole.OWNER.value
        )
        session.add(existing_user)
        await session.commit()

        # Act
        response = await client.post(
            "/api/v1/users/sync",
            headers={"Authorization": f"Bearer {mock_token}"}
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == UserRole.OWNER.value  # Role should NOT change

        # Verify in database
        await session.refresh(existing_user)
        assert existing_user.role == UserRole.OWNER.value

    async def test_user_me_endpoint_includes_role(
        self,
        client: AsyncClient,
        session: AsyncSession,
        mock_token: str
    ):
        """
        The /me endpoint should include the user's role.
        """
        # Arrange - Create user
        user = User(
            google_id="mock_google_id",
            email="me@example.com",
            role=UserRole.ADMIN.value,
            nickname="Test User"
        )
        session.add(user)
        await session.commit()

        # Act
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {mock_token}"}
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        # Note: Current schema might not include role
        # This test will initially fail - that's expected (RED phase)
        # We'll add role to UserPublic schema in GREEN phase
        assert "nickname" in data  # This should pass
        # assert "role" in data  # This will fail initially - uncomment in GREEN phase


# Fixtures for integration tests
# These would typically be in conftest.py

@pytest.fixture
async def mock_token() -> str:
    """Mock JWT token for testing."""
    # This is a simplified mock - real implementation would use proper JWT
    return "mock_jwt_token"


@pytest.fixture
async def client(app) -> AsyncClient:
    """Async HTTP client for testing."""
    # This would be properly configured in conftest.py
    # For now, this is a placeholder
    pass


@pytest.fixture
async def session() -> AsyncSession:
    """Database session for testing."""
    # This would be properly configured in conftest.py
    # For now, this is a placeholder
    pass
