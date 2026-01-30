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
from app.models.custom_card import CustomCard
from app.schemas.deck import DeckCreate, DeckUpdate, DeckPublic
from app.schemas.deck_with_user import (
    GroupedDecksResponse,
    DeckWithUser,
    UserSummary,
    LeaderCardSummary,
    CustomCardSummary,
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
        .options(selectinload(Deck.leader_card), selectinload(Deck.custom_card))
    )
    decks = result.scalars().all()
    return decks

@router.post("/", response_model=DeckPublic, status_code=201)
async def create_deck(
    deck_data: DeckCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Create a new deck with either a leader card or custom card."""
    if deck_data.custom_card_id:
        # Verify custom card exists and belongs to user
        result = await session.execute(
            select(CustomCard).where(
                CustomCard.id == deck_data.custom_card_id,
                CustomCard.user_id == user.id,
            )
        )
        custom_card = result.scalar_one_or_none()
        if not custom_card:
            raise HTTPException(status_code=404, detail="Custom card not found")

    deck = Deck(
        user_id=user.id,
        name=deck_data.name,
        leader_card_id=deck_data.leader_card_id,
        custom_card_id=deck_data.custom_card_id,
    )

    session.add(deck)
    await session.commit()
    await session.refresh(deck)

    # Reload with relations
    result = await session.execute(
        select(Deck)
        .where(Deck.id == deck.id)
        .options(selectinload(Deck.leader_card), selectinload(Deck.custom_card))
    )
    return result.scalar_one()

@router.get("/grouped", response_model=GroupedDecksResponse)
async def get_grouped_decks(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all decks grouped by users, including custom card decks.

    カスタムカードの認可について:
    - カスタムカードはuser_idの外部キー制約によりユーザースコープが保証されている
    - Deck -> CustomCard の結合時、custom_card.user_id == deck.user_id が自動的に保証される
    - そのため、デッキの所有者のカスタムカードのみが読み込まれる
    """
    result = await session.execute(
        select(Deck, User, Card, CustomCard)
        .join(User, Deck.user_id == User.id)
        .outerjoin(Card, Deck.leader_card_id == Card.id)
        .outerjoin(CustomCard, Deck.custom_card_id == CustomCard.id)
        .order_by(Deck.created_at.desc())
    )

    rows = result.all()

    users_dict = {}
    decks_list = []

    for deck, deck_user, card, custom_card in rows:
        if deck_user.id not in users_dict:
            users_dict[deck_user.id] = UserSummary(
                id=deck_user.id,
                nickname=deck_user.nickname,
                email=deck_user.email,
                image=deck_user.image
            )

        leader_card_summary = None
        custom_card_summary = None

        if card:
            leader_card_summary = LeaderCardSummary(
                id=card.id,
                card_id=card.card_id,
                name=card.name,
                color=card.color,
                image_path=card.image_path
            )

        if custom_card:
            custom_card_summary = CustomCardSummary(
                id=custom_card.id,
                name=custom_card.name,
                color=custom_card.color,
            )

        deck_with_user = DeckWithUser(
            id=deck.id,
            name=deck.name,
            user=users_dict[deck_user.id],
            leader_card=leader_card_summary,
            custom_card=custom_card_summary,
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
        .options(selectinload(Deck.leader_card), selectinload(Deck.custom_card))
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

    # Reload with relationships
    result = await session.execute(
        select(Deck)
        .where(Deck.id == deck.id)
        .options(selectinload(Deck.leader_card), selectinload(Deck.custom_card))
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
