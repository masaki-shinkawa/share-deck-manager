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


@router.get("/check-image-urls")
async def check_image_urls(
    current_user: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Check current image URL formats in the database.

    Returns summary of URL types and migration status.
    **Admin access required.**
    """
    from app.models.card import Card
    import os

    # Fetch all cards
    result = await session.execute(select(Card))
    cards = result.scalars().all()

    # Categorize URLs
    r2_public_url = os.getenv("R2_PUBLIC_URL", "")

    categories = {
        "r2_urls": 0,
        "external_urls": 0,
        "local_paths": 0,
        "other": 0,
    }

    sample_urls = []

    for card in cards[:5]:  # Sample first 5
        sample_urls.append({
            "card_id": card.card_id,
            "image_path": card.image_path
        })

    for card in cards:
        path = card.image_path

        if r2_public_url and path.startswith(r2_public_url):
            categories["r2_urls"] += 1
        elif "onepiece-cardgame.com" in path or path.startswith("http"):
            categories["external_urls"] += 1
        elif path.startswith("/") or ":\\" in path:
            categories["local_paths"] += 1
        else:
            categories["other"] += 1

    total = len(cards)
    needs_migration = total - categories["r2_urls"]

    return {
        "total_cards": total,
        "categories": categories,
        "sample_urls": sample_urls,
        "r2_public_url": r2_public_url,
        "migration_status": {
            "migrated": categories["r2_urls"],
            "needs_migration": needs_migration,
            "is_complete": needs_migration == 0
        }
    }


@router.post("/migrate-image-urls")
async def migrate_image_urls(
    current_user: User = Depends(get_current_admin_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Migrate all card image URLs to R2 format.

    Updates image_path for all cards to use R2 public URL.
    **Admin access required.**
    """
    from app.models.card import Card
    from datetime import datetime
    import os

    # Get R2 public URL from environment
    r2_public_url = os.getenv("R2_PUBLIC_URL")
    if not r2_public_url:
        raise HTTPException(
            status_code=500,
            detail="R2_PUBLIC_URL environment variable not set"
        )

    # Fetch all cards
    result = await session.execute(select(Card))
    cards = result.scalars().all()

    updated_count = 0
    skipped_count = 0
    updated_cards = []

    for card in cards:
        old_path = card.image_path

        # Check if already using R2 URL
        if old_path.startswith(r2_public_url):
            skipped_count += 1
            continue

        # Generate new R2 URL
        new_path = f"{r2_public_url}/cards/{card.card_id}.jpg"

        # Update card
        card.image_path = new_path
        card.updated_at = datetime.utcnow()
        session.add(card)

        updated_cards.append({
            "card_id": card.card_id,
            "old_path": old_path,
            "new_path": new_path
        })

        updated_count += 1

    # Commit all changes
    if updated_count > 0:
        await session.commit()

    return {
        "status": "success" if updated_count > 0 else "no_changes_needed",
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "total_cards": len(cards),
        "r2_public_url": r2_public_url,
        "updated_cards": updated_cards[:10]  # Return first 10 for verification
    }
