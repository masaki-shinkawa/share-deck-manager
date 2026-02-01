"""Purchase allocations API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
from pydantic import BaseModel

from app.db.session import get_session
from app.core.dependencies import get_current_user
from app.models.purchase_allocation import PurchaseAllocation
from app.models.purchase_item import PurchaseItem
from app.models.purchase_list import PurchaseList
from app.models.store import Store
from app.models.user import User

router = APIRouter()


# === Schemas ===

class AllocationCreate(BaseModel):
    """購入割り当て作成リクエスト"""
    store_id: UUID
    quantity: int  # 1-10


class AllocationUpdate(BaseModel):
    """購入割り当て更新リクエスト"""
    quantity: int  # 1-10


class AllocationResponse(BaseModel):
    """購入割り当てレスポンス"""
    id: UUID
    item_id: UUID
    store_id: UUID
    quantity: int
    store_name: str
    store_color: str

    class Config:
        from_attributes = True


# === Helper Functions ===

async def verify_item_ownership(item_id: UUID, user: User, session: AsyncSession) -> PurchaseItem:
    """アイテムの所有権を確認"""
    result = await session.execute(
        select(PurchaseItem).where(PurchaseItem.id == item_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase item not found"
        )

    # アイテムの所有者を確認（purchase_list経由）
    result = await session.execute(
        select(PurchaseList).where(PurchaseList.id == item.list_id)
    )
    purchase_list = result.scalar_one_or_none()

    if not purchase_list or purchase_list.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return item


# === Endpoints ===

@router.get("/items/{item_id}/allocations", response_model=List[AllocationResponse])
async def get_allocations(
    item_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """アイテムの購入割り当て一覧を取得"""
    # 所有権確認
    await verify_item_ownership(item_id, user, session)

    # 割り当て取得
    result = await session.execute(
        select(PurchaseAllocation)
        .where(PurchaseAllocation.item_id == item_id)
    )
    allocations = result.scalars().all()

    # レスポンス作成（ストア情報を含める）
    response = []
    for allocation in allocations:
        store_result = await session.execute(
            select(Store).where(Store.id == allocation.store_id)
        )
        store = store_result.scalar_one_or_none()

        response.append(AllocationResponse(
            id=allocation.id,
            item_id=allocation.item_id,
            store_id=allocation.store_id,
            quantity=allocation.quantity,
            store_name=store.name if store else "Unknown",
            store_color=store.color if store else "#808080"
        ))

    return response


@router.post("/items/{item_id}/allocations", response_model=AllocationResponse, status_code=status.HTTP_201_CREATED)
async def create_allocation(
    item_id: UUID,
    allocation_data: AllocationCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """購入割り当てを作成"""
    # 所有権確認
    item = await verify_item_ownership(item_id, user, session)

    # ストアが存在するか確認
    store_result = await session.execute(
        select(Store).where(Store.id == allocation_data.store_id)
    )
    store = store_result.scalar_one_or_none()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    # ストアが自分のものか確認
    if store.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store"
        )

    # 既存の割り当てをチェック（同じitem_id + store_idの組み合わせは不可）
    existing_result = await session.execute(
        select(PurchaseAllocation)
        .where(PurchaseAllocation.item_id == item_id)
        .where(PurchaseAllocation.store_id == allocation_data.store_id)
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Allocation for this store already exists. Please update instead."
        )

    # 合計枚数チェック
    current_result = await session.execute(
        select(PurchaseAllocation)
        .where(PurchaseAllocation.item_id == item_id)
    )
    current_total = current_result.scalars().all()

    total_allocated = sum(a.quantity for a in current_total) + allocation_data.quantity
    if total_allocated > item.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total allocated quantity ({total_allocated}) exceeds item quantity ({item.quantity})"
        )

    # 作成
    allocation = PurchaseAllocation(
        item_id=item_id,
        store_id=allocation_data.store_id,
        quantity=allocation_data.quantity
    )
    session.add(allocation)
    await session.commit()
    await session.refresh(allocation)

    return AllocationResponse(
        id=allocation.id,
        item_id=allocation.item_id,
        store_id=allocation.store_id,
        quantity=allocation.quantity,
        store_name=store.name,
        store_color=store.color
    )


@router.patch("/allocations/{allocation_id}", response_model=AllocationResponse)
async def update_allocation(
    allocation_id: UUID,
    allocation_data: AllocationUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """購入割り当てを更新"""
    # 割り当て取得
    result = await session.execute(
        select(PurchaseAllocation).where(PurchaseAllocation.id == allocation_id)
    )
    allocation = result.scalar_one_or_none()

    if not allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Allocation not found"
        )

    # 所有権確認
    item = await verify_item_ownership(allocation.item_id, user, session)

    # 合計枚数チェック
    current_result = await session.execute(
        select(PurchaseAllocation)
        .where(PurchaseAllocation.item_id == allocation.item_id)
        .where(PurchaseAllocation.id != allocation_id)
    )
    current_total = current_result.scalars().all()

    total_allocated = sum(a.quantity for a in current_total) + allocation_data.quantity
    if total_allocated > item.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total allocated quantity ({total_allocated}) exceeds item quantity ({item.quantity})"
        )

    # 更新
    allocation.quantity = allocation_data.quantity
    session.add(allocation)
    await session.commit()
    await session.refresh(allocation)

    # ストア情報取得
    store_result = await session.execute(
        select(Store).where(Store.id == allocation.store_id)
    )
    store = store_result.scalar_one_or_none()

    return AllocationResponse(
        id=allocation.id,
        item_id=allocation.item_id,
        store_id=allocation.store_id,
        quantity=allocation.quantity,
        store_name=store.name if store else "Unknown",
        store_color=store.color if store else "#808080"
    )


@router.delete("/allocations/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_allocation(
    allocation_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """購入割り当てを削除"""
    # 割り当て取得
    result = await session.execute(
        select(PurchaseAllocation).where(PurchaseAllocation.id == allocation_id)
    )
    allocation = result.scalar_one_or_none()

    if not allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Allocation not found"
        )

    # 所有権確認
    await verify_item_ownership(allocation.item_id, user, session)

    # 削除
    await session.delete(allocation)
    await session.commit()

    return None
