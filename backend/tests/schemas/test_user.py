"""
Tests for User schema validation (Pydantic/SQLModel).

Test Coverage:
- Nickname max length (50 chars)
- Nickname with special characters
- Optional nickname handling
- Nickname trimming and edge cases
"""
import pytest
from pydantic import ValidationError

from app.schemas.user import UserPublic


@pytest.mark.unit
@pytest.mark.validation
class TestUserPublicSchema:
    """Test suite for UserPublic schema validation."""

    def test_user_public_with_nickname(self):
        """
        Test creating UserPublic with valid nickname.

        Arrange:
            Create valid user data with nickname
        Act:
            Create UserPublic instance
        Assert:
            Instance is created successfully
        """
        # Act
        user = UserPublic(nickname="TestUser")

        # Assert
        assert user.nickname == "TestUser"

    def test_user_public_without_nickname(self):
        """
        Test creating UserPublic without nickname (None).

        Arrange:
            Create user data without nickname field
        Act:
            Create UserPublic instance
        Assert:
            nickname is None
        """
        # Act
        user = UserPublic()

        # Assert
        assert user.nickname is None

    def test_user_public_nickname_empty_string(self):
        """
        Test UserPublic with empty string nickname.

        Arrange:
            Create user with empty nickname
        Act:
            Create UserPublic instance
        Assert:
            Empty string is accepted (0 chars < 50 chars max)
        """
        # Act
        user = UserPublic(nickname="")

        # Assert
        assert user.nickname == ""

    def test_user_public_nickname_minimum_length(self):
        """
        Test UserPublic nickname with minimum length (1 character).

        Arrange:
            Create user with single character nickname
        Act:
            Create UserPublic instance
        Assert:
            Single character nickname is accepted
        """
        # Act
        user = UserPublic(nickname="A")

        # Assert
        assert user.nickname == "A"
        assert len(user.nickname) == 1

    def test_user_public_nickname_maximum_length(self):
        """
        Test UserPublic nickname with maximum length (50 characters).

        Arrange:
            Create user with 50 character nickname
        Act:
            Create UserPublic instance
        Assert:
            50 character nickname is accepted
        """
        # Arrange
        nickname_50 = "X" * 50

        # Act
        user = UserPublic(nickname=nickname_50)

        # Assert
        assert user.nickname == nickname_50
        assert len(user.nickname) == 50

    def test_user_public_nickname_exceeds_max_length(self):
        """
        Test UserPublic nickname exceeding max length (51+ characters).

        Arrange:
            Create user with 51 character nickname
        Act:
            Try to create UserPublic instance
        Assert:
            ValidationError is raised
        """
        # Arrange
        nickname_51 = "X" * 51

        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            UserPublic(nickname=nickname_51)

        # Assert validation error mentions string length
        assert "at most 50 characters" in str(exc_info.value).lower() or \
               "string_too_long" in str(exc_info.value).lower()

    def test_user_public_nickname_with_spaces(self):
        """
        Test UserPublic nickname with spaces.

        Arrange:
            Create user with spaced nickname
        Act:
            Create UserPublic instance
        Assert:
            Spaces are accepted in nickname
        """
        # Arrange
        nickname_with_spaces = "Test User Name"

        # Act
        user = UserPublic(nickname=nickname_with_spaces)

        # Assert
        assert user.nickname == "Test User Name"
        assert " " in user.nickname

    def test_user_public_nickname_with_special_characters(self):
        """
        Test UserPublic nickname with special characters.

        Arrange:
            Create user with special characters in nickname
        Act:
            Create UserPublic instance
        Assert:
            Special characters are accepted
        """
        # Arrange
        nickname_special = "User@#$%123!~"

        # Act
        user = UserPublic(nickname=nickname_special)

        # Assert
        assert user.nickname == nickname_special

    def test_user_public_nickname_with_unicode(self):
        """
        Test UserPublic nickname with Unicode characters.

        Arrange:
            Create user with Unicode nickname (Japanese, emoji, etc)
        Act:
            Create UserPublic instance
        Assert:
            Unicode characters are accepted
        """
        # Arrange
        unicode_nickname = "ユーザー🎴日本語"

        # Act
        user = UserPublic(nickname=unicode_nickname)

        # Assert
        assert user.nickname == unicode_nickname

    def test_user_public_nickname_with_numbers_only(self):
        """
        Test UserPublic nickname with only numbers.

        Arrange:
            Create user with numeric nickname
        Act:
            Create UserPublic instance
        Assert:
            Numeric nickname is accepted
        """
        # Arrange
        numeric_nickname = "123456"

        # Act
        user = UserPublic(nickname=numeric_nickname)

        # Assert
        assert user.nickname == numeric_nickname

    def test_user_public_nickname_with_hyphens_underscores(self):
        """
        Test UserPublic nickname with hyphens and underscores.

        Arrange:
            Create user with hyphens/underscores
        Act:
            Create UserPublic instance
        Assert:
            Hyphens and underscores are accepted
        """
        # Arrange
        nickname_hyphens = "user-name_123"

        # Act
        user = UserPublic(nickname=nickname_hyphens)

        # Assert
        assert user.nickname == nickname_hyphens


