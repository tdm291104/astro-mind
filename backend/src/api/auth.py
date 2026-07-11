# src/api/auth.py
import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from auth.accounts import User, to_public_dict, user_from_row
from auth.security import TokenError, create_token, decode_token, hash_password, verify_password
from core.config import Settings
from core.models import new_uuid
from persistence.store import MetaStore

COOKIE_NAME = "am_session"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    display_name: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class ChangePasswordBody(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=72)


_UNCONFIGURED = "Dịch vụ chưa được cấu hình (thiếu ANTHROPIC_API_KEY)."


def _store(request: Request) -> MetaStore:
    store = getattr(request.app.state, "store", None)
    if store is None:
        raise HTTPException(status_code=503, detail=_UNCONFIGURED)
    return store


def _settings(request: Request) -> Settings:
    settings = getattr(request.app.state, "settings", None)
    if settings is None:
        raise HTTPException(status_code=503, detail=_UNCONFIGURED)
    return settings


def require_jwt_secret(settings: Settings) -> str:
    if not settings.jwt_secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET missing in environment")
    if len(settings.jwt_secret) < 32:
        raise HTTPException(status_code=500, detail="JWT_SECRET too short (need ≥32 characters)")
    return settings.jwt_secret


def _set_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        COOKIE_NAME, token, httponly=True, samesite="lax",
        secure=settings.cookie_secure, max_age=settings.jwt_expire_days * 86400, path="/",
    )


def get_current_user(request: Request) -> User:
    settings = _settings(request)
    secret = require_jwt_secret(settings)
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
    try:
        user_id = decode_token(token, secret=secret)
    except TokenError as e:
        raise HTTPException(status_code=401, detail="Phiên không hợp lệ") from e
    row = _store(request).get_user_by_id(user_id)
    if row is None:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại")
    if row.status == "banned":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khoá")
    return user_from_row(row)


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Yêu cầu quyền quản trị")
    return user


def _oauth_error(settings: Settings, error: str):
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{settings.frontend_url}/login?error={error}", status_code=302)


def _upsert_oauth_user(store: MetaStore, email: str, display_name: str) -> str:
    row = store.get_user_by_email(email)
    if row is not None:
        return row.id
    uid = new_uuid()
    store.create_user(id=uid, email=email, password_hash="", display_name=display_name, role="user", plan="free")
    return uid


