from __future__ import annotations

from fastapi import APIRouter

from app.routers.generate.image import router as image_router
from app.routers.generate.text import router as text_router
from app.routers.generate.video import router as video_router

# Principle A1: folder-instead-of-file. Each modality is isolated.
# main.py includes this single router — callers never change.
router = APIRouter(prefix="/generate", tags=["generate"])
router.include_router(image_router)
router.include_router(video_router)
router.include_router(text_router)
