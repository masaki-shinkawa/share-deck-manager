from fastapi import APIRouter
from app.api.v1.endpoints import users, decks

api_router = APIRouter()

@api_router.get("/")
def read_root():
    return {"message": "Hello World from API Router"}

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(decks.router, prefix="/decks", tags=["decks"])
