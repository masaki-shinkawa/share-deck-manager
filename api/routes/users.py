from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
import uuid

from ..database import get_session
from ..models import User, Group, GroupMember
from ..auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

class UserSyncRequest(BaseModel):
    """Google OAuth情報を受け取ってユーザーを同期"""
    google_id: str
    email: str
    name: Optional[str] = None
    image: Optional[str] = None

@router.post("/sync")
async def sync_user(
    user_data: UserSyncRequest,
    session: Session = Depends(get_session)
):
    """
    Google OAuth情報を受け取り、ユーザーを作成または更新
    UUIDを返す
    """
    # Google IDでユーザーを検索（Accountテーブルを参照すべきだが、簡易的にemailで検索）
    statement = select(User).where(User.email == user_data.email)
    existing_user = session.exec(statement).first()
    
    if existing_user:
        # 既存ユーザーを更新
        if user_data.name:
            existing_user.name = user_data.name
        if user_data.image:
            existing_user.image = user_data.image
        session.add(existing_user)
        session.commit()
        session.refresh(existing_user)
        return {"id": str(existing_user.id), "email": existing_user.email}
    
    # 新規ユーザーを作成
    new_user = User(
        id=uuid.uuid4(),
        email=user_data.email,
        name=user_data.name or "User",
        image=user_data.image,
        email_verified=None,
        is_admin=False
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    # デフォルトグループを作成
    default_group = Group(name=f"{new_user.name}'s Workspace")
    session.add(default_group)
    session.commit()
    session.refresh(default_group)
    
    # グループメンバーとして追加
    member = GroupMember(
        group_id=default_group.id,
        user_id=new_user.id,
        role="owner"
    )
    session.add(member)
    session.commit()
    
    return {"id": str(new_user.id), "email": new_user.email}

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info"""
    return current_user
