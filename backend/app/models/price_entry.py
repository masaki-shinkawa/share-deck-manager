from sqlmodel import SQLModel, Field, Relationship, UniqueConstraint
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from uuid import UUID, uuid4

if TYPE_CHECKING:
    from app.models.purchase_item import PurchaseItem
    from app.models.store import Store


def get_utc_now() -> datetime:
    """Get current UTC datetime (timezone-naive for DB compatibility)."""
    return datetime.utcnow()


class PriceEntry(SQLModel, table=True):
    """
    価格エントリテーブル
    各購入アイテムのショップ別価格を管理
    price=NULLは在庫なしを表す
    """
    __tablename__ = "price_entries"
    __table_args__ = (
        UniqueConstraint("item_id", "store_id", name="unique_item_store_price"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    item_id: UUID = Field(foreign_key="purchase_items.id", nullable=False, index=True, ondelete="CASCADE")
    store_id: UUID = Field(foreign_key="stores.id", nullable=False, index=True, ondelete="CASCADE")
    price: Optional[int] = Field(default=None, nullable=True, ge=1, le=9999)  # 1-9999円、NULLは在庫なし
    updated_at: datetime = Field(default_factory=get_utc_now, nullable=False)

    # Relationships
    # purchase_item: Optional["PurchaseItem"] = Relationship(back_populates="price_entries")
    # store: Optional["Store"] = Relationship(back_populates="price_entries")
