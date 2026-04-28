from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    model_id: str = Field(default="default-image-v1")
    width: int = Field(default=1024, ge=256, le=2048)
    height: int = Field(default=1024, ge=256, le=2048)


class VideoGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    model_id: str = Field(default="default-video-v1")
    duration_seconds: int = Field(default=4, ge=1, le=30)


class TextGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=8000)
    model_id: str = Field(default="default-text-v1")
    max_tokens: int = Field(default=1024, ge=1, le=8192)


class TaskResponse(BaseModel):
    task_id: str
    status: Literal["queued", "processing", "done", "failed"]
    result_url: str | None = None
