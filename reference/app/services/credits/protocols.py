"""Re-export the credits repository contract.

Services import from `services.credits.protocols` so the dependency
direction points away from infrastructure (no `from app.repositories...`
in service code).
"""

from app.repositories.protocols import CreditsRepoProtocol, CreditsTransaction

__all__ = ["CreditsRepoProtocol", "CreditsTransaction"]
