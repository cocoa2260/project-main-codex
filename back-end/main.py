from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.logging_config import get_logger, setup_logging

from routers import auth
from routers import documents
from routers import common_codes
from routers import admin
from routers import users


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
app.include_router(
    common_codes.router,
    prefix="/api/common-codes",
    tags=["common-codes"],
)
app.include_router(
    admin.router,
    prefix="/api/admin",
    tags=["admin"],
)
app.include_router(
    users.router,
    prefix="/api/users",
    tags=["users"],
)
