from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

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
