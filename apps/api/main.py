from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.config import get_settings
from apps.api.logging_conf import configure_logging
from apps.api.routers import document_intelligence, health, observability, workflows

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(get_settings().log_level)
    log.info("api_starting")
    yield
    log.info("api_stopping")


app = FastAPI(title="Workflow Coordination Engine", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(document_intelligence.router, prefix="/document-intelligence", tags=["document-intelligence"])
app.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
app.include_router(observability.router, prefix="/observability", tags=["observability"])
