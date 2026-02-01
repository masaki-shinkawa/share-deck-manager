"""Purchase allocations API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID
from pydantic import BaseModel

from app.core.database import get_db
from app.models.purchase_allocation import PurchaseAllocation
from app.models.purchase_item import PurchaseItem
from app.models.store import Store
from app.api.deps import get_current_user_id

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

def verify_item_ownership(item_id: UUID, user_id: str, db: Session) -> PurchaseItem:
    """アイテムの所有権を確認"""
    item = db.exec(
        select(PurchaseItem).where(PurchaseItem.id == item_id)
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase item not found"
        )

    # アイテムの所有者を確認（purchase_list経由）
    from app.models.purchase_list import PurchaseList
    purchase_list = db.exec(
        select(PurchaseList).where(PurchaseList.id == item.list_id)
    ).first()

    if not purchase_list or str(purchase_list.user_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return item


# === Endpoints ===

@router.get("/items/{item_id}/allocations", response_model=List[AllocationResponse])
def get_allocations(
    item_id: UUID,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """アイテムの購入割り当て一覧を取得"""
    # 所有権確認
    verify_item_ownership(item_id, current_user_id, db)

    # 割り当て取得
    allocations = db.exec(
        select(PurchaseAllocation)
        .where(PurchaseAllocation.item_id == item_id)
    ).all()

    # レスポンス作成（ストア情報を含める）
    result = []
    for allocation in allocations:
        store = db.exec(
            select(Store).where(Store.id == allocation.store_id)
        ).first()

        result.append(AllocationResponse(
            id=allocation.id,
            item_id=allocation.item_id,
            store_id=allocation.store_id,
            quantity=allocation.quantity,
            store_name=store.name if store else "Unknown",
            store_color=store.color if store else "#808080"
        ))

    return result


@router.post("/items/{item_id}/allocations", response_model=AllocationResponse, status_code=status.HTTP_201_CREATED)
def create_allocation(
    item_id: UUID,
    allocation_data: AllocationCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """購入割り当てを作成"""
    # 所有権確認
    item = verify_item_ownership(item_id, current_user_id, db)

    # ストアが存在するか確認
    store = db.exec(select(Store).where(Store.id == allocation_data.store_id)).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    # ストアが自分のものか確認
    if str(store.user_id) != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store"
        )

    # 既存の割り当てをチェック（同じitem_id + store_idの組み合わせは不可）
    existing = db.exec(
        select(PurchaseAllocation)
        .where(PurchaseAllocation.item_id == item_id)
        .where(PurchaseAllocation.store_id == allocation_data.store_id)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Allocation for this store already exists. Please update instead."
        )

    # 合計枚数チェック
    current_total = db.exec(
        select(PurchaseAllocation)
        .where(PurchaseAllocation.item_id == item_id)
    ).all()

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
    db.add(allocation)
    db.commit()
    db.refresh(allocation)

    return AllocationResponse(
        id=allocation.id,
        item_id=allocation.item_id,
        store_id=allocation.store_id,
        quantity=allocation.quantity,
        store_name=store.name,
        store_color=store.color
    )


@router.patch("/allocations/{allocation_id}", response_model=AllocationResponse)
def update_allocation(
    allocation_id: UUID,
    allocation_data: AllocationUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """購入割り当てを更新"""
    # 割り当て取得
    allocation = db.exec(
        select(PurchaseAllocation).where(PurchaseAllocation.id == allocation_id)
    ).first()

    if not allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Allocation not found"
        )

    # 所有権確認
    item = verify_item_ownership(allocation.item_id, current_user_id, db)

    # 合計枚数チェック
    current_total = db.exec(
        select(PurchaseAllocation)
        .where(PurchaseAllocation.item_id == allocation.item_id)
        .where(PurchaseAllocation.id != allocation_id)
    ).all()

    total_allocated = sum(a.quantity for a in current_total) + allocation_data.quantity
    if total_allocated > item.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total allocated quantity ({total_allocated}) exceeds item quantity ({item.quantity})"
        )

    # 更新
    allocation.quantity = allocation_data.quantity
    db.add(allocation)
    db.commit()
    db.refresh(allocation)

    # ストア情報取得
    store = db.exec(select(Store).where(Store.id == allocation.store_id)).first()

    return AllocationResponse(
        id=allocation.id,
        item_id=allocation.item_id,
        store_id=allocation.store_id,
        quantity=allocation.quantity,
        store_name=store.name if store else "Unknown",
        store_color=store.color if store else "#808080"
    )


@router.delete("/allocations/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_allocation(
    allocation_id: UUID,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """購入割り当てを削除"""
    # 割り当て取得
    allocation = db.exec(
        select(PurchaseAllocation).where(PurchaseAllocation.id == allocation_id)
    ).first()

    if not allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Allocation not found"
        )

    # 所有権確認
    verify_item_ownership(allocation.item_id, current_user_id, db)

    # 削除
    db.delete(allocation)
    db.commit()

    return None
