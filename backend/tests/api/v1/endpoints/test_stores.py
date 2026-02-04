"""
Tests for stores API endpoints
Testing issue #19: Auto-create price entries when adding new store
"""

import pytest
from uuid import uuid4, UUID
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.user import User
from app.models.store import Store
from app.models.purchase_list import PurchaseList
from app.models.purchase_item import PurchaseItem
from app.models.custom_card import CustomCard
from app.models.price_entry import PriceEntry


@pytest.mark.asyncio
async def test_create_store_auto_creates_price_entries_for_existing_items(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    auth_headers: dict
):
    """
    Test that creating a new store automatically creates NULL price entries
    for all existing purchase items owned by the user.

    This test verifies issue #19 fix:
    - When a new store is created, price entries should be auto-created
    - Price entries should be created for ALL existing purchase items
    - Initial price should be NULL (out of stock)
    - User can then manually update prices
    """
    # Arrange: Create test data BEFORE creating the store
    # 1. Create custom cards
    card1 = CustomCard(
        id=uuid4(),
        user_id=test_user.id,
        name="Card 1",
        color1="Red"
    )
    card2 = CustomCard(
        id=uuid4(),
        user_id=test_user.id,
        name="Card 2",
        color1="Blue"
    )
    session.add_all([card1, card2])

    # 2. Create purchase list
    purchase_list = PurchaseList(
        id=uuid4(),
        user_id=test_user.id,
        name="Test List",
        status="planning"
    )
    session.add(purchase_list)

    # 3. Create purchase items (2 items)
    item1 = PurchaseItem(
        id=uuid4(),
        list_id=purchase_list.id,
        custom_card_id=card1.id,
        quantity=2
    )
    item2 = PurchaseItem(
        id=uuid4(),
        list_id=purchase_list.id,
        custom_card_id=card2.id,
        quantity=3
    )
    session.add_all([item1, item2])
    await session.commit()

    # Verify no price entries exist before creating store
    result = await session.execute(select(PriceEntry))
    price_entries_before = result.scalars().all()
    assert len(price_entries_before) == 0

    # Act: Create a new store
    store_data = {
        "name": "New Store",
        "color": "#FF5733"
    }
    response = await client.post(
        "/api/v1/stores",
        json=store_data,
        headers=auth_headers
    )

    # Assert: Store created successfully
    assert response.status_code == 201
    created_store = response.json()
    assert created_store["name"] == "New Store"
    assert created_store["color"] == "#FF5733"

    store_id = UUID(created_store["id"])

    # CRITICAL: Verify price entries were auto-created
    result = await session.execute(
        select(PriceEntry).where(PriceEntry.store_id == store_id)
    )
    price_entries_list = result.scalars().all()

    # Should have created 2 price entries (one for each item)
    assert len(price_entries_list) == 2

    # Verify each price entry
    item_ids = {item1.id, item2.id}
    for price_entry in price_entries_list:
        # Price should be NULL initially (out of stock)
        assert price_entry.price is None
        # Store ID should match
        assert price_entry.store_id == store_id
        # Item ID should be one of the created items
        assert price_entry.item_id in item_ids

    # Verify all items are covered
    found_item_ids = {pe.item_id for pe in price_entries_list}
    assert found_item_ids == item_ids


@pytest.mark.asyncio
async def test_create_store_no_price_entries_when_no_items(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    auth_headers: dict
):
    """
    Test that creating a store with no existing items creates no price entries.
    """
    # Arrange: No purchase items exist

    # Act: Create a new store
    store_data = {
        "name": "Store Without Items",
        "color": "#00FF00"
    }
    response = await client.post(
        "/api/v1/stores",
        json=store_data,
        headers=auth_headers
    )

    # Assert
    assert response.status_code == 201
    created_store = response.json()
    store_id = UUID(created_store["id"])

    # No price entries should be created
    result = await session.execute(
        select(PriceEntry).where(PriceEntry.store_id == store_id)
    )
    price_entries_list = result.scalars().all()
    assert len(price_entries_list) == 0


