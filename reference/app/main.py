from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.bulkhead import close_all_clients
from app.core.config import get_settings
from app.core.context import configure_logging
from app.core.database import dispose_engine
from app.core.middleware import RequestContextMiddleware
from app.routers import credits as credits_router
from app.routers import status as status_router
from app.routers.generate import router as generate_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    configure_logging(settings.LOG_LEVEL)
    logger.info("app.startup", extra={"backend": settings.CREDITS_REPO_BACKEND})
    try:
        yield
    finally:
        await close_all_clients()
        await dispose_engine()
        logger.info("app.shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="vibecodex — GenAPI Reference",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.add_middleware(RequestContextMiddleware)

    app.include_router(generate_router)
    app.include_router(status_router.router)
    app.include_router(credits_router.router)
    return app


app = create_app()
