from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
from .exceptions import APIError
from .routes import groups, decks, users

app = FastAPI(
    title="Share Deck Manager API",
    description="API for managing deck metadata",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "https://share-deck-manager.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse

@app.middleware("http")
async def log_requests(request: Request, call_next):
    # シンプルなログに戻す
    # print(f"DEBUG: Incoming request: {request.method} {request.url}", flush=True)
    response = await call_next(request)
    return response

# Exception handlers
@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail,
        headers=exc.headers
    )

# Include routers
app.include_router(groups.router, prefix="/api")
app.include_router(decks.router, prefix="/api")
app.include_router(users.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