@pytest.mark.asyncio
async def test_create_store_only_creates_entries_for_user_items(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    auth_headers: dict
):
    """
    Test that creating a store only creates price entries for the current user's items,
    not for other users' items.
    """
    # Arrange: Create another user with their own items
    other_user = User(
        id=uuid4(),
        google_id="other-user-456",
        email="otheruser@example.com",
        nickname="Other User",
        is_active=True
    )
    session.add(other_user)

    # Create custom cards for both users
    user_card = CustomCard(
        id=uuid4(),
        user_id=test_user.id,
        name="User Card",
        color1="Red"
    )
    other_card = CustomCard(
        id=uuid4(),
        user_id=other_user.id,
        name="Other User Card",
        color1="Blue"
    )
    session.add_all([user_card, other_card])

    # Create purchase lists
    user_list = PurchaseList(
        id=uuid4(),
        user_id=test_user.id,
        name="User List",
        status="planning"
    )
    other_list = PurchaseList(
        id=uuid4(),
        user_id=other_user.id,
        name="Other List",
        status="planning"
    )
    session.add_all([user_list, other_list])

    # Create purchase items
    user_item = PurchaseItem(
        id=uuid4(),
        list_id=user_list.id,
        custom_card_id=user_card.id,
        quantity=1
    )
    other_item = PurchaseItem(
        id=uuid4(),
        list_id=other_list.id,
        custom_card_id=other_card.id,
        quantity=1
    )
    session.add_all([user_item, other_item])
    await session.commit()

    # Act: Current user creates a new store
    store_data = {
        "name": "User Store",
        "color": "#0000FF"
    }
    response = await client.post(
        "/api/v1/stores",
        json=store_data,
        headers=auth_headers
    )

    # Assert
    assert response.status_code == 201
    created_store = response.json()
    store_id = UUID(created_store["id"])

    # Should only create price entry for current user's item
    result = await session.execute(
        select(PriceEntry).where(PriceEntry.store_id == store_id)
    )
    price_entries_list = result.scalars().all()

    assert len(price_entries_list) == 1
    assert str(price_entries_list[0].item_id) == str(user_item.id)


@pytest.mark.asyncio
async def test_create_item_auto_creates_price_entries_for_existing_stores(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    auth_headers: dict
):
    """
    Test that creating a new purchase item automatically creates NULL price entries
    for all existing stores owned by the user.

    This is the counterpart to test_create_store_auto_creates_price_entries.
    """
    # Arrange: Create stores BEFORE creating the item
    # 1. Create stores (3 stores)
    store1 = Store(
        id=uuid4(),
        user_id=test_user.id,
        name="Store A",
        color="#FF0000"
    )
    store2 = Store(
        id=uuid4(),
        user_id=test_user.id,
        name="Store B",
        color="#00FF00"
    )
    store3 = Store(
        id=uuid4(),
        user_id=test_user.id,
        name="Store C",
        color="#0000FF"
    )
    session.add_all([store1, store2, store3])

    # 2. Create custom card
    custom_card = CustomCard(
        id=uuid4(),
        user_id=test_user.id,
        name="New Card",
        color1="Red"
    )
    session.add(custom_card)

    # 3. Create purchase list
    purchase_list = PurchaseList(
        id=uuid4(),
        user_id=test_user.id,
        name="Test List",
        status="planning"
    )
    session.add(purchase_list)
    await session.commit()

    # Act: Create a new purchase item
    item_data = {
        "custom_card_id": str(custom_card.id),
        "quantity": 2
    }
    response = await client.post(
        f"/api/v1/purchases/{purchase_list.id}/items",
        json=item_data,
        headers=auth_headers
    )

    # Assert: Item created successfully
    assert response.status_code == 201
    created_item = response.json()
    item_id = UUID(created_item["id"])

    # CRITICAL: Verify price entries were auto-created
    result = await session.execute(
        select(PriceEntry).where(PriceEntry.item_id == item_id)
    )
    price_entries_list = result.scalars().all()

    # Should have created 3 price entries (one for each store)
    assert len(price_entries_list) == 3

    # Verify each price entry
    store_ids = {store1.id, store2.id, store3.id}
    for price_entry in price_entries_list:
        # Price should be NULL initially (out of stock)
        assert price_entry.price is None
        # Item ID should match
        assert price_entry.item_id == item_id
        # Store ID should be one of the created stores
        assert price_entry.store_id in store_ids

    # Verify all stores are covered
    found_store_ids = {pe.store_id for pe in price_entries_list}
    assert found_store_ids == store_ids


@pytest.mark.asyncio
async def test_create_item_no_price_entries_when_no_stores(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    auth_headers: dict
):
    """
    Test that creating an item with no existing stores creates no price entries.
    """
    # Arrange: Create card and list, but no stores
    custom_card = CustomCard(
        id=uuid4(),
        user_id=test_user.id,
        name="Card Without Stores",
        color1="Green"
    )
    session.add(custom_card)

    purchase_list = PurchaseList(
        id=uuid4(),
        user_id=test_user.id,
        name="Test List",
        status="planning"
    )
    session.add(purchase_list)
    await session.commit()

    # Act: Create a new purchase item
    item_data = {
        "custom_card_id": str(custom_card.id),
        "quantity": 1
    }
    response = await client.post(
        f"/api/v1/purchases/{purchase_list.id}/items",
        json=item_data,
        headers=auth_headers
    )

    # Assert
    assert response.status_code == 201
    created_item = response.json()
    item_id = UUID(created_item["id"])

    # No price entries should be created
    result = await session.execute(
        select(PriceEntry).where(PriceEntry.item_id == item_id)
    )
    price_entries_list = result.scalars().all()
    assert len(price_entries_list) == 0
