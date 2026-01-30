from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid

from app.db.session import get_session
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.custom_card import CustomCard
from app.schemas.custom_card import CustomCardCreate, CustomCardPublic

router = APIRouter()


@router.post("/", response_model=CustomCardPublic, status_code=201)
async def create_custom_card(
    card_data: CustomCardCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a custom card for unreleased leader cards."""
    custom_card = CustomCard(
        user_id=user.id,
        name=card_data.name,
        color=card_data.color,
    )

    session.add(custom_card)
    await session.commit()
    await session.refresh(custom_card)

    return custom_card


@router.delete("/{card_id}", status_code=204)
async def delete_custom_card(
    card_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Delete a custom card.

    Only the owner of the custom card can delete it.
    This endpoint is primarily used for rollback when deck creation fails.
    """
    result = await session.execute(
        select(CustomCard).where(
            CustomCard.id == card_id,
            CustomCard.user_id == user.id,
        )
    )
    custom_card = result.scalar_one_or_none()

    if not custom_card:
        raise HTTPException(status_code=404, detail="Custom card not found")

    await session.delete(custom_card)
    await session.commit()

    return None
