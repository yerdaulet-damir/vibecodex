from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user_id
from app.routers.generate._dispatch import dispatch_job
from app.schemas.generate import TaskResponse, VideoGenerateRequest
from app.services.credits import get_credits_user_service
from app.services.credits.user import CreditsUserService

router = APIRouter()


@router.post("/video", response_model=TaskResponse, status_code=202)
async def generate_video(
    body: VideoGenerateRequest,
    user_id: str = Depends(get_current_user_id),
    credits: CreditsUserService = Depends(get_credits_user_service),
) -> TaskResponse:
    return await dispatch_job(
        user_id=user_id,
        modality="video",
        prompt=body.prompt,
        model_id=body.model_id,
        params={"duration_seconds": body.duration_seconds},
        credits=credits,
    )
