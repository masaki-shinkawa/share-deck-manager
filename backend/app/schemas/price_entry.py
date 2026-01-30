from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class PriceEntryCreate(SQLModel):
    """価格エントリ作成スキーマ"""
    item_id: UUID = Field(description="Purchase item ID")
    store_id: UUID = Field(description="Store ID")
    price: Optional[int] = Field(
        default=None,
        ge=1,
        le=9999,
        description="Price (1-9999 yen, NULL = out of stock)"
    )


class PriceEntryUpdate(SQLModel):
    """価格エントリ更新スキーマ"""
    price: Optional[int] = Field(
        default=None,
        ge=1,
        le=9999,
        description="Price (1-9999 yen, NULL = out of stock)"
    )


class PriceEntryPublic(SQLModel):
    """価格エントリ公開スキーマ"""
    id: UUID
    item_id: UUID
    store_id: UUID
    price: Optional[int]
    updated_at: datetime


class OptimalPurchasePlan(SQLModel):
    """最適購入プラン"""
    total_price: int = Field(description="Total price in yen")
    items: list[dict] = Field(description="List of items with store selections")
    store_summary: dict[str, int] = Field(description="Summary by store {store_name: total_price}")
