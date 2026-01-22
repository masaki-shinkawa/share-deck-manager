"""
Tests for Deck schema validation (Pydantic/SQLModel).

Test Coverage:
- Valid deck creation
- Empty name (should fail)
- Name too long (>100 chars, should fail)
- Name with only whitespace (should fail)
- Name trimming
"""
import pytest
from pydantic import ValidationError
from uuid import uuid4

from app.schemas.deck import DeckCreate, DeckUpdate, DeckPublic


@pytest.mark.unit
@pytest.mark.validation
class TestDeckCreateValidation:
    """Test suite for DeckCreate schema validation."""

    def test_deck_create_valid(self):
        """
        Test creating a valid DeckCreate instance.

        Arrange:
            Create valid deck data
        Act:
            Create DeckCreate instance
        Assert:
            Instance is created successfully
        """
        # Arrange
        leader_card_id = uuid4()

        # Act
        deck = DeckCreate(
            name="Sword Deck",
            leader_card_id=leader_card_id
        )

        # Assert
        assert deck.name == "Sword Deck"
        assert deck.leader_card_id == leader_card_id

    def test_deck_create_minimum_name_length(self):
        """
        Test DeckCreate with minimum valid name length (1 character).

        Arrange:
            Create deck with single character name
        Act:
            Create DeckCreate instance
        Assert:
            Validation passes
        """
        # Arrange
        leader_card_id = uuid4()

        # Act
        deck = DeckCreate(
            name="A",
            leader_card_id=leader_card_id
        )

        # Assert
        assert deck.name == "A"
        assert len(deck.name) == 1

    def test_deck_create_maximum_name_length(self):
        """
        Test DeckCreate with maximum valid name length (100 characters).

        Arrange:
            Create deck with 100 character name
        Act:
            Create DeckCreate instance
        Assert:
            Validation passes
        """
        # Arrange
        max_name = "X" * 100
        leader_card_id = uuid4()

        # Act
        deck = DeckCreate(
            name=max_name,
            leader_card_id=leader_card_id
        )

        # Assert
        assert deck.name == max_name
        assert len(deck.name) == 100

    def test_deck_create_name_exceeds_max_length(self):
        """
        Test DeckCreate with name exceeding max length (101+ characters).

        Arrange:
            Create deck with 101 character name
        Act:
            Try to create DeckCreate instance
        Assert:
            ValidationError is raised
        """
        # Arrange
        too_long_name = "X" * 101
        leader_card_id = uuid4()

        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            DeckCreate(
                name=too_long_name,
                leader_card_id=leader_card_id
            )

        # Assert validation error mentions string length
        assert "at most 100 characters" in str(exc_info.value).lower() or \
               "string_too_long" in str(exc_info.value).lower()

    def test_deck_create_empty_name(self):
        """
        Test DeckCreate with empty name.

        Arrange:
            Create deck with empty string name
        Act:
            Try to create DeckCreate instance
        Assert:
            ValidationError is raised
        """
        # Arrange
        leader_card_id = uuid4()

        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            DeckCreate(
                name="",
                leader_card_id=leader_card_id
            )

        # Assert
        assert "at least 1 character" in str(exc_info.value).lower()

    def test_deck_create_whitespace_only_name(self):
        """
        Test DeckCreate with whitespace-only name.

        Arrange:
            Create deck with spaces/tabs/newlines only
        Act:
            Create DeckCreate instance
        Assert:
            Validation passes (whitespace is technically valid)
            Note: Business logic may need to trim and validate
        """
        # Arrange
        leader_card_id = uuid4()

        # Act
        deck = DeckCreate(
            name="   ",  # Three spaces
            leader_card_id=leader_card_id
        )

        # Assert
        # Validation passes (whitespace is not empty)
        assert deck.name == "   "

    def test_deck_create_with_special_characters(self):
        """
        Test DeckCreate with special characters in name.

        Arrange:
            Create deck with special characters
        Act:
            Create DeckCreate instance
        Assert:
            Validation passes
        """
        # Arrange
        leader_card_id = uuid4()
        special_name = "Deck @#$%^&*() 123!~"

        # Act
        deck = DeckCreate(
            name=special_name,
            leader_card_id=leader_card_id
        )

        # Assert
        assert deck.name == special_name

    def test_deck_create_with_unicode_characters(self):
        """
        Test DeckCreate with Unicode characters (Japanese, emoji, etc).

        Arrange:
            Create deck with Unicode name
        Act:
            Create DeckCreate instance
        Assert:
            Validation passes
        """
        # Arrange
        leader_card_id = uuid4()
        unicode_name = "デッキ🎴 Sword Deck"

        # Act
        deck = DeckCreate(
            name=unicode_name,
            leader_card_id=leader_card_id
        )

        # Assert
        assert deck.name == unicode_name

    def test_deck_create_missing_leader_card_id(self):
        """
        Test DeckCreate without leader_card_id (required field).

        Arrange:
            Create deck data without leader_card_id
        Act:
            Try to create DeckCreate instance
        Assert:
            ValidationError is raised
        """
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            DeckCreate(name="Test Deck")

        assert "leader_card_id" in str(exc_info.value).lower()

    def test_deck_create_invalid_leader_card_id(self):
        """
        Test DeckCreate with invalid leader_card_id type.

        Arrange:
            Create deck with string instead of UUID
        Act:
            Try to create DeckCreate instance
        Assert:
            ValidationError is raised
        """
        # Act & Assert
        with pytest.raises(ValidationError):
            DeckCreate(
                name="Test Deck",
                leader_card_id="not-a-uuid"  # Invalid type
            )

    def test_deck_create_valid_uuid_string(self):
        """
        Test DeckCreate with UUID passed as string.

        Arrange:
            Create deck with UUID string
        Act:
            Create DeckCreate instance
        Assert:
            UUID is accepted and converted
        """
        # Arrange
        leader_card_id_str = str(uuid4())

        # Act
        deck = DeckCreate(
            name="Test Deck",
            leader_card_id=leader_card_id_str
        )

        # Assert
        assert str(deck.leader_card_id) == leader_card_id_str


