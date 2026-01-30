from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime
import uuid

class Deck(SQLModel, table=True):
    __tablename__ = "decks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, index=True)
    leader_card_id: Optional[uuid.UUID] = Field(default=None, foreign_key="cards.id", nullable=True, index=True)
    custom_card_id: Optional[uuid.UUID] = Field(default=None, foreign_key="custom_cards.id", nullable=True, index=True)
    name: str = Field(nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationships
    leader_card: Optional["Card"] = Relationship(back_populates="decks")
    custom_card: Optional["CustomCard"] = Relationship(back_populates="decks")
