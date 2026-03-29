from __future__ import annotations

import logging

from fastapi import FastAPI

from app.api.routes import router
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

settings = get_settings()

app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    summary="Local API service for extracting transparent audio and speech delivery metrics.",
    docs_url="/docs",
    redoc_url="/redoc",
)
app.include_router(router)

