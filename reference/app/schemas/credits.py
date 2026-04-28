from __future__ import annotations

from decimal import Decimal
from pydantic import BaseModel


class BalanceResponse(BaseModel):
    user_id: str
    balance: Decimal
