from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from uuid import UUID, uuid4
from pydantic import field_validator, model_validator

if TYPE_CHECKING:
    from app.models.purchase_list import PurchaseList
    from app.models.card import Card
    from app.models.custom_card import CustomCard
    from app.models.store import Store
    from app.models.price_entry import PriceEntry


def get_utc_now() -> datetime:
    """Get current UTC datetime (timezone-naive for DB compatibility)."""
    return datetime.utcnow()


class PurchaseItem(SQLModel, table=True):
    """
    購入アイテムテーブル
    購入リストに含まれる個別のカード情報と枚数を管理
    """
    __tablename__ = "purchase_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    list_id: UUID = Field(foreign_key="purchase_lists.id", nullable=False, index=True, ondelete="CASCADE")
    card_id: Optional[UUID] = Field(default=None, foreign_key="cards.id", nullable=True, ondelete="SET NULL")
    custom_card_id: Optional[UUID] = Field(default=None, foreign_key="custom_cards.id", nullable=True, ondelete="SET NULL")
    quantity: int = Field(nullable=False, ge=1, le=10)  # 1-10枚
    selected_store_id: Optional[UUID] = Field(default=None, foreign_key="stores.id", nullable=True, ondelete="SET NULL")
    created_at: datetime = Field(default_factory=get_utc_now, nullable=False)

    # Relationships
    # purchase_list: Optional["PurchaseList"] = Relationship(back_populates="items")
    # card: Optional["Card"] = Relationship()
    # custom_card: Optional["CustomCard"] = Relationship()
    # selected_store: Optional["Store"] = Relationship()
    # price_entries: list["PriceEntry"] = Relationship(back_populates="purchase_item", cascade_delete=True)

    @model_validator(mode='after')
    def check_card_reference(self):
        """
        カード参照の排他性をチェック
        card_idとcustom_card_idのうち、どちらか一方のみが設定されている必要がある
        """
        if self.card_id is None and self.custom_card_id is None:
            raise ValueError("Either card_id or custom_card_id must be provided")
        if self.card_id is not None and self.custom_card_id is not None:
            raise ValueError("Only one of card_id or custom_card_id can be provided")
        return self
