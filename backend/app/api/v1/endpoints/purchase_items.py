from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.db.session import get_session
from app.core.dependencies import get_current_user
from app.models.purchase_item import PurchaseItem
from app.models.purchase_list import PurchaseList
from app.models.card import Card
from app.models.custom_card import CustomCard
from app.models.store import Store
from app.models.user import User
from app.schemas.purchase_item import (
    PurchaseItemCreate,
    PurchaseItemUpdate,
    PurchaseItemPublic,
    PurchaseItemWithCard
)

router = APIRouter()


@router.get("/{list_id}/items", response_model=list[PurchaseItemWithCard])
async def list_purchase_items(
    list_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get all items for a purchase list"""
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

    # Get items with card/custom_card info
    result = await session.execute(
        select(PurchaseItem, Card, CustomCard)
        .where(PurchaseItem.list_id == list_id)
        .outerjoin(Card, PurchaseItem.card_id == Card.id)
        .outerjoin(CustomCard, PurchaseItem.custom_card_id == CustomCard.id)
        .order_by(PurchaseItem.created_at)
    )

    items_with_cards = []
    for item, card, custom_card in result.all():
        card_name = card.name if card else (custom_card.name if custom_card else None)
        card_color = card.color if card else (custom_card.color1 if custom_card else None)
        card_image_path = card.image_path if card else None

        items_with_cards.append(PurchaseItemWithCard(
            id=item.id,
            list_id=item.list_id,
            card_id=item.card_id,
            custom_card_id=item.custom_card_id,
            quantity=item.quantity,
            selected_store_id=item.selected_store_id,
            created_at=item.created_at,
            card_name=card_name,
            card_color=card_color,
            card_image_path=card_image_path
        ))

    return items_with_cards


@router.post("/{list_id}/items", response_model=PurchaseItemPublic, status_code=201)
async def create_purchase_item(
    list_id: UUID,
    item_data: PurchaseItemCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Add an item to a purchase list"""
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

    # Verify card/custom_card exists
    if item_data.card_id:
        result = await session.execute(
            select(Card).where(Card.id == item_data.card_id)
        )
        card = result.scalar_one_or_none()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")

    if item_data.custom_card_id:
        result = await session.execute(
            select(CustomCard).where(
                CustomCard.id == item_data.custom_card_id,
                CustomCard.user_id == user.id
            )
        )
        custom_card = result.scalar_one_or_none()
        if not custom_card:
            raise HTTPException(status_code=404, detail="Custom card not found")

    # Verify selected store belongs to user if provided
    if item_data.selected_store_id:
        result = await session.execute(
            select(Store).where(
                Store.id == item_data.selected_store_id,
                Store.user_id == user.id
            )
        )
        store = result.scalar_one_or_none()
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")

    purchase_item = PurchaseItem(
        list_id=list_id,
        card_id=item_data.card_id,
        custom_card_id=item_data.custom_card_id,
        quantity=item_data.quantity,
        selected_store_id=item_data.selected_store_id
    )

    session.add(purchase_item)
    await session.commit()
    await session.refresh(purchase_item)

    return purchase_item


@router.patch("/{list_id}/items/{item_id}", response_model=PurchaseItemPublic)
async def update_purchase_item(
    list_id: UUID,
    item_id: UUID,
    item_data: PurchaseItemUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update a purchase item"""
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

    # Get item
    result = await session.execute(
        select(PurchaseItem).where(
            PurchaseItem.id == item_id,
            PurchaseItem.list_id == list_id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Purchase item not found")

    # Verify selected store belongs to user if being updated
    if item_data.selected_store_id is not None:
        result = await session.execute(
            select(Store).where(
                Store.id == item_data.selected_store_id,
                Store.user_id == user.id
            )
        )
        store = result.scalar_one_or_none()
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        item.selected_store_id = item_data.selected_store_id

    if item_data.quantity is not None:
        item.quantity = item_data.quantity

    session.add(item)
    await session.commit()
    await session.refresh(item)

    return item


@router.delete("/{list_id}/items/{item_id}", status_code=204)
async def delete_purchase_item(
    list_id: UUID,
    item_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete a purchase item"""
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

    # Get item
    result = await session.execute(
        select(PurchaseItem).where(
            PurchaseItem.id == item_id,
            PurchaseItem.list_id == list_id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Purchase item not found")

    await session.delete(item)
    await session.commit()

    return None
