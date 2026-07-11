# src/auth/security.py
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except ValueError:
        return False


class TokenError(Exception):
    """Token missing, malformed, expired, or signature mismatch."""


def create_token(user_id: str, *, secret: str, expire_days: int) -> str:
    now = datetime.now(UTC)
    payload = {"sub": user_id, "iat": now, "exp": now + timedelta(days=expire_days)}
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str, *, secret: str) -> str:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError as e:
        raise TokenError(str(e)) from e
    sub = payload.get("sub")
    if not sub:
        raise TokenError("token missing subject")
    return sub
