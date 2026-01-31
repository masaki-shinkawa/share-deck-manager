"""
Tests for purchase items API endpoints
Testing issue #18: price_entries should be loaded with purchase items
"""

import pytest
from uuid import uuid4
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.store import Store
from app.models.purchase_list import PurchaseList
from app.models.purchase_item import PurchaseItem
from app.models.custom_card import CustomCard
from app.models.price_entry import PriceEntry


@pytest.mark.asyncio
async def test_list_purchase_items_includes_price_entries(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    auth_headers: dict
):
    """
    Test that GET /api/v1/purchases/{list_id}/items returns price_entries

    This test verifies issue #18 fix:
    - price_entries should be included in the response
    - Multiple price entries for different stores should be returned
    - price_entries should have correct structure (id, store_id, price, updated_at)
    """
    # Arrange: Create test data
    # 1. Create stores
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
    session.add_all([store1, store2])

    # 2. Create custom card
    custom_card = CustomCard(
        id=uuid4(),
        user_id=test_user.id,
        name="Test Card",
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

    # 4. Create purchase item
    purchase_item = PurchaseItem(
        id=uuid4(),
        list_id=purchase_list.id,
        custom_card_id=custom_card.id,
        quantity=3
    )
    session.add(purchase_item)

    await session.commit()

    # 5. Create price entries
    price_entry1 = PriceEntry(
        id=uuid4(),
        item_id=purchase_item.id,
        store_id=store1.id,
        price=1000
    )
    price_entry2 = PriceEntry(
        id=uuid4(),
        item_id=purchase_item.id,
        store_id=store2.id,
        price=1200
    )
    session.add_all([price_entry1, price_entry2])
    await session.commit()

    # Act: Call the API endpoint
    response = await client.get(
        f"/api/v1/purchases/{purchase_list.id}/items",
        headers=auth_headers
    )

    # Assert: Verify response
    assert response.status_code == 200
    items = response.json()

    assert len(items) == 1
    item = items[0]

    # Check basic item properties
    assert str(item["id"]) == str(purchase_item.id)
    assert item["quantity"] == 3
    assert item["card_name"] == "Test Card"

    # CRITICAL: Check price_entries are included
    assert "price_entries" in item, "price_entries field is missing from response"
    assert isinstance(item["price_entries"], list)
    assert len(item["price_entries"]) == 2

    # Verify price entry structure
    price_entries = item["price_entries"]
    prices = sorted([pe["price"] for pe in price_entries])
    assert prices == [1000, 1200]

    # Verify each price entry has required fields
    for price_entry in price_entries:
        assert "id" in price_entry
        assert "store_id" in price_entry
        assert "price" in price_entry
        assert "updated_at" in price_entry

    # Verify store IDs match
    store_ids = {str(pe["store_id"]) for pe in price_entries}
    expected_store_ids = {str(store1.id), str(store2.id)}
    assert store_ids == expected_store_ids


@pytest.mark.asyncio
async def test_list_purchase_items_with_null_price(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    auth_headers: dict
):
    """
    Test that price_entries with NULL price (out of stock) are included
    """
    # Arrange
    store = Store(
        id=uuid4(),
        user_id=test_user.id,
        name="Store C",
        color="#0000FF"
    )
    session.add(store)

    custom_card = CustomCard(
        id=uuid4(),
        user_id=test_user.id,
        name="Out of Stock Card",
        color1="Blue"
    )
    session.add(custom_card)

    purchase_list = PurchaseList(
        id=uuid4(),
        user_id=test_user.id,
        name="Test List 2",
        status="planning"
    )
    session.add(purchase_list)

    purchase_item = PurchaseItem(
        id=uuid4(),
        list_id=purchase_list.id,
        custom_card_id=custom_card.id,
        quantity=1
    )
    session.add(purchase_item)

    await session.commit()

    # Price is NULL (out of stock)
    price_entry = PriceEntry(
        id=uuid4(),
        item_id=purchase_item.id,
        store_id=store.id,
        price=None  # Out of stock
    )
    session.add(price_entry)
    await session.commit()

    # Act
    response = await client.get(
        f"/api/v1/purchases/{purchase_list.id}/items",
        headers=auth_headers
    )

    # Assert
    assert response.status_code == 200
    items = response.json()

    assert len(items) == 1
    item = items[0]

    assert "price_entries" in item
    assert len(item["price_entries"]) == 1
    assert item["price_entries"][0]["price"] is None


@pytest.mark.asyncio
async def test_list_purchase_items_without_price_entries(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    auth_headers: dict
):
    """
    Test that items without any price entries return empty price_entries array
    """
    # Arrange
    custom_card = CustomCard(
        id=uuid4(),
        user_id=test_user.id,
        name="Card Without Prices",
        color1="Green"
    )
    session.add(custom_card)

    purchase_list = PurchaseList(
        id=uuid4(),
        user_id=test_user.id,
        name="Test List 3",
        status="planning"
    )
    session.add(purchase_list)

    purchase_item = PurchaseItem(
        id=uuid4(),
        list_id=purchase_list.id,
        custom_card_id=custom_card.id,
        quantity=2
    )
    session.add(purchase_item)

    await session.commit()

    # No price entries created

    # Act
    response = await client.get(
        f"/api/v1/purchases/{purchase_list.id}/items",
        headers=auth_headers
    )

    # Assert
    assert response.status_code == 200
    items = response.json()

    assert len(items) == 1
    item = items[0]

    assert "price_entries" in item
    assert isinstance(item["price_entries"], list)
    assert len(item["price_entries"]) == 0