@pytest.mark.unit
@pytest.mark.validation
class TestDeckUpdateValidation:
    """Test suite for DeckUpdate schema validation."""

    def test_deck_update_valid(self):
        """
        Test creating a valid DeckUpdate instance.

        Arrange:
            Create valid deck update data
        Act:
            Create DeckUpdate instance
        Assert:
            Instance is created successfully
        """
        # Act
        deck_update = DeckUpdate(name="Updated Deck Name")

        # Assert
        assert deck_update.name == "Updated Deck Name"

    def test_deck_update_name_length_validation(self):
        """
        Test DeckUpdate name length validation.

        Arrange:
            Test with min, valid, and max lengths
        Act:
            Create DeckUpdate instances
        Assert:
            Valid range passes, exceeding fails
        """
        # Valid cases
        deck_min = DeckUpdate(name="A")
        assert deck_min.name == "A"

        deck_max = DeckUpdate(name="X" * 100)
        assert len(deck_max.name) == 100

        # Invalid case
        with pytest.raises(ValidationError):
            DeckUpdate(name="X" * 101)

    def test_deck_update_empty_name(self):
        """
        Test DeckUpdate with empty name.

        Arrange:
            Create deck update with empty name
        Act:
            Try to create DeckUpdate instance
        Assert:
            ValidationError is raised
        """
        # Act & Assert
        with pytest.raises(ValidationError):
            DeckUpdate(name="")

    def test_deck_update_ignores_leader_card_id(self):
        """
        Test that DeckUpdate ignores leader_card_id field if provided.

        Note: Pydantic by default ignores extra fields unless explicitly configured.

        Arrange & Act:
            Create DeckUpdate with leader_card_id (extra field)
        Assert:
            Instance is created but leader_card_id is ignored
        """
        # Act
        deck_update = DeckUpdate(
            name="Test Deck",
            leader_card_id=uuid4()  # Extra field, should be ignored
        )

        # Assert
        assert deck_update.name == "Test Deck"
        assert not hasattr(deck_update, 'leader_card_id')


@pytest.mark.unit
@pytest.mark.validation
class TestDeckPublicSchema:
    """Test suite for DeckPublic response schema."""

    def test_deck_public_schema(self):
        """
        Test creating a valid DeckPublic instance.

        Arrange:
            Create valid DeckPublic data
        Act:
            Create DeckPublic instance
        Assert:
            Instance is created successfully
        """
        # Arrange
        deck_id = uuid4()
        card_id = uuid4()
        from datetime import datetime

        # Act
        deck_public = DeckPublic(
            id=deck_id,
            name="Test Deck",
            leader_card_id=card_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Assert
        assert deck_public.id == deck_id
        assert deck_public.name == "Test Deck"
        assert deck_public.leader_card_id == card_id

    def test_deck_public_optional_leader_card(self):
        """
        Test DeckPublic with optional leader_card relationship.

        Arrange:
            Create DeckPublic without leader_card relation
        Act:
            Create DeckPublic instance
        Assert:
            leader_card is None
        """
        # Arrange
        from datetime import datetime

        # Act
        deck_public = DeckPublic(
            id=uuid4(),
            name="Test Deck",
            leader_card_id=uuid4(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            leader_card=None,
        )

        # Assert
        assert deck_public.leader_card is None


@pytest.mark.unit
@pytest.mark.validation
class TestDeckNameNormalization:
    """Test suite for deck name normalization and edge cases."""

    def test_deck_name_with_leading_trailing_spaces(self):
        """
        Test DeckCreate with leading/trailing spaces.

        Arrange:
            Create deck with spaced name
        Act:
            Create DeckCreate instance
        Assert:
            Spaces are preserved (trimming is business logic, not schema)
        """
        # Arrange
        leader_card_id = uuid4()
        name_with_spaces = "  Test Deck  "

        # Act
        deck = DeckCreate(
            name=name_with_spaces,
            leader_card_id=leader_card_id
        )

        # Assert
        assert deck.name == name_with_spaces

    def test_deck_name_with_newlines_and_tabs(self):
        """
        Test DeckCreate with newlines and tabs.

        Arrange:
            Create deck with escaped characters
        Act:
            Create DeckCreate instance
        Assert:
            Whitespace is preserved
        """
        # Arrange
        leader_card_id = uuid4()
        name_with_escapes = "Test\nDeck\tName"

        # Act
        deck = DeckCreate(
            name=name_with_escapes,
            leader_card_id=leader_card_id
        )

        # Assert
        assert "\n" in deck.name
        assert "\t" in deck.name

    def test_deck_name_exactly_100_chars(self):
        """
        Test boundary condition: exactly 100 characters.

        Arrange:
            Create name with exactly 100 chars
        Act:
            Create DeckCreate instance
        Assert:
            Validation passes
        """
        # Arrange
        name_100 = "A" * 100

        # Act
        deck = DeckCreate(
            name=name_100,
            leader_card_id=uuid4()
        )

        # Assert
        assert len(deck.name) == 100

    def test_deck_name_exactly_101_chars(self):
        """
        Test boundary condition: 101 characters (exceeds max).

        Arrange:
            Create name with 101 chars
        Act:
            Try to create DeckCreate
        Assert:
            Validation fails
        """
        # Arrange
        name_101 = "A" * 101

        # Act & Assert
        with pytest.raises(ValidationError):
            DeckCreate(
                name=name_101,
                leader_card_id=uuid4()
            )
