from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.v1.api import api_router
from app.core.security import validate_security_config
import os
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    logger.info("Starting Share Deck Manager backend...")
    try:
        validate_security_config()
        logger.info("Security configuration validated successfully")
    except RuntimeError as e:
        logger.error(f"Configuration error: {e}")
        raise
    yield
    # Shutdown
    logger.info("Shutting down Share Deck Manager backend...")

app = FastAPI(title="Share Deck Manager", lifespan=lifespan)

# Note: Image serving removed - now using Cloudflare R2 storage
# Images are served directly from R2 bucket public URL
# If you need to enable local image serving for development, uncomment:
# from fastapi.staticfiles import StaticFiles
# images_path = os.path.join(os.path.dirname(__file__), "..", "card_images")
# if not os.path.exists(images_path):
#     os.makedirs(images_path)
# app.mount("/images", StaticFiles(directory=images_path), name="images")

# CORS configuration - allow origins from environment variable
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
origins = [origin.strip() for origin in allowed_origins]

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
