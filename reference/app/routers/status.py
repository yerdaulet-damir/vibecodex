from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user_id
from app.schemas.generate import TaskResponse
from app.services.task_store import task_store

router = APIRouter(prefix="/status", tags=["status"])


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_status(
    task_id: str,
    user_id: str = Depends(get_current_user_id),
) -> TaskResponse:
    task = task_store.get(task_id, user_id=user_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return TaskResponse(
        task_id=task_id,
        status=task["status"],
        result_url=task.get("result_url"),
    )
