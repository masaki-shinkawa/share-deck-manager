from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests
import os
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"

def get_google_public_key(kid: str):
    response = requests.get(GOOGLE_CERTS_URL)
    certs = response.json()
    for cert in certs["keys"]:
        if cert["kid"] == kid:
            return cert
    return None

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Decode without verification first to get the key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        if not kid:
             raise HTTPException(status_code=401, detail="Invalid token header")

        public_key = get_google_public_key(kid)
        if not public_key:
             raise HTTPException(status_code=401, detail="Invalid token key ID")

        # Verify the token
        # Note: In a real app, you should cache the public keys
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=GOOGLE_CLIENT_ID,
            options={"verify_at_hash": False} # Use defaults mostly
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
