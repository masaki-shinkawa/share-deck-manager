"""
Admin endpoint for checking and migrating image URLs to R2.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import Dict, List
import os
from datetime import datetime

from app.core.dependencies import get_current_user, require_admin
from app.db.session import get_session
from app.models.user import User
from app.models.card import Card


router = APIRouter()


@router.get("/check-image-urls")
async def check_image_urls(
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
) -> Dict:
    """
    Check current image URL formats in the database.

    Returns summary of URL types and migration status.
    Admin only.
    """
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
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
) -> Dict:
    """
    Migrate all card image URLs to R2 format.

    Updates image_path for all cards to use R2 public URL.
    Admin only.
    """
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
