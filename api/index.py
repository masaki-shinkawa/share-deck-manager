"""
Vercel Serverless Function handler for FastAPI backend.
This file wraps the FastAPI application for Vercel Python Runtime.
"""
import sys
import os

# Add backend directory to Python path so we can import the FastAPI app
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, backend_path)

from mangum import Mangum
from app.main import app

# Mangum adapter for AWS Lambda/Vercel Serverless
handler = Mangum(app, lifespan="off")
