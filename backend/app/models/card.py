from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid

class Card(SQLModel, table=True):
    __tablename__ = "cards"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    card_id: str = Field(nullable=False, unique=True, index=True)
    name: str = Field(nullable=False)
    color: str = Field(nullable=False)
    block_icon: int = Field(nullable=False)
    image_path: str = Field(nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
