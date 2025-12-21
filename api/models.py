from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship

class UserBase(SQLModel):
    name: Optional[str] = None
    email: Optional[str] = Field(unique=True, index=True)
    email_verified: Optional[datetime] = None
    image: Optional[str] = None
    is_admin: bool = Field(default=False)

class User(UserBase, table=True):
    __tablename__ = "users"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Relationships
    group_memberships: List["GroupMember"] = Relationship(back_populates="user")
    accounts: List["Account"] = Relationship(back_populates="user")
    decks: List["Deck"] = Relationship(back_populates="creator")

class GroupBase(SQLModel):
    name: str
    description: Optional[str] = None

class Group(GroupBase, table=True):
    __tablename__ = "groups"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Relationships
    members: List["GroupMember"] = Relationship(back_populates="group")
    decks: List["Deck"] = Relationship(back_populates="group")

class GroupMember(SQLModel, table=True):
    __tablename__ = "group_members"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    group_id: UUID = Field(foreign_key="groups.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    role: str = Field(default="member") # owner, member
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Relationships
    group: Group = Relationship(back_populates="members")
    user: User = Relationship(back_populates="group_memberships")

class DeckBase(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    recipe_url: Optional[str] = None

class Deck(DeckBase, table=True):
    __tablename__ = "decks"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    group_id: UUID = Field(foreign_key="groups.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Relationships
    group: Group = Relationship(back_populates="decks")
    creator: User = Relationship(back_populates="decks")

class DeckUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    recipe_url: Optional[str] = None

class Account(SQLModel, table=True):
    __tablename__ = "accounts"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    type: str
    provider: str
    provider_account_id: str
    refresh_token: Optional[str] = None
    access_token: Optional[str] = None
    expires_at: Optional[int] = None
    token_type: Optional[str] = None
    scope: Optional[str] = None
    id_token: Optional[str] = None
    session_state: Optional[str] = None
    
    user: User = Relationship(back_populates="accounts")
