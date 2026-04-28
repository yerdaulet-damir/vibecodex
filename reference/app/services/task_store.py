from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

JobStatus = Literal["pending", "running", "done", "failed"]


@dataclass(slots=True)
class JobRecord:
    id: str
    user_id: str
    format: str
    status: JobStatus
    created_at: datetime
    updated_at: datetime
    result: dict | None = None
    error: str | None = None


@dataclass(slots=True)
class JobStore:
    jobs: dict[str, JobRecord] = field(default_factory=dict)
    idempotency: dict[str, str] = field(default_factory=dict)  # key → job_id
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


_store = JobStore()


async def create_job(
    user_id: str, format: str, idempotency_key: str
) -> tuple[JobRecord, bool]:
    """Returns (job, created). created=False means idempotent replay."""
    async with _store.lock:
        existing_id = _store.idempotency.get(idempotency_key)
        if existing_id and existing_id in _store.jobs:
            return _store.jobs[existing_id], False

        now = datetime.now(timezone.utc)
        job = JobRecord(
            id=str(uuid.uuid4()),
            user_id=user_id,
            format=format,
            status="pending",
            created_at=now,
            updated_at=now,
        )
        _store.jobs[job.id] = job
        _store.idempotency[idempotency_key] = job.id
        return job, True


async def update_job(
    job_id: str,
    *,
    status: JobStatus,
    result: dict | None = None,
    error: str | None = None,
) -> None:
    async with _store.lock:
        job = _store.jobs.get(job_id)
        if job is None:
            return
        job.status = status
        job.result = result
        job.error = error
        job.updated_at = datetime.now(timezone.utc)


async def get_job(job_id: str, user_id: str) -> JobRecord | None:
    job = _store.jobs.get(job_id)
    if job is None or job.user_id != user_id:
        return None
    return job


async def list_jobs(user_id: str, limit: int = 50) -> list[JobRecord]:
    rows = [j for j in _store.jobs.values() if j.user_id == user_id]
    rows.sort(key=lambda j: j.created_at, reverse=True)
    return rows[:limit]
