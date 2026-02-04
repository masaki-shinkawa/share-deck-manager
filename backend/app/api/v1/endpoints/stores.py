from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from uuid import UUID

from app.db.session import get_session
from app.core.dependencies import get_current_user
from app.models.store import Store
from app.models.user import User
from app.models.purchase_item import PurchaseItem
from app.models.purchase_list import PurchaseList
from app.models.price_entry import PriceEntry
from app.schemas.store import StoreCreate, StoreUpdate, StorePublic

router = APIRouter()


@router.get("/", response_model=list[StorePublic])
async def list_stores(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get all stores for the current user"""
    result = await session.execute(
        select(Store).where(Store.user_id == user.id).order_by(Store.created_at)
    )
    stores = result.scalars().all()
    return stores


@router.post("/", response_model=StorePublic, status_code=201)
async def create_store(
    store_data: StoreCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Create a new store"""
    # Check for duplicate store name for this user
    result = await session.execute(
        select(Store).where(
            Store.user_id == user.id,
            Store.name == store_data.name
        )
    )
    existing_store = result.scalar_one_or_none()
    if existing_store:
        raise HTTPException(
            status_code=400,
            detail=f"Store with name '{store_data.name}' already exists"
        )

    store = Store(
        user_id=user.id,
        name=store_data.name,
        color=store_data.color
    )

    session.add(store)
    await session.flush()  # Get the store ID before committing

    # Auto-create price entries for all existing purchase items owned by this user
    # Join PurchaseItem with PurchaseList to filter by user_id
    result = await session.execute(
        select(PurchaseItem)
        .join(PurchaseList)
        .where(PurchaseList.user_id == user.id)
    )
    all_items = result.scalars().all()

    # Create NULL price entries for each item
    for item in all_items:
        price_entry = PriceEntry(
            item_id=item.id,
            store_id=store.id,
            price=None  # Out of stock by default, user will fill in later
        )
        session.add(price_entry)

    await session.commit()
    await session.refresh(store)

    return store


@router.patch("/{store_id}", response_model=StorePublic)
async def update_store(
    store_id: UUID,
    store_data: StoreUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update a store"""
    result = await session.execute(
        select(Store).where(Store.id == store_id, Store.user_id == user.id)
    )
    store = result.scalar_one_or_none()

    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    # Check for duplicate name if name is being updated
    if store_data.name and store_data.name != store.name:
        result = await session.execute(
            select(Store).where(
                Store.user_id == user.id,
                Store.name == store_data.name
            )
        )
        existing_store = result.scalar_one_or_none()
        if existing_store:
            raise HTTPException(
                status_code=400,
                detail=f"Store with name '{store_data.name}' already exists"
            )
        store.name = store_data.name

    if store_data.color:
        store.color = store_data.color

    store.updated_at = datetime.utcnow()

    session.add(store)
    await session.commit()
    await session.refresh(store)

    return store


@router.delete("/{store_id}", status_code=204)
async def delete_store(
    store_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete a store"""
    result = await session.execute(
        select(Store).where(Store.id == store_id, Store.user_id == user.id)
    )
    store = result.scalar_one_or_none()

    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    await session.delete(store)
    await session.commit()

    return None
