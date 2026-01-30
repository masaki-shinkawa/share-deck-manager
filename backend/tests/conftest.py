"""
Pytest configuration and shared fixtures for the test suite.

This module provides:
- Test database configuration (SQLite in-memory)
- Mock authentication fixtures
- AsyncSession fixtures
- Mocked external service fixtures (Google OAuth)
"""
import pytest
import pytest_asyncio
from datetime import datetime
from typing import AsyncGenerator
from uuid import UUID, uuid4
from unittest.mock import MagicMock, AsyncMock, patch
import os

# Set test environment variables BEFORE importing app modules
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("NEXTAUTH_SECRET", "test-secret-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.models.user import User
from app.models.deck import Deck
from app.models.card import Card
from app.models.custom_card import CustomCard


# ============================================================================
# Database Fixtures
# ============================================================================

@pytest_asyncio.fixture
async def test_engine():
    """Create an in-memory SQLite test database engine."""
    # Use SQLite in-memory database for testing
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        echo=False,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    yield engine

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session = sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session


@pytest.fixture
def mock_get_session(test_session):
    """Mock dependency for database session."""
    async def _get_session():
        return test_session
    return _get_session


# ============================================================================
# Authentication Fixtures
# ============================================================================

@pytest.fixture
def mock_google_keys():
    """Mock Google's public key response."""
    return {
        "keys": [
            {
                "kty": "RSA",
                "kid": "test-key-id-1",
                "use": "sig",
                "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
                "e": "AQAB",
            },
            {
                "kty": "RSA",
                "kid": "test-key-id-2",
                "use": "sig",
                "n": "xjlCRBqkQCh8tFZUe_aMFyI_7UKX8M7wCjF4n8f3b3hZV3TnZy9FkOD8OkWvJ8n9OKqW6VzRqZz3LxXhZVf1qY2zL5Z3YxTnVzYx1bZqW0x3nZzRvZ0xZyPz0xnZzSzVzRwZ1cZsX0yZqRwY2dZsTyZ1bZtZ0ZSrT1aRrV0aZuY0ZZuV0aZsW1bRsW1cQuU1aRpW0aZoX1ZZpZ0ZZpV1aZsX1aZsX1aZuY0ZZuV0aZsX1aZuY0ZZuV0aZsX1aZuY0",
                "e": "AQAB",
            }
        ]
    }


@pytest.fixture
def mock_jwt_payload():
    """Mock JWT payload from Google."""
    return {
        "iss": "https://accounts.google.com",
        "aud": "test-client-id",
        "sub": "test-user-123",
        "email": "testuser@example.com",
        "email_verified": True,
        "iat": int(datetime.utcnow().timestamp()),
        "exp": int(datetime.utcnow().timestamp()) + 3600,
    }


@pytest.fixture
def mock_credentials():
    """Mock HTTPAuthorizationCredentials."""
    credentials = MagicMock()
    credentials.credentials = "mock.jwt.token"
    credentials.scheme = "Bearer"
    return credentials


# ============================================================================
# User Fixtures
# ============================================================================

@pytest_asyncio.fixture
async def test_user(test_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        id=uuid4(),
        google_id="test-user-123",
        email="testuser@example.com",
        nickname="Test User",
        image="https://example.com/avatar.jpg",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_no_nickname(test_session: AsyncSession) -> User:
    """Create a test user without nickname."""
    user = User(
        id=uuid4(),
        google_id="test-user-no-nickname",
        email="nonicknameuser@example.com",
        nickname=None,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


# ============================================================================
# Card Fixtures
# ============================================================================

@pytest_asyncio.fixture
async def test_card(test_session: AsyncSession) -> Card:
    """Create a test card with R2 URL."""
    import os
    r2_public_url = os.getenv("R2_PUBLIC_URL", "https://pub-test.r2.dev")

    card = Card(
        id=uuid4(),
        card_id="test-card-001",
        name="Test Card",
        color="red",
        block_icon=1,
        image_path=f"{r2_public_url}/cards/test-card-001.jpg",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    test_session.add(card)
    await test_session.commit()
    await test_session.refresh(card)
    return card


# ============================================================================
# Deck Fixtures
# ============================================================================

@pytest_asyncio.fixture
async def test_deck(test_session: AsyncSession, test_user: User, test_card: Card) -> Deck:
    """Create a test deck."""
    deck = Deck(
        id=uuid4(),
        user_id=test_user.id,
        leader_card_id=test_card.id,
        name="Test Deck",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    test_session.add(deck)
    await test_session.commit()
    await test_session.refresh(deck)
    return deck


# ============================================================================
# Mocking Fixtures
# ============================================================================

@pytest.fixture
def mock_requests_get(mock_google_keys):
    """Mock requests.get for Google certificate endpoint."""
    mock_response = MagicMock()
    mock_response.json.return_value = mock_google_keys

    with patch("requests.get", return_value=mock_response) as mock_get:
        yield mock_get


@pytest.fixture
def mock_jwt_decode():
    """Mock jwt.decode function."""
    with patch("app.core.security.jwt.decode") as mock_decode:
        yield mock_decode


@pytest.fixture
def mock_jwt_get_unverified_header():
    """Mock jwt.get_unverified_header function."""
    with patch("app.core.security.jwt.get_unverified_header") as mock_header:
        yield mock_header


@pytest.fixture
def mock_verify_token(mock_jwt_payload):
    """Mock verify_token dependency."""
    async def _verify_token():
        return mock_jwt_payload
    return _verify_token


# ============================================================================
# Environment Variable Fixtures
# ============================================================================

@pytest.fixture
def mock_env_vars(monkeypatch):
    """Set mock environment variables."""
    monkeypatch.setenv("NEXTAUTH_SECRET", "test-secret-key")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:3000")
    return monkeypatch
