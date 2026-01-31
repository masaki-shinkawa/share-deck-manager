from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from uuid import UUID

from app.db.session import get_session
from app.core.dependencies import get_current_user
from app.models.purchase_list import PurchaseList
from app.models.user import User
from app.schemas.purchase_list import PurchaseListCreate, PurchaseListUpdate, PurchaseListPublic

router = APIRouter()


@router.get("/", response_model=list[PurchaseListPublic])
async def list_purchase_lists(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get all purchase lists for the current user"""
    result = await session.execute(
        select(PurchaseList)
        .where(PurchaseList.user_id == user.id)
        .order_by(PurchaseList.created_at.desc())
    )
    lists = result.scalars().all()
    return lists


@router.post("/", response_model=PurchaseListPublic, status_code=201)
async def create_purchase_list(
    list_data: PurchaseListCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Create a new purchase list"""
    purchase_list = PurchaseList(
        user_id=user.id,
        name=list_data.name,
        status=list_data.status.value
    )

    session.add(purchase_list)
    await session.commit()
    await session.refresh(purchase_list)

    return purchase_list


@router.get("/{list_id}", response_model=PurchaseListPublic)
async def get_purchase_list(
    list_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get a specific purchase list"""
    result = await session.execute(
        select(PurchaseList).where(
            PurchaseList.id == list_id,
            PurchaseList.user_id == user.id
        )
    )
    purchase_list = result.scalar_one_or_none()

    if not purchase_list:
        raise HTTPException(status_code=404, detail="Purchase list not found")

    return purchase_list


@router.patch("/{list_id}", response_model=PurchaseListPublic)
async def update_purchase_list(
    list_id: UUID,
    list_data: PurchaseListUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update a purchase list"""
    result = await session.execute(
        select(PurchaseList).where(
            PurchaseList.id == list_id,
            PurchaseList.user_id == user.id
        )
    )
    purchase_list = result.scalar_one_or_none()

    if not purchase_list:
        raise HTTPException(status_code=404, detail="Purchase list not found")

    if list_data.name is not None:
        purchase_list.name = list_data.name

    if list_data.status is not None:
        purchase_list.status = list_data.status.value

    purchase_list.updated_at = datetime.utcnow()

    session.add(purchase_list)
    await session.commit()
    await session.refresh(purchase_list)

    return purchase_list


@router.delete("/{list_id}", status_code=204)
async def delete_purchase_list(
    list_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete a purchase list"""
    result = await session.execute(
        select(PurchaseList).where(
            PurchaseList.id == list_id,
            PurchaseList.user_id == user.id
        )
    )
    purchase_list = result.scalar_one_or_none()

    if not purchase_list:
        raise HTTPException(status_code=404, detail="Purchase list not found")

    await session.delete(purchase_list)
    await session.commit()

    return None
