"""
Tests for CustomCard schema validation (Pydantic/SQLModel).

Test Coverage for Color1/Color2:
- Valid custom card with color1 only (single color)
- Valid custom card with color1 and color2 (multi-color)
- Empty color1 (should fail)
- Color1 too long
- Color2 optional (can be None or empty)
- Duplicate colors (color1 == color2, should fail)
- Color ordering (auto-sort by standard order)
"""
import pytest
from pydantic import ValidationError

from app.schemas.custom_card import CustomCardCreate, CustomCardPublic


@pytest.mark.unit
@pytest.mark.validation
class TestCustomCardCreateValidation:
    """Test suite for CustomCardCreate schema validation with color1/color2."""

    def test_custom_card_create_single_color(self):
        """
        Test creating a valid CustomCardCreate with single color (color1 only).

        Arrange:
            Create custom card data with color1, no color2
        Act:
            Create CustomCardCreate instance
        Assert:
            Instance is created successfully with color1, color2 is None
        """
        # Act
        card = CustomCardCreate(
            name="紫/黄 Leader",
            color1="紫",
            color2=None
        )

        # Assert
        assert card.name == "紫/黄 Leader"
        assert card.color1 == "紫"
        assert card.color2 is None

    def test_custom_card_create_multi_color(self):
        """
        Test creating a valid CustomCardCreate with two colors.

        Arrange:
            Create custom card data with color1 and color2
        Act:
            Create CustomCardCreate instance
        Assert:
            Instance is created successfully with both colors
        """
        # Act
        card = CustomCardCreate(
            name="赤/緑 Leader",
            color1="赤",
            color2="緑"
        )

        # Assert
        assert card.name == "赤/緑 Leader"
        assert card.color1 == "赤"
        assert card.color2 == "緑"

    def test_custom_card_create_color1_required(self):
        """
        Test CustomCardCreate without color1 (required field).

        Arrange:
            Create card data without color1
        Act:
            Try to create CustomCardCreate instance
        Assert:
            ValidationError is raised
        """
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            CustomCardCreate(
                name="Test Leader",
                color2="赤"
            )

        assert "color1" in str(exc_info.value).lower()

    def test_custom_card_create_color1_empty(self):
        """
        Test CustomCardCreate with empty color1.

        Arrange:
            Create card with empty string color1
        Act:
            Try to create CustomCardCreate instance
        Assert:
            ValidationError is raised
        """
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            CustomCardCreate(
                name="Test Leader",
                color1="",
                color2=None
            )

        assert "color cannot be empty" in str(exc_info.value).lower()

    def test_custom_card_create_color1_whitespace_only(self):
        """
        Test CustomCardCreate with whitespace-only color1.

        Arrange:
            Create card with spaces-only color1
        Act:
            Try to create CustomCardCreate instance
        Assert:
            ValidationError is raised (after trimming)
        """
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            CustomCardCreate(
                name="Test Leader",
                color1="   ",
                color2=None
            )

        assert "color cannot be empty" in str(exc_info.value).lower()

    def test_custom_card_create_color2_optional(self):
        """
        Test CustomCardCreate with color2 as None (optional).

        Arrange:
            Create card with color1 only
        Act:
            Create CustomCardCreate instance
        Assert:
            color2 is None
        """
        # Act
        card = CustomCardCreate(
            name="Single Color Leader",
            color1="青",
            color2=None
        )

        # Assert
        assert card.color1 == "青"
        assert card.color2 is None

    def test_custom_card_create_color2_empty_string(self):
        """
        Test CustomCardCreate with color2 as empty string (treated as None).

        Arrange:
            Create card with empty string color2
        Act:
            Create CustomCardCreate instance
        Assert:
            Empty string is converted to None after trimming
        """
        # Act
        card = CustomCardCreate(
            name="Single Color Leader",
            color1="黒",
            color2=""
        )

        # Assert
        assert card.color1 == "黒"
        assert card.color2 is None

    def test_custom_card_create_duplicate_colors(self):
        """
        Test CustomCardCreate with duplicate colors (color1 == color2).

        Arrange:
            Create card with same color for color1 and color2
        Act:
            Try to create CustomCardCreate instance
        Assert:
            ValidationError is raised
        """
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            CustomCardCreate(
                name="Duplicate Color Leader",
                color1="赤",
                color2="赤"
            )

        assert "cannot be the same" in str(exc_info.value).lower() or \
               "duplicate" in str(exc_info.value).lower()

    def test_custom_card_create_color_trimming(self):
        """
        Test CustomCardCreate with leading/trailing spaces in colors.

        Arrange:
            Create card with spaced colors
        Act:
            Create CustomCardCreate instance
        Assert:
            Colors are trimmed
        """
        # Act
        card = CustomCardCreate(
            name="Spaced Colors",
            color1="  赤  ",
            color2="  緑  "
        )

        # Assert
        assert card.color1 == "赤"
        assert card.color2 == "緑"

    def test_custom_card_create_color_ordering(self):
        """
        Test CustomCardCreate with colors in wrong order.

        Arrange:
            Create card with color1=緑, color2=赤 (should auto-sort to 赤/緑)
        Act:
            Create CustomCardCreate instance
        Assert:
            Colors are automatically sorted to standard order
        """
        # Act
        card = CustomCardCreate(
            name="Auto-sorted Leader",
            color1="緑",
            color2="赤"
        )

        # Assert - Colors should be auto-sorted to standard order (赤 before 緑)
        assert card.color1 == "赤"
        assert card.color2 == "緑"

    def test_custom_card_create_all_color_combinations(self):
        """
        Test CustomCardCreate with all valid color combinations.

        Arrange:
            Test all valid color pairs
        Act:
            Create CustomCardCreate instances
        Assert:
            All combinations are accepted and sorted correctly
        """
        # Standard color order: 赤 < 緑 < 青 < 紫 < 黒 < 黄
        color_order = ["赤", "緑", "青", "紫", "黒", "黄"]

        for i, color1 in enumerate(color_order):
            for j, color2 in enumerate(color_order):
                if i < j:  # Only test valid combinations (no duplicates)
                    # Act
                    card = CustomCardCreate(
                        name=f"{color1}/{color2} Leader",
                        color1=color1,
                        color2=color2
                    )

                    # Assert - Should maintain standard order
                    assert card.color1 == color1
                    assert card.color2 == color2

    def test_custom_card_create_reversed_color_order(self):
        """
        Test CustomCardCreate with reversed color order (should auto-correct).

        Arrange:
            Create card with color1=黄, color2=赤 (reversed order)
        Act:
            Create CustomCardCreate instance
        Assert:
            Colors are auto-sorted to 赤/黄
        """
        # Act
        card = CustomCardCreate(
            name="Reversed Colors",
            color1="黄",
            color2="赤"
        )

        # Assert - Should be auto-sorted
        assert card.color1 == "赤"
        assert card.color2 == "黄"

    def test_custom_card_create_name_with_color_notation(self):
        """
        Test CustomCardCreate with name containing color notation (e.g. "赤/緑").

        Arrange:
            Create card with color notation in name
        Act:
            Create CustomCardCreate instance
        Assert:
            Name is preserved as-is
        """
        # Act
        card = CustomCardCreate(
            name="赤/緑 Leader Card",
            color1="赤",
            color2="緑"
        )

        # Assert
        assert card.name == "赤/緑 Leader Card"
        assert card.color1 == "赤"
        assert card.color2 == "緑"


