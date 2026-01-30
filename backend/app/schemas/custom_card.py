from pydantic import BaseModel, field_validator, model_validator
from uuid import UUID
from datetime import datetime
from typing import Optional


# Standard color order for auto-sorting
COLOR_ORDER = ["赤", "緑", "青", "紫", "黒", "黄"]


class CustomCardCreate(BaseModel):
    name: str
    color1: str
    color2: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Card name cannot be empty or whitespace-only')
        if len(v) > 100:
            raise ValueError('Card name must be 100 characters or less')
        return v

    @field_validator('color1')
    @classmethod
    def validate_color1(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Color cannot be empty')
        return v

    @field_validator('color2')
    @classmethod
    def validate_color2(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None  # Empty string becomes None
        return v

    @model_validator(mode='after')
    def validate_colors(self):
        """Validate and auto-sort colors."""
        # Check for duplicate colors
        if self.color2 is not None and self.color1 == self.color2:
            raise ValueError('Color1 and Color2 cannot be the same')

        # Auto-sort colors to standard order
        if self.color2 is not None:
            try:
                idx1 = COLOR_ORDER.index(self.color1)
                idx2 = COLOR_ORDER.index(self.color2)

                # Swap if out of order
                if idx1 > idx2:
                    self.color1, self.color2 = self.color2, self.color1
            except ValueError:
                # Color not in standard order list, keep as-is
                pass

        return self


class CustomCardPublic(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    color1: str
    color2: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
