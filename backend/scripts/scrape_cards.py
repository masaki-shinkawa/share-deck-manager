"""
Card Master Data Scraping Script

This script scrapes card data from the One Piece Card Game official website,
downloads images, and stores metadata in the database.
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Add the parent directory to the path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import engine
from app.models.card import Card
from sqlmodel import SQLModel

# Configuration
CARD_LIST_URL = "https://www.onepiece-cardgame.com/cardlist/"
IMAGES_DIR = Path(__file__).parent.parent / "card_images"
IMAGES_DIR.mkdir(exist_ok=True)


def fetch_card_list():
    """Fetch the card list HTML from the website"""
    print("Fetching card list...")
    
    headers = {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    # リーダーカードのみをフィルタリング
    data = {
        "freewords": "",
        "series": "",
        "categories[]": "リーダー"
    }
    
    response = requests.post(CARD_LIST_URL, headers=headers, data=data)
    response.raise_for_status()
    
    return response.text


def parse_cards(html):
    """Parse card data from HTML"""
    print("Parsing card data...")
    soup = BeautifulSoup(html, "lxml")
    
    cards = []
    
    # カードリストのコンテナを探す
    card_elements = soup.select(".modalCol")
    
    print(f"Found {len(card_elements)} cards")
    
    for element in card_elements:
        try:
            # デバッグ: 最初のカードのHTML構造を出力
            if len(cards) == 0:
                print("\n=== First card HTML structure ===")
                print(element.prettify()[:2000])  # 最初の2000文字
                print("=== End of HTML ===\n")
            
            # カード画像URL
            img_tag = element.select_one("img.lazy")
            if not img_tag or not img_tag.get("data-src"):
                continue
            
            image_url = img_tag["data-src"]
            
            # 相対URLを絶対URLに変換
            if image_url.startswith("../"):
                image_url = "https://www.onepiece-cardgame.com" + image_url[2:]
            
            # カードID (画像ファイル名から抽出)
            card_id = Path(image_url).stem
            
            # カードID (画像ファイル名から抽出)
            card_id = Path(image_url).stem
            
            # キャラクター名
            name_tag = element.select_one(".cardName")
            name = name_tag.text.strip() if name_tag else "Unknown"
            
            # 色の抽出
            color = ""
            color_div = element.select_one(".color")
            if color_div:
                # <h3>色</h3>の後のテキストを取得
                text = color_div.get_text(strip=True)
                # "色" を除去して色の部分だけ取得
                color = text.replace("色", "").strip()
            
            # ブロックアイコンの抽出 (int)
            block_icon = 0
            block_div = element.select_one(".block")
            if block_div:
                text = block_div.get_text(strip=True)
                # 数字のみを抽出
                import re
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


def download_image(image_url, card_id):
    """Download card image"""
    image_path = IMAGES_DIR / f"{card_id}.jpg"
    
    # すでにダウンロード済みならスキップ
    if image_path.exists():
        return str(image_path.relative_to(Path(__file__).parent.parent))
    
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        
        with open(image_path, "wb") as f:
            f.write(response.content)
        
        print(f"Downloaded: {card_id}")
        return str(image_path.relative_to(Path(__file__).parent.parent))
        
    except Exception as e:
        print(f"Error downloading {card_id}: {e}")
        return None


async def save_to_database(cards_data):
    """Save card data to database"""
    print("\nSaving to database...")
    
    async with AsyncSession(engine) as session:
        saved_count = 0
        updated_count = 0
        
        for card_data in cards_data:
            # 画像をダウンロード
            image_path = download_image(card_data["image_url"], card_data["card_id"])
            if not image_path:
                continue
            
            # 既存のカードを確認
            result = await session.execute(
                select(Card).where(Card.card_id == card_data["card_id"])
            )
            existing_card = result.scalar_one_or_none()
            
            if existing_card:
                # 更新
                existing_card.name = card_data["name"]
                existing_card.color = card_data["color"]
                existing_card.block_icon = card_data["block_icon"]
                existing_card.image_path = image_path
                existing_card.updated_at = datetime.utcnow()
                updated_count += 1
            else:
                # 新規作成
                card = Card(
                    card_id=card_data["card_id"],
                    name=card_data["name"],
                    color=card_data["color"],
                    block_icon=card_data["block_icon"],
                    image_path=image_path
                )
                session.add(card)
                saved_count += 1
        
        await session.commit()
        
        print(f"\nCompleted!")
        print(f"New cards: {saved_count}")
        print(f"Updated cards: {updated_count}")


async def main():
    """Main function"""
    try:
        # Fetch and parse card list
        html = fetch_card_list()
        cards_data = parse_cards(html)
        
        if not cards_data:
            print("No cards found!")
            return
        
        # Save to database
        await save_to_database(cards_data)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
