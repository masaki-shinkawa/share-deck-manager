from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_session
from app.core.security import verify_token
from app.models.card import Card
from app.schemas.card import CardPublic

router = APIRouter()

@router.get("/", response_model=List[CardPublic])
async def list_cards(
    payload: dict = Depends(verify_token),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all cards (currently only leaders are scraped).
    """
    result = await session.execute(select(Card))
    cards = result.scalars().all()
    return cards
