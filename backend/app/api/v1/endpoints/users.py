from fastapi import APIRouter, Depends
from app.core.security import verify_token

router = APIRouter()

@router.get("/me")
def read_users_me(payload: dict = Depends(verify_token)):
    return {
        "message": "You are authenticated",
        "user_info": payload
    }
