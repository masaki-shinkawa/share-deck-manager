from enum import Enum

class UserRole(str, Enum):
    """
    User role enumeration.

    - ADMIN: System administrator with full access
    - OWNER: Group owner (future implementation)
    - MEMBER: Group member (future implementation)
    """
    ADMIN = "admin"
    OWNER = "owner"  # For future group ownership
    MEMBER = "member"  # For future group membership

    @classmethod
    def default_role(cls) -> "UserRole":
        """Return the default role for new users."""
        return cls.ADMIN
