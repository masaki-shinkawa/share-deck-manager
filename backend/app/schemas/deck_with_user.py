"""
Deck schema with user information for grouped deck list view.
"""

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class UserSummary(BaseModel):
    """User summary for deck list."""
    id: UUID
    nickname: str | None
    email: str
    image: str | None

    class Config:
        from_attributes = True


class LeaderCardSummary(BaseModel):
    """Leader card summary for deck list."""
    id: UUID
    card_id: str
    name: str
    color: str
    image_path: str

    class Config:
        from_attributes = True


class CustomCardSummary(BaseModel):
    """Custom card summary for deck list."""
    id: UUID
    name: str
    color: str

    class Config:
        from_attributes = True


class DeckWithUser(BaseModel):
    """Deck with user and leader card information."""
    id: UUID
    name: str
    user: UserSummary
    leader_card: Optional[LeaderCardSummary] = None
    custom_card: Optional[CustomCardSummary] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GroupedDecksResponse(BaseModel):
    """Response schema for grouped decks by user."""
    users: list[UserSummary]
    decks: list[DeckWithUser]
    total_count: int
