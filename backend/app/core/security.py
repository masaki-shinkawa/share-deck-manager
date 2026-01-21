from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET")

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify NextAuth JWT token"""
    token = credentials.credentials
    try:
        # Decode and verify NextAuth JWT token
        payload = jwt.decode(
            token,
            NEXTAUTH_SECRET,
            algorithms=["HS256"],  # NextAuth uses HS256 by default
        )

        # Extract user information from token
        user_id = payload.get("sub")  # NextAuth stores user ID in 'sub' claim
        email = payload.get("email")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

        return {
            "user_id": user_id,
            "email": email,
            **payload
        }
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
