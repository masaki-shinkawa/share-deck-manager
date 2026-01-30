from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid
from pydantic import field_validator, model_validator

from app.schemas.card import CardPublic
from app.schemas.custom_card import CustomCardPublic

class DeckCreate(SQLModel):
    name: str = Field(
        min_length=1,
        max_length=100,
        description="Deck name (1-100 characters)"
    )
    leader_card_id: Optional[uuid.UUID] = None
    custom_card_id: Optional[uuid.UUID] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Trim whitespace and reject whitespace-only values"""
        v = v.strip()
        if not v:
            raise ValueError('Deck name cannot be empty or whitespace-only')
        return v

    @model_validator(mode='after')
    def check_card_id_present(self):
        """Exactly one of leader_card_id or custom_card_id must be set."""
        if self.leader_card_id is None and self.custom_card_id is None:
            raise ValueError('Either leader_card_id or custom_card_id must be provided')
        if self.leader_card_id is not None and self.custom_card_id is not None:
            raise ValueError('Only one of leader_card_id or custom_card_id can be provided')
        return self

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
    leader_card_id: Optional[uuid.UUID] = None
    custom_card_id: Optional[uuid.UUID] = None
    leader_card: Optional[CardPublic] = None
    custom_card: Optional[CustomCardPublic] = None
    created_at: datetime
    updated_at: datetime
