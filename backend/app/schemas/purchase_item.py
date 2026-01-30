from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import model_validator


class PurchaseItemCreate(SQLModel):
    """購入アイテム作成スキーマ"""
    list_id: UUID = Field(description="Purchase list ID")
    card_id: Optional[UUID] = Field(default=None, description="Card ID (from cards table)")
    custom_card_id: Optional[UUID] = Field(default=None, description="Custom card ID")
    quantity: int = Field(ge=1, le=10, description="Quantity (1-10)")
    selected_store_id: Optional[UUID] = Field(default=None, description="Selected store ID")

    @model_validator(mode='after')
    def check_card_reference(self):
        """Exactly one of card_id or custom_card_id must be set."""
        if self.card_id is None and self.custom_card_id is None:
            raise ValueError('Either card_id or custom_card_id must be provided')
        if self.card_id is not None and self.custom_card_id is not None:
            raise ValueError('Only one of card_id or custom_card_id can be provided')
        return self


class PurchaseItemUpdate(SQLModel):
    """購入アイテム更新スキーマ"""
    quantity: Optional[int] = Field(default=None, ge=1, le=10, description="Quantity (1-10)")
    selected_store_id: Optional[UUID] = Field(default=None, description="Selected store ID")


class PurchaseItemPublic(SQLModel):
    """購入アイテム公開スキーマ"""
    id: UUID
    list_id: UUID
    card_id: Optional[UUID]
    custom_card_id: Optional[UUID]
    quantity: int
    selected_store_id: Optional[UUID]
    created_at: datetime


class PurchaseItemWithCard(PurchaseItemPublic):
    """カード情報を含む購入アイテム"""
    card_name: Optional[str] = None
    card_color: Optional[str] = None
    card_image_path: Optional[str] = None
