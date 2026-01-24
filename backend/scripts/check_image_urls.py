"""
Check current image_path values in the database.

This script shows a summary of image URL formats currently in use.
"""

import asyncio
import sys
from pathlib import Path
from collections import Counter

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import select
from app.db.session import async_session_maker
from app.models.card import Card


async def check_image_urls():
    """Check and report on current image URL formats."""
    print("Checking image URLs in database...\n")

    async with async_session_maker() as session:
        # Fetch all cards
        result = await session.execute(select(Card))
        cards = result.scalars().all()

        print(f"Total cards: {len(cards)}\n")

        # Categorize URLs
        categories = {
            "R2 URLs": 0,
            "External (scrape source)": 0,
            "Local filesystem": 0,
            "Other": 0,
        }

        url_patterns = Counter()

        for card in cards:
            path = card.image_path

            if "r2.dev" in path or "cloudflare" in path.lower():
                categories["R2 URLs"] += 1
                url_patterns["R2"] += 1
            elif "onepiece-cardgame.com" in path or path.startswith("http"):
                categories["External (scrape source)"] += 1
                url_patterns["External HTTP"] += 1
            elif path.startswith("/") or ":\\" in path:
                categories["Local filesystem"] += 1
                url_patterns["Local path"] += 1
            else:
                categories["Other"] += 1
                url_patterns["Other"] += 1

        # Print summary
        print("=== Image URL Summary ===")
        for category, count in categories.items():
            percentage = (count / len(cards) * 100) if cards else 0
            print(f"{category:30s}: {count:4d} ({percentage:5.1f}%)")

        print("\n=== Sample URLs ===")
        # Show 5 sample URLs from each category
        async with async_session_maker() as session:
            result = await session.execute(select(Card).limit(5))
            sample_cards = result.scalars().all()

            for card in sample_cards:
                print(f"{card.card_id:15s}: {card.image_path[:70]}{'...' if len(card.image_path) > 70 else ''}")

        # Migration recommendation
        print("\n=== Migration Status ===")
        if categories["R2 URLs"] == len(cards):
            print("✅ All cards are using R2 URLs - No migration needed!")
        elif categories["R2 URLs"] > 0:
            print(f"⚠️  Partial migration detected:")
            print(f"   {categories['R2 URLs']} cards migrated")
            print(f"   {len(cards) - categories['R2 URLs']} cards need migration")
            print(f"\n   Run: railway run python scripts/migrate_image_urls_to_r2.py")
        else:
            print("❌ No R2 URLs found - Migration required!")
            print(f"\n   Run: railway run python scripts/migrate_image_urls_to_r2.py")


if __name__ == "__main__":
    asyncio.run(check_image_urls())
