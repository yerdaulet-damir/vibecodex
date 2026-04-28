from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user_id
from app.routers.generate._dispatch import dispatch_job
from app.schemas.generate import TaskResponse, TextGenerateRequest
from app.services.credits import get_credits_user_service
from app.services.credits.user import CreditsUserService

router = APIRouter()


@router.post("/text", response_model=TaskResponse, status_code=202)
async def generate_text(
    body: TextGenerateRequest,
    user_id: str = Depends(get_current_user_id),
    credits: CreditsUserService = Depends(get_credits_user_service),
) -> TaskResponse:
    return await dispatch_job(
        user_id=user_id,
        modality="text",
        prompt=body.prompt,
        model_id=body.model_id,
        params={"max_tokens": body.max_tokens},
        credits=credits,
    )
