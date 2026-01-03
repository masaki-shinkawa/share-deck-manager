from fastapi import APIRouter
from app.api.v1.endpoints import users

api_router = APIRouter()

@api_router.get("/")
def read_root():
    return {"message": "Hello World from V1 API"}

api_router.include_router(users.router, prefix="/users", tags=["users"])
