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
    """Verify Google ID token (RS256)"""
    token = credentials.credentials

    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            raise HTTPException(status_code=401, detail="Invalid token: missing key ID")

        public_key = get_google_public_key(kid)
        if not public_key:
            raise HTTPException(status_code=401, detail="Invalid token: unknown key ID")

        # Verify Google ID token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=GOOGLE_CLIENT_ID,
            options={"verify_at_hash": False}
        )

        return payload

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
