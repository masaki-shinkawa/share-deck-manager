from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid

from app.db.session import get_session
from app.core.dependencies import get_current_user
from app.models.deck import Deck
from app.models.user import User
from app.schemas.deck import DeckCreate, DeckUpdate, DeckPublic

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
