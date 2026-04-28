from __future__ import annotations

from fastapi import Depends

from app.repositories import CreditsRepoProtocol, get_credits_repo
from app.services.credits.admin import CreditsAdminService
from app.services.credits.user import CreditsUserService

# Backward-compatible alias for callers that imported the older flat name.
CreditsService = CreditsUserService


def get_credits_user_service(
    repo: CreditsRepoProtocol = Depends(get_credits_repo),
) -> CreditsUserService:
    return CreditsUserService(repo=repo)


def get_credits_admin_service(
    repo: CreditsRepoProtocol = Depends(get_credits_repo),
) -> CreditsAdminService:
    return CreditsAdminService(repo=repo)


__all__ = [
    "CreditsAdminService",
    "CreditsService",
    "CreditsUserService",
    "get_credits_admin_service",
    "get_credits_user_service",
]
