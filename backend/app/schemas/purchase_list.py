from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import field_validator

from app.models.purchase_list import PurchaseStatus


class PurchaseListCreate(SQLModel):
    """購入リスト作成スキーマ"""
    deck_id: Optional[UUID] = Field(
        default=None,
        description="Associated deck ID (optional)"
    )
    name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Purchase list name (optional, max 100 characters)"
    )
    status: PurchaseStatus = Field(
        default=PurchaseStatus.PLANNING,
        description="Purchase status (planning or purchased)"
    )

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Trim whitespace and reject whitespace-only values"""
        if v is not None:
            v = v.strip()
            if not v:
                return None  # Empty string becomes None
        return v


class PurchaseListUpdate(SQLModel):
    """購入リスト更新スキーマ"""
    deck_id: Optional[UUID] = Field(
        default=None,
        description="Associated deck ID"
    )
    name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Purchase list name"
    )
    status: Optional[PurchaseStatus] = Field(
        default=None,
        description="Purchase status"
    )

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Trim whitespace"""
        if v is not None:
            v = v.strip()
            if not v:
                return None
        return v


class PurchaseListPublic(SQLModel):
    """購入リスト公開スキーマ"""
    id: UUID
    user_id: UUID
    deck_id: Optional[UUID]
    name: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
