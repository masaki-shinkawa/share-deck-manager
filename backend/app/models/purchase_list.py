from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.purchase_item import PurchaseItem


def get_utc_now() -> datetime:
    """Get current UTC datetime (timezone-naive for DB compatibility)."""
    return datetime.utcnow()


class PurchaseStatus(str, Enum):
    """購入リストのステータス"""
    PLANNING = "planning"    # 検討中
    PURCHASED = "purchased"  # 購入済み


class PurchaseList(SQLModel, table=True):
    """
    購入リストテーブル
    カード購入計画を管理
    """
    __tablename__ = "purchase_lists"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True, ondelete="CASCADE")
    name: Optional[str] = Field(default=None, max_length=100, nullable=True)
    status: str = Field(default=PurchaseStatus.PLANNING.value, nullable=False)
    created_at: datetime = Field(default_factory=get_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_utc_now, nullable=False)

    # Relationships
    # user: Optional["User"] = Relationship(back_populates="purchase_lists")
    # items: list["PurchaseItem"] = Relationship(back_populates="purchase_list", cascade_delete=True)
