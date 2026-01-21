"""
FastAPI dependencies for the application.
"""
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import verify_token
from app.db.session import get_session
from app.models.user import User


async def get_current_user(
    payload: dict = Depends(verify_token),
    session: AsyncSession = Depends(get_session)
) -> User:
    """
    Dependency to get the current authenticated user.

    This replaces the repetitive user lookup code across endpoints.

    Args:
        payload: JWT payload from verify_token
        session: Database session

    Returns:
        User: The authenticated user object

    Raises:
        HTTPException: 404 if user not found
    """
    google_id = payload.get("sub")

    if not google_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing subject")

    result = await session.execute(
        select(User).where(User.google_id == google_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
