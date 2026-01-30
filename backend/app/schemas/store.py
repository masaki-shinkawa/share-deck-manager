from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import field_validator


class StoreCreate(SQLModel):
    """ショップ作成スキーマ"""
    name: str = Field(
        min_length=1,
        max_length=50,
        description="Store name (1-50 characters)"
    )
    color: str = Field(
        min_length=7,
        max_length=7,
        description="Hex color code (e.g., #FF5733)"
    )

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Trim whitespace and reject whitespace-only values"""
        v = v.strip()
        if not v:
            raise ValueError('Store name cannot be empty or whitespace-only')
        return v

    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        """Validate hex color format"""
        if not v.startswith('#') or len(v) != 7:
            raise ValueError('Color must be in hex format (e.g., #FF5733)')
        try:
            int(v[1:], 16)
        except ValueError:
            raise ValueError('Invalid hex color code')
        return v.upper()


class StoreUpdate(SQLModel):
    """ショップ更新スキーマ"""
    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=50,
        description="Store name (1-50 characters)"
    )
    color: Optional[str] = Field(
        default=None,
        min_length=7,
        max_length=7,
        description="Hex color code (e.g., #FF5733)"
    )

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Trim whitespace and reject whitespace-only values"""
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('Store name cannot be empty or whitespace-only')
        return v

    @field_validator('color')
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        """Validate hex color format"""
        if v is not None:
            if not v.startswith('#') or len(v) != 7:
                raise ValueError('Color must be in hex format (e.g., #FF5733)')
            try:
                int(v[1:], 16)
            except ValueError:
                raise ValueError('Invalid hex color code')
            v = v.upper()
        return v


class StorePublic(SQLModel):
    """ショップ公開スキーマ"""
    id: UUID
    user_id: UUID
    name: str
    color: str
    created_at: datetime
    updated_at: datetime