@pytest.mark.unit
@pytest.mark.validation
class TestUserPublicEdgeCases:
    """Test edge cases for UserPublic schema."""

    def test_user_public_nickname_exactly_50_chars(self):
        """
        Test boundary condition: exactly 50 characters.

        Arrange:
            Create nickname with exactly 50 chars
        Act:
            Create UserPublic instance
        Assert:
            Validation passes
        """
        # Arrange
        nickname_50 = "A" * 50

        # Act
        user = UserPublic(nickname=nickname_50)

        # Assert
        assert len(user.nickname) == 50

    def test_user_public_nickname_exactly_51_chars(self):
        """
        Test boundary condition: 51 characters (exceeds max).

        Arrange:
            Create nickname with 51 chars
        Act:
            Try to create UserPublic
        Assert:
            Validation fails
        """
        # Arrange
        nickname_51 = "A" * 51

        # Act & Assert
        with pytest.raises(ValidationError):
            UserPublic(nickname=nickname_51)

    def test_user_public_nickname_with_leading_spaces(self):
        """
        Test UserPublic nickname with leading spaces.

        Arrange:
            Create nickname with leading spaces
        Act:
            Create UserPublic instance
        Assert:
            Leading spaces are preserved
        """
        # Arrange
        nickname_leading_spaces = "  Leading Spaces"

        # Act
        user = UserPublic(nickname=nickname_leading_spaces)

        # Assert
        assert user.nickname == "  Leading Spaces"
        assert user.nickname.startswith(" ")

    def test_user_public_nickname_with_trailing_spaces(self):
        """
        Test UserPublic nickname with trailing spaces.

        Arrange:
            Create nickname with trailing spaces
        Act:
            Create UserPublic instance
        Assert:
            Trailing spaces are preserved
        """
        # Arrange
        nickname_trailing_spaces = "Trailing Spaces  "

        # Act
        user = UserPublic(nickname=nickname_trailing_spaces)

        # Assert
        assert user.nickname == "Trailing Spaces  "
        assert user.nickname.endswith(" ")

    def test_user_public_nickname_whitespace_only(self):
        """
        Test UserPublic nickname with only whitespace.

        Arrange:
            Create nickname with only spaces
        Act:
            Create UserPublic instance
        Assert:
            Whitespace-only nickname is accepted
        """
        # Arrange
        nickname_spaces_only = "     "

        # Act
        user = UserPublic(nickname=nickname_spaces_only)

        # Assert
        assert user.nickname == "     "

    def test_user_public_nickname_with_newlines(self):
        """
        Test UserPublic nickname with newlines.

        Arrange:
            Create nickname with newline character
        Act:
            Create UserPublic instance
        Assert:
            Newline is preserved in nickname
        """
        # Arrange
        nickname_with_newline = "User\nName"

        # Act
        user = UserPublic(nickname=nickname_with_newline)

        # Assert
        assert "\n" in user.nickname

    def test_user_public_nickname_with_tabs(self):
        """
        Test UserPublic nickname with tabs.

        Arrange:
            Create nickname with tab character
        Act:
            Create UserPublic instance
        Assert:
            Tab is preserved in nickname
        """
        # Arrange
        nickname_with_tab = "User\tName"

        # Act
        user = UserPublic(nickname=nickname_with_tab)

        # Assert
        assert "\t" in user.nickname

    def test_user_public_none_explicitly_set(self):
        """
        Test UserPublic with None explicitly set as nickname.

        Arrange:
            Create user with None nickname
        Act:
            Create UserPublic instance
        Assert:
            nickname is None
        """
        # Act
        user = UserPublic(nickname=None)

        # Assert
        assert user.nickname is None

    def test_user_public_multiple_instances_independence(self):
        """
        Test that multiple UserPublic instances are independent.

        Arrange:
            Create two UserPublic instances with different nicknames
        Act:
            Compare their nicknames
        Assert:
            Each instance maintains its own nickname
        """
        # Act
        user1 = UserPublic(nickname="User1")
        user2 = UserPublic(nickname="User2")

        # Assert
        assert user1.nickname == "User1"
        assert user2.nickname == "User2"
        assert user1.nickname != user2.nickname

    def test_user_public_can_update_nickname(self):
        """
        Test that UserPublic nickname can be modified.

        Arrange:
            Create UserPublic with initial nickname
        Act:
            Modify the nickname
        Assert:
            Nickname is updated
        """
        # Arrange
        user = UserPublic(nickname="Original")

        # Act
        user.nickname = "Updated"

        # Assert
        assert user.nickname == "Updated"


