"""
Migration Script: Update card image_path to R2 URLs

This script updates all card records in the database to use Cloudflare R2 public URLs
instead of local filesystem paths or external scrape source URLs.

Usage:
    railway run python scripts/migrate_image_urls_to_r2.py

Requirements:
    - R2_PUBLIC_URL environment variable must be set
    - Database connection configured
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables only if not already set (for local development)
if not os.getenv("DATABASE_URL"):
    load_dotenv()

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.models.card import Card
from datetime import datetime


async def migrate_image_urls():
    """Migrate all card image URLs to R2 format."""
    # Get environment variables
    database_url = os.getenv("DATABASE_URL")
    r2_public_url = os.getenv("R2_PUBLIC_URL")

    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        return False

    if not r2_public_url:
        print("ERROR: R2_PUBLIC_URL environment variable not set")
        return False

    print(f"Starting image URL migration to R2...")
    print(f"R2 Public URL: {r2_public_url}")

    # Convert DATABASE_URL to async driver format
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Create engine and session
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # Fetch all cards
        result = await session.execute(select(Card))
        cards = result.scalars().all()

        print(f"\nFound {len(cards)} cards to process")

        updated_count = 0
        skipped_count = 0

        for card in cards:
            old_path = card.image_path

            # Check if already using R2 URL
            if old_path.startswith(r2_public_url):
                print(f"  SKIP: {card.card_id} - Already using R2 URL")
                skipped_count += 1
                continue

            # Generate new R2 URL
            new_path = f"{r2_public_url}/cards/{card.card_id}.jpg"

            # Update card
            card.image_path = new_path
            card.updated_at = datetime.utcnow()
            session.add(card)

            print(f"  UPDATE: {card.card_id}")
            print(f"    OLD: {old_path}")
            print(f"    NEW: {new_path}")

            updated_count += 1

        # Commit all changes
        if updated_count > 0:
            await session.commit()
            print(f"\n✅ Migration complete!")
            print(f"   Updated: {updated_count} cards")
            print(f"   Skipped: {skipped_count} cards (already using R2)")
        else:
            print(f"\n✅ No migration needed - all cards already use R2 URLs")
            print(f"   Skipped: {skipped_count} cards")

        return True


if __name__ == "__main__":
    success = asyncio.run(migrate_image_urls())
    sys.exit(0 if success else 1)
