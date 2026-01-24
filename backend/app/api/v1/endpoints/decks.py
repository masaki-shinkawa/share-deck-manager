from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid

from app.db.session import get_session
from app.core.dependencies import get_current_user
from app.models.deck import Deck
from app.models.user import User
from app.models.card import Card
from app.schemas.deck import DeckCreate, DeckUpdate, DeckPublic
from app.schemas.deck_with_user import (
    GroupedDecksResponse,
    DeckWithUser,
    UserSummary,
    LeaderCardSummary
)

from sqlalchemy.orm import selectinload

router = APIRouter()

@router.get("/", response_model=list[DeckPublic])
async def list_decks(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get all decks for the current user"""
    result = await session.execute(
        select(Deck)
        .where(Deck.user_id == user.id)
        .options(selectinload(Deck.leader_card))
    )
    decks = result.scalars().all()
    return decks

@router.post("/", response_model=DeckPublic, status_code=201)
async def create_deck(
    deck_data: DeckCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Create a new deck"""
    deck = Deck(
        user_id=user.id,
        name=deck_data.name,
        leader_card_id=deck_data.leader_card_id
    )

    session.add(deck)
    await session.commit()
    await session.refresh(deck)

    # Reload with relation
    result = await session.execute(
        select(Deck)
        .where(Deck.id == deck.id)
        .options(selectinload(Deck.leader_card))
    )
    return result.scalar_one()

@router.get("/grouped", response_model=GroupedDecksResponse)
async def get_grouped_decks(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all decks grouped by users.

    Returns all decks from all users with user and leader card information,
    organized for display in a user-grouped view.
    """
    # Get all decks with user and leader card information
    result = await session.execute(
        select(Deck, User, Card)
        .join(User, Deck.user_id == User.id)
        .join(Card, Deck.leader_card_id == Card.id)
        .order_by(Deck.created_at.desc())
    )

    rows = result.all()

    # Extract unique users and build deck list
    users_dict = {}
    decks_list = []

    for deck, deck_user, card in rows:
        # Add user to dict if not already present
        if deck_user.id not in users_dict:
            users_dict[deck_user.id] = UserSummary(
                id=deck_user.id,
                nickname=deck_user.nickname,
                email=deck_user.email,
                image=deck_user.image
            )

        # Build deck with user info
        deck_with_user = DeckWithUser(
            id=deck.id,
            name=deck.name,
            user=users_dict[deck_user.id],
            leader_card=LeaderCardSummary(
                id=card.id,
                card_id=card.card_id,
                name=card.name,
                color=card.color,
                image_path=card.image_path
            ),
            created_at=deck.created_at
        )
        decks_list.append(deck_with_user)

    return GroupedDecksResponse(
        users=list(users_dict.values()),
        decks=decks_list,
        total_count=len(decks_list)
    )

@router.get("/{deck_id}", response_model=DeckPublic)
async def get_deck(
    deck_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get a specific deck"""
    result = await session.execute(
        select(Deck)
        .where(Deck.id == deck_id, Deck.user_id == user.id)
        .options(selectinload(Deck.leader_card))
    )
    deck = result.scalar_one_or_none()

    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    return deck

@router.put("/{deck_id}", response_model=DeckPublic)
async def update_deck(
    deck_id: uuid.UUID,
    deck_data: DeckUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update a deck's name"""
    result = await session.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == user.id)
    )
    deck = result.scalar_one_or_none()

    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    deck.name = deck_data.name
    deck.updated_at = datetime.utcnow()

    session.add(deck)
    await session.commit()
    await session.refresh(deck)

    # Reload with leader_card relationship
    result = await session.execute(
        select(Deck)
        .where(Deck.id == deck.id)
        .options(selectinload(Deck.leader_card))
    )
    return result.scalar_one()

@router.delete("/{deck_id}", status_code=204)
async def delete_deck(
    deck_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete a deck"""
    result = await session.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == user.id)
    )
    deck = result.scalar_one_or_none()

    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    await session.delete(deck)
    await session.commit()

    return None