def build_auth_router() -> APIRouter:
    router = APIRouter(prefix="/auth", tags=["auth"])

    @router.post("/register")
    def register(req: RegisterRequest, request: Request, response: Response) -> dict:
        store, settings = _store(request), _settings(request)
        secret = require_jwt_secret(settings)
        if store.get_user_by_email(req.email) is not None:
            raise HTTPException(status_code=409, detail="Email đã được đăng ký")
        uid = new_uuid()
        store.create_user(
            id=uid, email=req.email, password_hash=hash_password(req.password),
            display_name=req.display_name, role="user", plan="free",
        )
        store.update_last_login(uid, datetime.now(UTC))
        token = create_token(uid, secret=secret, expire_days=settings.jwt_expire_days)
        _set_cookie(response, token, settings)
        return to_public_dict(user_from_row(store.get_user_by_id(uid)))

    @router.post("/login")
    def login(req: LoginRequest, request: Request, response: Response) -> dict:
        store, settings = _store(request), _settings(request)
        secret = require_jwt_secret(settings)
        row = store.get_user_by_email(req.email)
        if row is None or not row.password_hash or not verify_password(req.password, row.password_hash):
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
        if row.status == "banned":
            raise HTTPException(status_code=403, detail="Tài khoản đã bị khoá")
        store.update_last_login(row.id, datetime.now(UTC))
        token = create_token(row.id, secret=secret, expire_days=settings.jwt_expire_days)
        _set_cookie(response, token, settings)
        return to_public_dict(user_from_row(row))

    @router.post("/logout")
    def logout(response: Response) -> dict:
        response.delete_cookie(COOKIE_NAME, path="/")
        return {"ok": True}

    @router.get("/me")
    def me(user: User = Depends(get_current_user)) -> dict:
        return to_public_dict(user)

    @router.post("/change-password")
    def change_password(
        body: ChangePasswordBody,
        request: Request,
        user: User = Depends(get_current_user),
    ) -> dict:
        store = _store(request)
        row = store.get_user_by_id(user.id)
        if row is None or not verify_password(body.current_password, row.password_hash):
            raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
        store.update_password_hash(user.id, hash_password(body.new_password))
        return {"ok": True}

    @router.get("/google")
    async def google_login(request: Request):
        settings = _settings(request)
        if not settings.google_client_id:
            return _oauth_error(settings, "oauth_not_configured")
        state = secrets.token_urlsafe(16)
        redirect_uri = f"{settings.frontend_url}/api/auth/google/callback"
        params = {
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
        }
        from urllib.parse import urlencode
        from fastapi.responses import RedirectResponse
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
        response = RedirectResponse(url=url, status_code=302)
        response.set_cookie("oauth_state", state, httponly=True, samesite="lax", max_age=600, path="/")
        return response

    @router.get("/google/callback")
    async def google_callback(request: Request, response: Response, code: str = "", state: str = "", error: str = ""):
        settings = _settings(request)
        store = _store(request)
        secret = require_jwt_secret(settings)
        if error or not code:
            return _oauth_error(settings, "google_denied")
        stored_state = request.cookies.get("oauth_state")
        if not stored_state or stored_state != state:
            err = _oauth_error(settings, "oauth_state_mismatch")
            err.delete_cookie("oauth_state", path="/")
            return err
        import httpx
        from fastapi.responses import RedirectResponse
        token_data = {
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": f"{settings.frontend_url}/api/auth/google/callback",
            "grant_type": "authorization_code",
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            token_resp = await client.post("https://oauth2.googleapis.com/token", data=token_data)
            if token_resp.status_code != 200:
                return _oauth_error(settings, "google_token_failed")
            access_token = token_resp.json().get("access_token")
            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_resp.status_code != 200:
                return _oauth_error(settings, "google_userinfo_failed")
            userinfo = userinfo_resp.json()
        email = userinfo.get("email", "").lower().strip()
        name = userinfo.get("name") or userinfo.get("given_name") or email.split("@")[0]
        if not email:
            return _oauth_error(settings, "google_no_email")
        user_id = _upsert_oauth_user(store, email, name)
        store.update_last_login(user_id, datetime.now(UTC))
        token = create_token(user_id, secret=secret, expire_days=settings.jwt_expire_days)
        redirect = RedirectResponse(url=f"{settings.frontend_url}/chat", status_code=302)
        _set_cookie(redirect, token, settings)
        redirect.delete_cookie("oauth_state", path="/")
        return redirect

    @router.get("/github")
    async def github_login(request: Request):
        settings = _settings(request)
        if not settings.github_client_id:
            return _oauth_error(settings, "oauth_not_configured")
        state = secrets.token_urlsafe(16)
        redirect_uri = f"{settings.frontend_url}/api/auth/github/callback"
        from urllib.parse import urlencode
        from fastapi.responses import RedirectResponse
        params = {
            "client_id": settings.github_client_id,
            "redirect_uri": redirect_uri,
            "scope": "user:email",
            "state": state,
        }
        url = "https://github.com/login/oauth/authorize?" + urlencode(params)
        resp = RedirectResponse(url=url, status_code=302)
        resp.set_cookie("oauth_state", state, httponly=True, samesite="lax", max_age=600, path="/")
        return resp

    @router.get("/github/callback")
    async def github_callback(request: Request, response: Response, code: str = "", state: str = "", error: str = ""):
        settings = _settings(request)
        store = _store(request)
        secret = require_jwt_secret(settings)
        if error or not code:
            return _oauth_error(settings, "github_denied")
        stored_state = request.cookies.get("oauth_state")
        if not stored_state or stored_state != state:
            err = _oauth_error(settings, "oauth_state_mismatch")
            err.delete_cookie("oauth_state", path="/")
            return err
        import httpx
        from fastapi.responses import RedirectResponse
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={"client_id": settings.github_client_id, "client_secret": settings.github_client_secret,
                      "code": code, "redirect_uri": f"{settings.frontend_url}/api/auth/github/callback"},
                headers={"Accept": "application/json"},
            )
            if token_resp.status_code != 200:
                return _oauth_error(settings, "github_token_failed")
            access_token = token_resp.json().get("access_token")
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
            )
            user_data = user_resp.json()
            email = user_data.get("email") or ""
            name = user_data.get("name") or user_data.get("login") or ""
            if not email:
                emails_resp = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
                )
                for e in emails_resp.json():
                    if isinstance(e, dict) and e.get("primary") and e.get("verified"):
                        email = e["email"]; break
        email = email.lower().strip()
        if not email:
            return _oauth_error(settings, "github_no_email")
        user_id = _upsert_oauth_user(store, email, name or email.split("@")[0])
        store.update_last_login(user_id, datetime.now(UTC))
        token = create_token(user_id, secret=secret, expire_days=settings.jwt_expire_days)
        redirect = RedirectResponse(url=f"{settings.frontend_url}/chat", status_code=302)
        _set_cookie(redirect, token, settings)
        redirect.delete_cookie("oauth_state", path="/")
        return redirect

    return router
