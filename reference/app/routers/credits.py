from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user_id
from app.schemas.credits import BalanceResponse
from app.services.credits import get_credits_user_service
from app.services.credits.user import CreditsUserService

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    user_id: str = Depends(get_current_user_id),
    credits: CreditsUserService = Depends(get_credits_user_service),
) -> BalanceResponse:
    balance = await credits.get_balance(user_id)
    return BalanceResponse(user_id=user_id, balance=balance)
