from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user
from app.core.security import verify_token
from app.db.session import get_session
from app.models.user import User
from app.schemas.user import UserPublic, UserUpdate

router = APIRouter()

@router.post("/sync", response_model=User)
async def sync_user(
    payload: dict = Depends(verify_token),
    session: AsyncSession = Depends(get_session)
):
    google_id = payload.get("sub")
    email = payload.get("email")
    image = payload.get("picture")

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Invalid token payload")

    statement = select(User).where(User.google_id == google_id)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if not user:
        user = User(google_id=google_id, email=email, image=image)
        session.add(user)
        await session.commit()
        await session.refresh(user)
    else:
        # Update image if changed
        if user.image != image:
            user.image = image
            session.add(user)
            await session.commit()
            await session.refresh(user)

    return user

@router.get("/me", response_model=UserPublic)
async def read_users_me(
    user: User = Depends(get_current_user)
):
    return user

@router.put("/me", response_model=User)
async def update_user_me(
    user_update: UserUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update user profile - only nickname can be changed"""
    if user_update.nickname is not None:
        user.nickname = user_update.nickname

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