@pytest.mark.unit
@pytest.mark.validation
class TestUserPublicSerialization:
    """Test serialization/deserialization of UserPublic."""

    def test_user_public_model_dump(self):
        """
        Test UserPublic.model_dump() for serialization.

        Arrange:
            Create UserPublic instance
        Act:
            Call model_dump()
        Assert:
            Returns dict with nickname field
        """
        # Arrange
        user = UserPublic(nickname="TestUser")

        # Act
        user_dict = user.model_dump()

        # Assert
        assert isinstance(user_dict, dict)
        assert "nickname" in user_dict
        assert user_dict["nickname"] == "TestUser"

    def test_user_public_model_dump_none_nickname(self):
        """
        Test UserPublic.model_dump() with None nickname.

        Arrange:
            Create UserPublic with None nickname
        Act:
            Call model_dump()
        Assert:
            Returns dict with None for nickname
        """
        # Arrange
        user = UserPublic(nickname=None)

        # Act
        user_dict = user.model_dump()

        # Assert
        assert user_dict["nickname"] is None

    def test_user_public_model_dump_json(self):
        """
        Test UserPublic.model_dump_json() for JSON serialization.

        Arrange:
            Create UserPublic instance
        Act:
            Call model_dump_json()
        Assert:
            Returns valid JSON string
        """
        # Arrange
        user = UserPublic(nickname="TestUser")

        # Act
        user_json = user.model_dump_json()

        # Assert
        assert isinstance(user_json, str)
        assert "TestUser" in user_json

    def test_user_public_model_validate(self):
        """
        Test UserPublic.model_validate() for deserialization.

        Arrange:
            Create dict with user data
        Act:
            Call model_validate()
        Assert:
            Returns UserPublic instance
        """
        # Arrange
        user_data = {"nickname": "TestUser"}

        # Act
        user = UserPublic.model_validate(user_data)

        # Assert
        assert isinstance(user, UserPublic)
        assert user.nickname == "TestUser"

    def test_user_public_model_validate_with_none(self):
        """
        Test UserPublic.model_validate() with None nickname.

        Arrange:
            Create dict with None nickname
        Act:
            Call model_validate()
        Assert:
            Returns UserPublic with None nickname
        """
        # Arrange
        user_data = {"nickname": None}

        # Act
        user = UserPublic.model_validate(user_data)

        # Assert
        assert user.nickname is None
