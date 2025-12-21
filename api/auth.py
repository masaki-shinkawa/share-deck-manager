from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
import os
from .database import get_session
from .models import User

# Should match NextAuth secret
SECRET_KEY = os.getenv("NEXTAUTH_SECRET", "dummy_secret_for_dev")
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Validate JWT and return user ID"""
    if not credentials:
        print("DEBUG: No credentials provided!", flush=True)
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    print(f"DEBUG: Received token: {token[:10]}...", flush=True)
    print(f"DEBUG: Secret key loaded: {SECRET_KEY[:3]}...", flush=True)
    try:
        # NextAuth uses HS256 by default for JWT strategy
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"DEBUG: Decoded payload: {payload}", flush=True)
        
        # NextAuth puts user ID in 'sub' or 'id' depending on config
        # We configured it to put userId in token
        user_id: str = payload.get("sub") or payload.get("id") or payload.get("userId")
        
        if user_id is None:
            print("DEBUG: User ID not found in payload", flush=True)
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return user_id
    except JWTError as e:
        print(f"DEBUG: JWT Error: {e}", flush=True)
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_session)
) -> User:
    """Get current user model from DB"""
    from uuid import UUID
    
    # user_idを文字列からUUIDオブジェクトに変換
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID format")
    
    user = session.get(User, user_uuid)
    if not user:
        # In a real scenario, we might want to auto-create the user if they exist in token but not DB
        # (sync issue), but for now raise error
        raise HTTPException(status_code=401, detail="User not found")
    return user
