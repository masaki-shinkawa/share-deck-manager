"""
Admin-only API endpoints.

These endpoints require admin role and should only be accessible by administrators.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import Optional

from app.core.security import verify_token
from app.db.session import get_session
from app.models.user import User
from app.models.role import UserRole
from pydantic import BaseModel


router = APIRouter()


class ScrapeResult(BaseModel):
    """Response model for card scraping operation."""
    status: str  # "success" | "error" | "in_progress"
    new_cards: int = 0
    updated_cards: int = 0
    total_cards: int = 0
    errors: list[str] = []
    message: str


async def get_current_admin_user(
    payload: dict = Depends(verify_token),
    session: AsyncSession = Depends(get_session)
) -> User:
    """
    Get current user and verify admin role.

    Raises:
        HTTPException: 401 if user not found, 403 if not admin
    """
    google_id = payload.get("sub")
    if not google_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    statement = select(User).where(User.google_id == google_id)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.is_admin():
        raise HTTPException(
            status_code=403,
            detail="Admin access required. This operation is restricted to administrators only."
        )

    return user


@router.post("/scrape-cards", response_model=ScrapeResult)
async def scrape_cards(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Scrape card master data from One Piece Card Game website.

    This endpoint triggers the card scraping process which:
    - Fetches leader cards from the official website
    - Downloads card images
    - Updates the database with new/updated card information

    **Admin access required.**

    Returns:
        ScrapeResult: Operation status and statistics
    """
    # Import scraping functions
    from app.services.card_scraper import scrape_and_save_cards

    try:
        # Execute scraping synchronously (for now)
        # TODO: Consider using BackgroundTasks for long-running operations
        result = await scrape_and_save_cards(session)

        return ScrapeResult(
            status="success",
            new_cards=result["new_cards"],
            updated_cards=result["updated_cards"],
            total_cards=result["total_cards"],
            message=f"Scraping completed successfully. Added {result['new_cards']} new cards, updated {result['updated_cards']} cards."
        )

    except Exception as e:
        return ScrapeResult(
            status="error",
            errors=[str(e)],
            message=f"Scraping failed: {str(e)}"
        )


@router.get("/stats")
async def get_admin_stats(
    current_user: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get admin dashboard statistics.

    **Admin access required.**
    """
    from app.models.card import Card
    from app.models.deck import Deck

    # Get total counts
    cards_result = await session.execute(select(Card))
    total_cards = len(cards_result.all())

    decks_result = await session.execute(select(Deck))
    total_decks = len(decks_result.all())

    users_result = await session.execute(select(User))
    total_users = len(users_result.all())

    return {
        "total_cards": total_cards,
        "total_decks": total_decks,
        "total_users": total_users,
    }
