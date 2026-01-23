from datetime import datetime, UTC
from typing import Optional
from sqlmodel import Field, SQLModel
from uuid import UUID, uuid4
from app.models.role import UserRole

def get_utc_now() -> datetime:
    """Get current UTC datetime (timezone-aware)."""
    return datetime.now(UTC)

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    google_id: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    nickname: Optional[str] = Field(default=None)
    image: Optional[str] = Field(default=None)
    role: Optional[str] = Field(default=UserRole.ADMIN.value, index=True)  # Default to admin for now
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    def has_role(self, required_role: UserRole) -> bool:
        """
        Check if user has the required role.

        Args:
            required_role: The role to check against

        Returns:
            True if user has the required role, False otherwise
        """
        # Handle None role by defaulting to admin
        current_role = self.role or UserRole.ADMIN.value
        return current_role == required_role.value

    def is_admin(self) -> bool:
        """
        Check if user is an admin.

        Returns:
            True if user has admin role, False otherwise
        """
        return self.has_role(UserRole.ADMIN)
