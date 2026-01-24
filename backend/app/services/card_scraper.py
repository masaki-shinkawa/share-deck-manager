"""
Card Scraping Service

Refactored from scripts/scrape_cards.py to be reusable from API endpoints.
Updated to use Cloudflare R2 for image storage instead of local filesystem.
"""

import re
from datetime import datetime
from typing import Dict, List

import requests
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.card import Card
from app.services.r2_storage import get_r2_storage, R2StorageError


# Configuration
CARD_LIST_URL = "https://www.onepiece-cardgame.com/cardlist/"


def fetch_card_list() -> str:
    """Fetch the card list HTML from the website."""
    headers = {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    # Filter for leader cards only
    data = {
        "freewords": "",
        "series": "",
        "categories[]": "リーダー"
    }

    response = requests.post(CARD_LIST_URL, headers=headers, data=data, timeout=30)
    response.raise_for_status()

    return response.text


def parse_cards(html: str) -> List[Dict]:
    """Parse card data from HTML."""
    soup = BeautifulSoup(html, "lxml")
    cards = []

    card_elements = soup.select(".modalCol")

    for element in card_elements:
        try:
            # Card image URL
            img_tag = element.select_one("img.lazy")
            if not img_tag or not img_tag.get("data-src"):
                continue

            image_url = img_tag["data-src"]

            # Convert relative URL to absolute URL
            if image_url.startswith("../"):
                image_url = "https://www.onepiece-cardgame.com" + image_url[2:]

            # Extract card ID from image filename
            card_id = Path(image_url).stem

            # Character name
            name_tag = element.select_one(".cardName")
            name = name_tag.text.strip() if name_tag else "Unknown"

            # Extract color
            color = ""
            color_div = element.select_one(".color")
            if color_div:
                text = color_div.get_text(strip=True)
                color = text.replace("色", "").strip()

            # Extract block icon (int)
            block_icon = 0
            block_div = element.select_one(".block")
            if block_div:
                text = block_div.get_text(strip=True)
                nums = re.findall(r'\d+', text)
                if nums:
                    block_icon = int(nums[0])

            cards.append({
                "card_id": card_id,
                "name": name,
                "color": color,
                "block_icon": block_icon,
                "image_url": image_url
            })

        except Exception as e:
            print(f"Error parsing card: {e}")
            continue

    return cards


def download_and_upload_image(image_url: str, card_id: str) -> str | None:
    """
    Download card image and upload to Cloudflare R2.

    Args:
        image_url: URL of the image to download
        card_id: Card identifier (e.g., "OP01-001")

    Returns:
        str | None: Public R2 URL of the uploaded image, or None if failed
    """
    try:
        # Get R2 storage service
        r2_storage = get_r2_storage()

        # Check if image already exists in R2
        if r2_storage.image_exists(card_id):
            return r2_storage.get_image_url(card_id)

        # Download image to memory
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        image_bytes = response.content

        # Upload to R2
        r2_url = r2_storage.upload_image(card_id, image_bytes)
        return r2_url

    except R2StorageError as e:
        print(f"R2 storage error for {card_id}: {e}")
        return None
    except Exception as e:
        print(f"Error downloading/uploading {card_id}: {e}")
        return None


async def scrape_and_save_cards(session: AsyncSession) -> Dict[str, int]:
    """
    Main scraping function that can be called from API endpoints.

    Args:
        session: Database session

    Returns:
        Dict with statistics: {"new_cards": int, "updated_cards": int, "total_cards": int}
    """
    # Fetch and parse card list
    html = fetch_card_list()
    cards_data = parse_cards(html)

    saved_count = 0
    updated_count = 0

    for card_data in cards_data:
        # Download image and upload to R2
        r2_url = download_and_upload_image(card_data["image_url"], card_data["card_id"])
        if not r2_url:
            continue

        # Check for existing card
        result = await session.execute(
            select(Card).where(Card.card_id == card_data["card_id"])
        )
        existing_card = result.scalar_one_or_none()

        if existing_card:
            # Update existing card
            existing_card.name = card_data["name"]
            existing_card.color = card_data["color"]
            existing_card.block_icon = card_data["block_icon"]
            existing_card.image_path = r2_url
            existing_card.updated_at = datetime.utcnow()
            updated_count += 1
        else:
            # Create new card
            card = Card(
                card_id=card_data["card_id"],
                name=card_data["name"],
                color=card_data["color"],
                block_icon=card_data["block_icon"],
                image_path=r2_url
            )
            session.add(card)
            saved_count += 1

    await session.commit()

    return {
        "new_cards": saved_count,
        "updated_cards": updated_count,
        "total_cards": len(cards_data)
    }
