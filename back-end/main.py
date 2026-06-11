from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.logging_config import get_logger, setup_logging

from routers import auth
from routers import documents


setup_logging()
logger = get_logger(__name__)
logger.info("FastAPI application starting")

app = FastAPI(
    title="AI Document Automation Platform"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["auth"],
)

app.include_router(
    documents.router,
    prefix="/api/documents",
    tags=["documents"],
)