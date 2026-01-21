from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1.api import api_router
import os

app = FastAPI(title="Share Deck Manager")

# Mount card images
images_path = os.path.join(os.path.dirname(__file__), "..", "card_images")
if not os.path.exists(images_path):
    os.makedirs(images_path)
app.mount("/images", StaticFiles(directory=images_path), name="images")

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Hello World from App Root"}
