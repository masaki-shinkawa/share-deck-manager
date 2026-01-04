from typing import Optional
from sqlmodel import SQLModel

class UserPublic(SQLModel):
    nickname: Optional[str] = None