@pytest.mark.unit
@pytest.mark.validation
class TestCustomCardPublicSchema:
    """Test suite for CustomCardPublic response schema with color1/color2."""

    def test_custom_card_public_single_color(self):
        """
        Test creating a valid CustomCardPublic with single color.

        Arrange:
            Create valid CustomCardPublic data with color1 only
        Act:
            Create CustomCardPublic instance
        Assert:
            Instance is created successfully
        """
        # Arrange
        from uuid import uuid4
        from datetime import datetime

        # Act
        card_public = CustomCardPublic(
            id=uuid4(),
            user_id=uuid4(),
            name="Single Color Leader",
            color1="紫",
            color2=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Assert
        assert card_public.name == "Single Color Leader"
        assert card_public.color1 == "紫"
        assert card_public.color2 is None

    def test_custom_card_public_multi_color(self):
        """
        Test creating a valid CustomCardPublic with two colors.

        Arrange:
            Create valid CustomCardPublic data with color1 and color2
        Act:
            Create CustomCardPublic instance
        Assert:
            Instance is created successfully
        """
        # Arrange
        from uuid import uuid4
        from datetime import datetime

        # Act
        card_public = CustomCardPublic(
            id=uuid4(),
            user_id=uuid4(),
            name="Multi Color Leader",
            color1="赤",
            color2="緑",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Assert
        assert card_public.name == "Multi Color Leader"
        assert card_public.color1 == "赤"
        assert card_public.color2 == "緑"
