import os
from dotenv import load_dotenv
from jose import jwt

load_dotenv()

# トークンの一部（ログから取得）
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiRGV2IFVzZXIiLCJlbWFpbCI6ImRldkBleGFtcGxlLmNvbSIsInN1YiI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSIsImlhdCI6MTc2NDMyMzE5MH0.R2qSP-MkX250f"

SECRET_KEY = os.getenv("NEXTAUTH_SECRET", "dummy_secret_for_dev")
print(f"SECRET_KEY from .env: {SECRET_KEY}")
print(f"Token (partial): {token[:50]}...")

try:
    # Decode the token
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    print(f"Success! Decoded payload: {payload}")
except Exception as e:
    print(f"Error decoding token: {e}")
    print(f"Error type: {type(e)}")
