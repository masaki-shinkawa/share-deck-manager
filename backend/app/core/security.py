from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests
import os
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"

def get_google_public_key(kid: str):
    """Get Google's public key for token verification"""
    response = requests.get(GOOGLE_CERTS_URL)
    certs = response.json()
    for cert in certs["keys"]:
        if cert["kid"] == kid:
            return cert
    return None

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify token - supports both Google ID tokens (RS256) and NextAuth JWT (HS256)"""
    token = credentials.credentials

    # Try Google ID token first (RS256)
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        alg = unverified_header.get("alg")

        if kid and alg == "RS256":
            # This is a Google ID token
            public_key = get_google_public_key(kid)
            if public_key:
                payload = jwt.decode(
                    token,
                    public_key,
                    algorithms=["RS256"],
                    audience=GOOGLE_CLIENT_ID,
                    options={"verify_at_hash": False}
                )
                return payload
    except:
        pass  # Not a Google token, try NextAuth JWT

    # Try NextAuth JWT (HS256)
    try:
        payload = jwt.decode(
            token,
            NEXTAUTH_SECRET,
            algorithms=["HS256"],
        )

        # Ensure consistent payload structure
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

        return {
            "sub": user_id,
            "email": payload.get("email"),
            "picture": payload.get("picture"),
            **payload
        }
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
