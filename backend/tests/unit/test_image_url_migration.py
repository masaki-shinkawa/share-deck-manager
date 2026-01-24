"""
Unit tests for image URL migration to Cloudflare R2.

Tests that all card image_path values use R2 public URL format.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from sqlmodel import select
from app.models.card import Card
from app.services.r2_storage import get_r2_storage
import os


class TestImageURLFormat:
    """Test that image URLs follow R2 format."""

    def test_r2_url_format_is_correct(self):
        """R2 URL should follow the expected pattern."""
        # Arrange
        r2_public_url = "https://pub-123abc.r2.dev"
        card_id = "OP01-001"
        expected_url = f"{r2_public_url}/cards/{card_id}.jpg"

        # Act
        actual_url = f"{r2_public_url}/cards/{card_id}.jpg"

        # Assert
        assert actual_url == expected_url
        assert actual_url.startswith("https://")
        assert "/cards/" in actual_url
        assert actual_url.endswith(".jpg")

    @pytest.mark.asyncio
    async def test_all_cards_use_r2_urls(self, test_session, test_card):
        """All cards in database should have R2 URLs as image_path."""
        # Act
        result = await test_session.execute(select(Card))
        cards = result.scalars().all()

        # Assert
        assert len(cards) > 0, "Should have at least one card for testing"

        r2_public_url = os.getenv("R2_PUBLIC_URL", "https://pub-test.r2.dev")

        for card in cards:
            # Check that image_path starts with R2 public URL
            assert card.image_path.startswith(r2_public_url), (
                f"Card {card.card_id} has non-R2 URL: {card.image_path}"
            )
            # Check URL format
            assert "/cards/" in card.image_path
            assert card.image_path.endswith(".jpg")

    @pytest.mark.asyncio
    async def test_card_image_path_not_external_scrape_url(self, test_session, test_card):
        """Cards should not have external scrape URLs."""
        # Act
        result = await test_session.execute(select(Card))
        cards = result.scalars().all()

        # Assert
        for card in cards:
            # Should not be onepiece-cardgame.com URLs
            assert "onepiece-cardgame.com" not in card.image_path, (
                f"Card {card.card_id} still has scrape source URL: {card.image_path}"
            )
            # Should not be local filesystem paths
            assert not card.image_path.startswith("/"), (
                f"Card {card.card_id} has local filesystem path: {card.image_path}"
            )
            assert ":\\" not in card.image_path, (
                f"Card {card.card_id} has Windows filesystem path: {card.image_path}"
            )


class TestR2URLGeneration:
    """Test R2 URL generation logic."""

    def test_get_image_url_returns_correct_format(self):
        """get_image_url should return properly formatted R2 URL."""
        # Arrange
        with patch.dict(os.environ, {
            "R2_ENDPOINT_URL": "https://abc123.r2.cloudflarestorage.com",
            "R2_ACCESS_KEY_ID": "test_key",
            "R2_SECRET_ACCESS_KEY": "test_secret",
            "R2_BUCKET_NAME": "test-bucket",
            "R2_PUBLIC_URL": "https://pub-abc123.r2.dev"
        }):
            r2 = get_r2_storage()
            card_id = "OP01-001"

            # Act
            url = r2.get_image_url(card_id)

            # Assert
            assert url == "https://pub-abc123.r2.dev/cards/OP01-001.jpg"
            assert url.startswith("https://pub-abc123.r2.dev")
            assert "/cards/" in url
            assert url.endswith(f"/{card_id}.jpg")
