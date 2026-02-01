from fastapi import APIRouter
from app.api.v1.endpoints import (
    users,
    decks,
    cards,
    admin,
    custom_cards,
    stores,
    purchase_lists,
    purchase_items,
    purchase_allocations,
    prices,
)

api_router = APIRouter()

@api_router.get("/")
def read_root():
    return {"message": "Hello World from API Router"}

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(decks.router, prefix="/decks", tags=["decks"])
api_router.include_router(cards.router, prefix="/cards", tags=["cards"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(custom_cards.router, prefix="/custom-cards", tags=["custom-cards"])

# Purchase management endpoints
api_router.include_router(stores.router, prefix="/stores", tags=["stores"])
api_router.include_router(purchase_lists.router, prefix="/purchases", tags=["purchases"])
api_router.include_router(purchase_items.router, prefix="/purchases", tags=["purchase-items"])
api_router.include_router(purchase_allocations.router, prefix="/purchases", tags=["purchase-allocations"])
api_router.include_router(prices.router, prefix="/purchases/items", tags=["prices"])
