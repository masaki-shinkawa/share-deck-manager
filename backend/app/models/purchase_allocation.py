from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from uuid import UUID, uuid4

if TYPE_CHECKING:
    from app.models.purchase_item import PurchaseItem
    from app.models.store import Store


def get_utc_now() -> datetime:
    """Get current UTC datetime (timezone-naive for DB compatibility)."""
    return datetime.utcnow()


class PurchaseAllocation(SQLModel, table=True):
    """
    購入割り当てテーブル
    購入アイテムごとに、どのショップから何枚購入するかを管理
    1つのアイテムを複数のショップから分けて購入できる
    """
    __tablename__ = "purchase_allocations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    item_id: UUID = Field(foreign_key="purchase_items.id", nullable=False, index=True, ondelete="CASCADE")
    store_id: UUID = Field(foreign_key="stores.id", nullable=False, index=True, ondelete="CASCADE")
    quantity: int = Field(nullable=False, ge=1, le=10)  # このショップから購入する枚数
    created_at: datetime = Field(default_factory=get_utc_now, nullable=False)

    # Relationships
    # purchase_item: Optional["PurchaseItem"] = Relationship(back_populates="allocations")
    # store: Optional["Store"] = Relationship()
