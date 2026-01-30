from sqlmodel import SQLModel, Field, Relationship, UniqueConstraint
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from uuid import UUID, uuid4

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.price_entry import PriceEntry


def get_utc_now() -> datetime:
    """Get current UTC datetime (timezone-naive for DB compatibility)."""
    return datetime.utcnow()


class Store(SQLModel, table=True):
    """
    ショップマスタテーブル
    ユーザーごとにカード購入先のショップを管理
    """
    __tablename__ = "stores"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="unique_user_store_name"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True, ondelete="CASCADE")
    name: str = Field(max_length=50, nullable=False)
    color: str = Field(max_length=7, nullable=False)  # Hex color code (e.g., #FF5733)
    created_at: datetime = Field(default_factory=get_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_utc_now, nullable=False)

    # Relationships
    # user: Optional["User"] = Relationship(back_populates="stores")
    # price_entries: list["PriceEntry"] = Relationship(back_populates="store", cascade_delete=True)
