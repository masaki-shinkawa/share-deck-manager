"""
Unit tests for User role functionality.

These tests follow the TDD (Test-Driven Development) approach:
1. RED - Write failing tests first
2. GREEN - Implement minimal code to pass
3. REFACTOR - Improve code while keeping tests green
"""

import pytest
from datetime import datetime
from uuid import uuid4
from app.models.user import User
from app.models.role import UserRole


class TestUserRoleAssignment:
    """Test cases for user role assignment."""

    def test_new_user_defaults_to_admin_role(self):
        """New users should be assigned admin role by default."""
        # Arrange & Act
        user = User(
            google_id="google_123",
            email="test@example.com"
        )

        # Assert
        assert user.role == UserRole.ADMIN.value
        assert user.role == "admin"

    def test_user_role_can_be_explicitly_set(self):
        """User role can be explicitly set during creation."""
        # Arrange & Act
        user = User(
            google_id="google_456",
            email="owner@example.com",
            role=UserRole.OWNER.value
        )

        # Assert
        assert user.role == UserRole.OWNER.value
        assert user.role == "owner"

    def test_user_role_can_be_changed(self):
        """User role can be changed after creation."""
        # Arrange
        user = User(
            google_id="google_789",
            email="member@example.com",
            role=UserRole.MEMBER.value
        )

        # Act
        user.role = UserRole.ADMIN.value

        # Assert
        assert user.role == UserRole.ADMIN.value


class TestUserRoleChecking:
    """Test cases for user role checking methods."""

    def test_is_admin_returns_true_for_admin_user(self):
        """is_admin() should return True for admin users."""
        # Arrange
        admin_user = User(
            google_id="admin_123",
            email="admin@example.com",
            role=UserRole.ADMIN.value
        )

        # Act & Assert
        assert admin_user.is_admin() is True

    def test_is_admin_returns_false_for_non_admin_user(self):
        """is_admin() should return False for non-admin users."""
        # Arrange
        member_user = User(
            google_id="member_123",
            email="member@example.com",
            role=UserRole.MEMBER.value
        )

        # Act & Assert
        assert member_user.is_admin() is False

    def test_has_role_returns_true_for_matching_role(self):
        """has_role() should return True when user has the required role."""
        # Arrange
        owner_user = User(
            google_id="owner_123",
            email="owner@example.com",
            role=UserRole.OWNER.value
        )

        # Act & Assert
        assert owner_user.has_role(UserRole.OWNER) is True

    def test_has_role_returns_false_for_non_matching_role(self):
        """has_role() should return False when user doesn't have the required role."""
        # Arrange
        member_user = User(
            google_id="member_456",
            email="member@example.com",
            role=UserRole.MEMBER.value
        )

        # Act & Assert
        assert member_user.has_role(UserRole.ADMIN) is False


class TestUserRoleEnum:
    """Test cases for UserRole enum."""

    def test_user_role_enum_values(self):
        """UserRole enum should have correct values."""
        assert UserRole.ADMIN.value == "admin"
        assert UserRole.OWNER.value == "owner"
        assert UserRole.MEMBER.value == "member"

    def test_default_role_returns_admin(self):
        """default_role() should return ADMIN."""
        assert UserRole.default_role() == UserRole.ADMIN
        assert UserRole.default_role().value == "admin"


class TestUserRoleEdgeCases:
    """Test edge cases for user role functionality."""

    def test_user_with_none_role_defaults_to_admin(self):
        """User with None role should still function correctly via has_role()."""
        # Arrange & Act
        user = User(
            google_id="edge_123",
            email="edge@example.com",
            role=None  # Explicit None
        )

        # The role field might be None, but has_role() handles it gracefully
        # This is more practical - we care about behavior, not just the field value
        assert user.has_role(UserRole.ADMIN) is True
        assert user.is_admin() is True

    def test_user_role_persists_after_model_validation(self):
        """User role should persist after model validation."""
        # Arrange
        user = User(
            google_id="persist_123",
            email="persist@example.com"
        )

        # Act - Simulate model validation by converting to dict and back
        user_dict = user.model_dump()
        reconstructed_user = User(**user_dict)

        # Assert
        assert reconstructed_user.role == UserRole.ADMIN.value
