# src/auth/accounts.py
from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from persistence.store import MetaStore
    from persistence.vector import VectorStore


@dataclass
class User:
    id: str
    email: str
    display_name: str
    role: str
    plan: str
    status: str


def user_from_row(row) -> User:
    return User(
        id=row.id, email=row.email, display_name=row.display_name,
        role=row.role, plan=row.plan, status=row.status,
    )


def to_public_dict(user: User) -> dict:
    return {
        "id": user.id, "email": user.email, "display_name": user.display_name,
        "role": user.role, "plan": user.plan, "status": user.status,
    }


def seed_admin(
    store: MetaStore, *, email: str, password: str, vector: VectorStore | None = None
) -> User | None:
    """Idempotent: if no users exist and credentials are given, create the admin and
    backfill orphan documents to it. Returns the admin User, or None if skipped."""
    from core.models import new_uuid

    from .security import hash_password

    if not email or not password:
        return None
    existing = store.get_user_by_email(email)
    if existing is not None:
        return user_from_row(existing)
    if store.count_users() > 0:
        return None
    admin_id = new_uuid()
    store.create_user(
        id=admin_id, email=email, password_hash=hash_password(password),
        display_name=email.split("@")[0], role="admin", plan="team",
    )
    backfilled = store.assign_orphan_documents(admin_id)
    if vector is not None:
        for doc_id in backfilled:
            vector.set_doc_user(doc_id, admin_id)
    return user_from_row(store.get_user_by_id(admin_id))
