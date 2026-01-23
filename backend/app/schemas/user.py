from typing import Optional
from sqlmodel import SQLModel, Field
from pydantic import field_validator, EmailStr

class UserPublic(SQLModel):
    """Public user schema - returned by API endpoints."""
    email: str = Field(
        ...,
        description="User email address"
    )
    nickname: Optional[str] = Field(
        None,
        max_length=50,
        description="User nickname (max 50 characters)"
    )
    role: Optional[str] = Field(
        None,
        description="User role (admin, owner, member)"
    )
    image: Optional[str] = Field(
        None,
        description="User profile image URL"
    )

class UserUpdate(SQLModel):
    """Schema for updating user profile - only allows nickname changes"""
    nickname: Optional[str] = Field(
        None,
        max_length=50,
        description="User nickname (max 50 characters)"
    )

    @field_validator('nickname')
    @classmethod
    def validate_nickname(cls, v: Optional[str]) -> Optional[str]:
        """Trim whitespace and reject whitespace-only values"""
        if v is None:
            return None
        v = v.strip()
        if not v:  # Empty string after stripping
            return None
        return v
