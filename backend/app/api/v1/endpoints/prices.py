from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from uuid import UUID
from collections import defaultdict

from app.db.session import get_session
from app.core.dependencies import get_current_user
from app.models.price_entry import PriceEntry
from app.models.purchase_item import PurchaseItem
from app.models.purchase_list import PurchaseList
from app.models.store import Store
from app.models.card import Card
from app.models.custom_card import CustomCard
from app.models.user import User
from app.schemas.price_entry import PriceEntryCreate, PriceEntryUpdate, PriceEntryPublic, OptimalPurchasePlan

router = APIRouter()


@router.get("/{item_id}/prices", response_model=list[PriceEntryPublic])
async def list_prices(
    item_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get all prices for an item"""
    # Verify item belongs to user's list
    result = await session.execute(
        select(PurchaseItem, PurchaseList)
        .join(PurchaseList, PurchaseItem.list_id == PurchaseList.id)
        .where(
            PurchaseItem.id == item_id,
            PurchaseList.user_id == user.id
        )
    )
    item_and_list = result.first()
    if not item_and_list:
        raise HTTPException(status_code=404, detail="Purchase item not found")

    # Get prices
    result = await session.execute(
        select(PriceEntry)
        .where(PriceEntry.item_id == item_id)
        .order_by(PriceEntry.updated_at.desc())
    )
    prices = result.scalars().all()
    return prices


@router.put("/{item_id}/prices/{store_id}", response_model=PriceEntryPublic)
async def update_price(
    item_id: UUID,
    store_id: UUID,
    price_data: PriceEntryUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update price for an item at a specific store (creates if not exists)"""
    # Verify item belongs to user's list
    result = await session.execute(
        select(PurchaseItem, PurchaseList)
        .join(PurchaseList, PurchaseItem.list_id == PurchaseList.id)
        .where(
            PurchaseItem.id == item_id,
            PurchaseList.user_id == user.id
        )
    )
    item_and_list = result.first()
    if not item_and_list:
        raise HTTPException(status_code=404, detail="Purchase item not found")

    # Verify store belongs to user
    result = await session.execute(
        select(Store).where(
            Store.id == store_id,
            Store.user_id == user.id
        )
    )
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    # Check if price entry exists
    result = await session.execute(
        select(PriceEntry).where(
            PriceEntry.item_id == item_id,
            PriceEntry.store_id == store_id
        )
    )
    price_entry = result.scalar_one_or_none()

    if price_entry:
        # Update existing entry
        price_entry.price = price_data.price
        price_entry.updated_at = datetime.utcnow()
    else:
        # Create new entry
        price_entry = PriceEntry(
            item_id=item_id,
            store_id=store_id,
            price=price_data.price
        )

    session.add(price_entry)
    await session.commit()
    await session.refresh(price_entry)

    return price_entry


@router.delete("/{item_id}/prices/{store_id}", status_code=204)
async def delete_price(
    item_id: UUID,
    store_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete price entry for an item at a specific store"""
    # Verify item belongs to user's list
    result = await session.execute(
        select(PurchaseItem, PurchaseList)
        .join(PurchaseList, PurchaseItem.list_id == PurchaseList.id)
        .where(
            PurchaseItem.id == item_id,
            PurchaseList.user_id == user.id
        )
    )
    item_and_list = result.first()
    if not item_and_list:
        raise HTTPException(status_code=404, detail="Purchase item not found")

    # Get price entry
    result = await session.execute(
        select(PriceEntry).where(
            PriceEntry.item_id == item_id,
            PriceEntry.store_id == store_id
        )
    )
    price_entry = result.scalar_one_or_none()
    if not price_entry:
        raise HTTPException(status_code=404, detail="Price entry not found")

    await session.delete(price_entry)
    await session.commit()

    return None


@router.get("/{list_id}/optimal-plan", response_model=OptimalPurchasePlan)
async def calculate_optimal_plan(
    list_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Calculate optimal purchase plan using greedy algorithm"""
    # Verify list belongs to user
    result = await session.execute(
        select(PurchaseList).where(
            PurchaseList.id == list_id,
            PurchaseList.user_id == user.id
        )
    )
    purchase_list = result.scalar_one_or_none()
    if not purchase_list:
        raise HTTPException(status_code=404, detail="Purchase list not found")

    # Get all items with their prices and card info
    result = await session.execute(
        select(PurchaseItem, Card, CustomCard)
        .where(PurchaseItem.list_id == list_id)
        .outerjoin(Card, PurchaseItem.card_id == Card.id)
        .outerjoin(CustomCard, PurchaseItem.custom_card_id == CustomCard.id)
    )
    items_data = result.all()

    if not items_data:
        return OptimalPurchasePlan(
            total_price=0,
            items=[],
            store_summary={}
        )

    # Get all stores for the user (in creation order for tie-breaking)
    result = await session.execute(
        select(Store).where(Store.user_id == user.id).order_by(Store.created_at)
    )
    stores = result.scalars().all()
    store_dict = {store.id: store for store in stores}

    # Get all price entries for items in this list
    item_ids = [item.id for item, _, _ in items_data]
    result = await session.execute(
        select(PriceEntry).where(PriceEntry.item_id.in_(item_ids))
    )
    price_entries = result.scalars().all()

    # Organize prices by item_id
    prices_by_item = defaultdict(dict)
    for entry in price_entries:
        if entry.price is not None:  # Exclude out-of-stock (NULL prices)
            prices_by_item[entry.item_id][entry.store_id] = entry.price

    # Greedy algorithm: select cheapest store for each item
    total_price = 0
    items_result = []
    store_totals = defaultdict(int)

    for item, card, custom_card in items_data:
        card_name = card.name if card else (custom_card.name if custom_card else "Unknown")
        item_prices = prices_by_item.get(item.id, {})

        if not item_prices:
            # No prices available (all out of stock)
            items_result.append({
                "item_id": str(item.id),
                "card_name": card_name,
                "quantity": item.quantity,
                "selected_store": None,
                "unit_price": None,
                "subtotal": None,
                "status": "out_of_stock"
            })
            continue

        # Find cheapest store (with tie-breaking by creation order)
        cheapest_store_id = min(
            item_prices.keys(),
            key=lambda sid: (item_prices[sid], stores.index(store_dict[sid]))
        )
        unit_price = item_prices[cheapest_store_id]
        subtotal = unit_price * item.quantity

        store_name = store_dict[cheapest_store_id].name
        total_price += subtotal
        store_totals[store_name] += subtotal

        items_result.append({
            "item_id": str(item.id),
            "card_name": card_name,
            "quantity": item.quantity,
            "selected_store": store_name,
            "selected_store_id": str(cheapest_store_id),
            "unit_price": unit_price,
            "subtotal": subtotal,
            "status": "available"
        })

    return OptimalPurchasePlan(
        total_price=total_price,
        items=items_result,
        store_summary=dict(store_totals)
    )
