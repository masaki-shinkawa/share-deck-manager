from typing import Optional
from sqlmodel import SQLModel, Field
from pydantic import field_validator

class UserPublic(SQLModel):
    nickname: Optional[str] = Field(
        None,
        max_length=50,
        description="User nickname (max 50 characters)"
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
