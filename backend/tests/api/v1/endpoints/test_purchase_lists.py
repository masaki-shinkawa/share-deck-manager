"""
Tests for Purchase Lists API endpoints, including deck_id filtering.
Following TDD methodology: RED -> GREEN -> REFACTOR
"""

import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from sqlmodel import Session

from app.models.user import User
from app.models.deck import Deck
from app.models.purchase_list import PurchaseList, PurchaseStatus


@pytest.fixture
def test_user(session: Session) -> User:
    """Create a test user."""
    user = User(
        id=uuid4(),
        email="test@example.com",
        name="Test User",
        is_admin=False
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def test_deck(session: Session, test_user: User) -> Deck:
    """Create a test deck."""
    deck = Deck(
        id=uuid4(),
        user_id=test_user.id,
        name="Test Deck",
        description="A test deck for purchase list"
    )
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return deck


@pytest.fixture
def another_test_deck(session: Session, test_user: User) -> Deck:
    """Create another test deck."""
    deck = Deck(
        id=uuid4(),
        user_id=test_user.id,
        name="Another Test Deck",
        description="Another test deck"
    )
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return deck


class TestPurchaseListCreation:
    """Test purchase list creation with deck_id."""

    def test_create_purchase_list_with_deck_id(
        self,
        client: TestClient,
        session: Session,
        test_user: User,
        test_deck: Deck
    ):
        """Test creating a purchase list associated with a deck."""
        # RED: This will fail because deck_id is not yet implemented in the API
        response = client.post(
            "/api/v1/purchases",
            json={
                "deck_id": str(test_deck.id),
                "name": "Test Purchase List",
                "status": "planning"
            },
            headers={"user-id": str(test_user.id)}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["deck_id"] == str(test_deck.id)
        assert data["name"] == "Test Purchase List"
        assert data["user_id"] == str(test_user.id)

    def test_create_purchase_list_without_deck_id(
        self,
        client: TestClient,
        session: Session,
        test_user: User
    ):
        """Test creating a purchase list without a deck (global list)."""
        response = client.post(
            "/api/v1/purchases",
            json={
                "name": "Global Purchase List",
                "status": "planning"
            },
            headers={"user-id": str(test_user.id)}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["deck_id"] is None
        assert data["name"] == "Global Purchase List"


class TestPurchaseListFiltering:
    """Test filtering purchase lists by deck_id."""

    @pytest.fixture(autouse=True)
    def setup_purchase_lists(
        self,
        session: Session,
        test_user: User,
        test_deck: Deck,
        another_test_deck: Deck
    ):
        """Create test purchase lists."""
        # Purchase list for test_deck
        list1 = PurchaseList(
            id=uuid4(),
            user_id=test_user.id,
            deck_id=test_deck.id,
            name="Deck 1 Purchase List",
            status=PurchaseStatus.PLANNING.value
        )

        # Purchase list for another_test_deck
        list2 = PurchaseList(
            id=uuid4(),
            user_id=test_user.id,
            deck_id=another_test_deck.id,
            name="Deck 2 Purchase List",
            status=PurchaseStatus.PLANNING.value
        )

        # Global purchase list (no deck_id)
        list3 = PurchaseList(
            id=uuid4(),
            user_id=test_user.id,
            deck_id=None,
            name="Global Purchase List",
            status=PurchaseStatus.PLANNING.value
        )

        session.add_all([list1, list2, list3])
        session.commit()

    def test_get_all_purchase_lists(
        self,
        client: TestClient,
        test_user: User
    ):
        """Test getting all purchase lists for a user."""
        response = client.get(
            "/api/v1/purchases",
            headers={"user-id": str(test_user.id)}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    def test_filter_purchase_lists_by_deck_id(
        self,
        client: TestClient,
        test_user: User,
        test_deck: Deck
    ):
        """Test filtering purchase lists by deck_id."""
        # RED: This will fail because deck_id filtering is not yet implemented
        response = client.get(
            f"/api/v1/purchases?deck_id={test_deck.id}",
            headers={"user-id": str(test_user.id)}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["deck_id"] == str(test_deck.id)
        assert data[0]["name"] == "Deck 1 Purchase List"

    def test_filter_purchase_lists_by_null_deck_id(
        self,
        client: TestClient,
        test_user: User
    ):
        """Test filtering purchase lists with no deck_id (global lists)."""
        response = client.get(
            "/api/v1/purchases?deck_id=null",
            headers={"user-id": str(test_user.id)}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["deck_id"] is None
        assert data[0]["name"] == "Global Purchase List"


class TestPurchaseListUpdate:
    """Test updating purchase list deck_id."""

    def test_update_purchase_list_deck_id(
        self,
        client: TestClient,
        session: Session,
        test_user: User,
        test_deck: Deck,
        another_test_deck: Deck
    ):
        """Test updating a purchase list's deck_id."""
        # Create a purchase list
        purchase_list = PurchaseList(
            id=uuid4(),
            user_id=test_user.id,
            deck_id=test_deck.id,
            name="Original List",
            status=PurchaseStatus.PLANNING.value
        )
        session.add(purchase_list)
        session.commit()

        # Update deck_id
        response = client.patch(
            f"/api/v1/purchases/{purchase_list.id}",
            json={"deck_id": str(another_test_deck.id)},
            headers={"user-id": str(test_user.id)}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["deck_id"] == str(another_test_deck.id)

    def test_remove_deck_id_from_purchase_list(
        self,
        client: TestClient,
        session: Session,
        test_user: User,
        test_deck: Deck
    ):
        """Test removing deck_id from a purchase list (make it global)."""
        # Create a purchase list with deck_id
        purchase_list = PurchaseList(
            id=uuid4(),
            user_id=test_user.id,
            deck_id=test_deck.id,
            name="Deck List",
            status=PurchaseStatus.PLANNING.value
        )
        session.add(purchase_list)
        session.commit()

        # Remove deck_id
        response = client.patch(
            f"/api/v1/purchases/{purchase_list.id}",
            json={"deck_id": None},
            headers={"user-id": str(test_user.id)}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["deck_id"] is None


class TestDeckDeletion:
    """Test that purchase lists are preserved when deck is deleted."""

    def test_purchase_list_preserved_on_deck_deletion(
        self,
        client: TestClient,
        session: Session,
        test_user: User,
        test_deck: Deck
    ):
        """Test that deck_id becomes NULL when deck is deleted (ON DELETE SET NULL)."""
        # Create a purchase list
        purchase_list = PurchaseList(
            id=uuid4(),
            user_id=test_user.id,
            deck_id=test_deck.id,
            name="Test List",
            status=PurchaseStatus.PLANNING.value
        )
        session.add(purchase_list)
        session.commit()
        list_id = purchase_list.id

        # Delete the deck
        session.delete(test_deck)
        session.commit()

        # Verify purchase list still exists but deck_id is NULL
        updated_list = session.get(PurchaseList, list_id)
        assert updated_list is not None
        assert updated_list.deck_id is None
        assert updated_list.name == "Test List"
