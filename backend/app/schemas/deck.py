from sqlmodel import SQLModel
from typing import Optional
from datetime import datetime
import uuid

class DeckCreate(SQLModel):
    name: str

class DeckUpdate(SQLModel):
    name: str

class DeckPublic(SQLModel):
    id: uuid.UUID
    name: str
    created_at: datetime
    updated_at: datetime
