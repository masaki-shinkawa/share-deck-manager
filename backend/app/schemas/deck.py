from sqlmodel import SQLModel
from typing import Optional
from datetime import datetime
import uuid

from app.schemas.card import CardPublic

class DeckCreate(SQLModel):
    name: str
    leader_card_id: uuid.UUID

class DeckUpdate(SQLModel):
    name: str

class DeckPublic(SQLModel):
    id: uuid.UUID
    name: str
    leader_card_id: uuid.UUID
    leader_card: Optional[CardPublic] = None
    created_at: datetime
    updated_at: datetime
