from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime
import html


class CustomCardCreate(BaseModel):
    name: str
    color: str

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Card name cannot be empty or whitespace-only')
        if len(v) > 100:
            raise ValueError('Card name must be 100 characters or less')
        # XSS対策: HTMLエスケープを実施
        return html.escape(v)

    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Color cannot be empty')
        # XSS対策: HTMLエスケープを実施
        return html.escape(v)


class CustomCardPublic(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    color: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
