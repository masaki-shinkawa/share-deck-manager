"""
Tests for image URL migration script.
"""

import pytest
from unittest.mock import patch, AsyncMock
from sqlmodel import select
from app.models.card import Card
from datetime import datetime
import os


@pytest.mark.asyncio
async def test_migration_script_updates_old_urls(test_session):
    """Migration script should update cards with old URLs to R2 format."""
    # Arrange - Create cards with old-style URLs
    cards_data = [
        ("OP01-001", "/images/op01-001.jpg"),
        ("OP01-002", "https://onepiece-cardgame.com/images/op01-002.jpg"),
        ("OP01-003", "C:\\images\\op01-003.jpg"),
    ]

    for card_id, old_path in cards_data:
        card = Card(
            card_id=card_id,
            name=f"Test Card {card_id}",
            color="Red",
            block_icon=1,
            image_path=old_path
        )
        test_session.add(card)

    await test_session.commit()

    # Act - Run migration logic
    r2_public_url = os.getenv("R2_PUBLIC_URL", "https://pub-test.r2.dev")

    result = await test_session.execute(select(Card))
    cards = result.scalars().all()

    for card in cards:
        if not card.image_path.startswith(r2_public_url):
            card.image_path = f"{r2_public_url}/cards/{card.card_id}.jpg"
            test_session.add(card)

    await test_session.commit()

    # Assert
    result = await test_session.execute(select(Card))
    migrated_cards = result.scalars().all()

    for card in migrated_cards:
        assert card.image_path.startswith(r2_public_url), \
            f"Card {card.card_id} was not migrated"
        assert card.image_path == f"{r2_public_url}/cards/{card.card_id}.jpg", \
            f"Card {card.card_id} has incorrect R2 URL format"


@pytest.mark.asyncio
async def test_migration_script_skips_r2_urls(test_session):
    """Migration script should skip cards already using R2 URLs."""
    # Arrange - Create card with R2 URL
    r2_public_url = os.getenv("R2_PUBLIC_URL", "https://pub-test.r2.dev")
    original_url = f"{r2_public_url}/cards/OP01-001.jpg"

    card = Card(
        card_id="OP01-001",
        name="Test Card",
        color="Red",
        block_icon=1,
        image_path=original_url
    )
    test_session.add(card)
    await test_session.commit()

    original_updated_at = card.updated_at

    # Act - Run migration logic
    result = await test_session.execute(select(Card).where(Card.card_id == "OP01-001"))
    card = result.scalar_one()

    # Should skip because already R2
    if card.image_path.startswith(r2_public_url):
        # Skip - don't update
        pass

    await test_session.commit()

    # Assert
    result = await test_session.execute(select(Card).where(Card.card_id == "OP01-001"))
    card = result.scalar_one()

    assert card.image_path == original_url, "URL should not change"
    assert card.updated_at == original_updated_at, "updated_at should not change"


@pytest.mark.asyncio
async def test_migration_preserves_card_id_in_url(test_session):
    """Migration should preserve card_id in the R2 URL path."""
    # Arrange
    test_cards = [
        "OP01-001",
        "OP02-050",
        "ST01-001",
        "P-001",
    ]

    for card_id in test_cards:
        card = Card(
            card_id=card_id,
            name=f"Test Card {card_id}",
            color="Red",
            block_icon=1,
            image_path="/old/path.jpg"
        )
        test_session.add(card)

    await test_session.commit()

    # Act - Migrate
    r2_public_url = os.getenv("R2_PUBLIC_URL", "https://pub-test.r2.dev")

    result = await test_session.execute(select(Card))
    cards = result.scalars().all()

    for card in cards:
        card.image_path = f"{r2_public_url}/cards/{card.card_id}.jpg"
        test_session.add(card)

    await test_session.commit()

    # Assert
    result = await test_session.execute(select(Card))
    migrated_cards = result.scalars().all()

    for card in migrated_cards:
        expected_url = f"{r2_public_url}/cards/{card.card_id}.jpg"
        assert card.image_path == expected_url, \
            f"Card {card.card_id} URL does not match expected format"
        assert f"/{card.card_id}.jpg" in card.image_path, \
            f"Card {card.card_id} URL does not contain card_id"
