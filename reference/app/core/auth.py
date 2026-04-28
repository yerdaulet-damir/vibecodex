from __future__ import annotations

from fastapi import Header, HTTPException, status

from app.core.context import user_id_ctx


async def get_current_user_id(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> str:
    """Trivial auth shim for the reference implementation.

    Real apps swap in JWT/OAuth here without changing routers — that's why
    auth lives in `core/` (Principle 3, Structural).
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-User-Id header.",
        )
    user_id_ctx.set(x_user_id)
    return x_user_id
