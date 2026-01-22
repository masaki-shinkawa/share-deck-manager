from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid
from pydantic import field_validator

from app.schemas.card import CardPublic

class DeckCreate(SQLModel):
    name: str = Field(
        min_length=1,
        max_length=100,
        description="Deck name (1-100 characters)"
    )
    leader_card_id: uuid.UUID

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Trim whitespace and reject whitespace-only values"""
        v = v.strip()
        if not v:
            raise ValueError('Deck name cannot be empty or whitespace-only')
        return v

class DeckUpdate(SQLModel):
    name: str = Field(
        min_length=1,
        max_length=100,
        description="Deck name (1-100 characters)"
    )

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Trim whitespace and reject whitespace-only values"""
        v = v.strip()
        if not v:
            raise ValueError('Deck name cannot be empty or whitespace-only')
        return v

class DeckPublic(SQLModel):
    id: uuid.UUID
    name: str
    leader_card_id: uuid.UUID
    leader_card: Optional[CardPublic] = None
    created_at: datetime
    updated_at: datetime
