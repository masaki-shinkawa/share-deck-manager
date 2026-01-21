from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class CardBase(BaseModel):
    card_id: str
    name: str
    color: str
    block_icon: int
    image_path: str

class CardPublic(CardBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
