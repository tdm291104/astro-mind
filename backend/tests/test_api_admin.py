"""Integration tests for /admin/* endpoints."""
import pytest
from fastapi.testclient import TestClient


ADMIN_EMAIL = "admin@astromind.local.dev"
ADMIN_PASSWORD = "adminpass123"
REGULAR_EMAIL = "regular@example.com"
REGULAR_PASSWORD = "password123"


@pytest.fixture
def client(env_anthropic_key, tmp_path, monkeypatch):
    """App with admin credentials seeded via env vars."""
    monkeypatch.setenv("ADMIN_EMAIL", ADMIN_EMAIL)
    monkeypatch.setenv("ADMIN_PASSWORD", ADMIN_PASSWORD)
    from api.app import app
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture
def admin_client(client):
    """Client logged in as admin — admin seeded by lifespan."""
    client.post("/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    return client


def _create_regular_user(client) -> str:
    """Register a regular user; re-login admin to restore cookie. Returns user id."""
    r = client.post("/auth/register", json={
        "email": REGULAR_EMAIL,
        "password": REGULAR_PASSWORD,
        "display_name": "Regular User",
    })
    assert r.status_code == 200
    uid = r.json()["id"]
    # register sets the new user's cookie — restore admin cookie
    client.post("/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    return uid


# ---------- tests ----------

def test_admin_list_users_requires_admin(client):
    """A regular user cannot access admin endpoints."""
    client.post("/auth/register", json={
        "email": REGULAR_EMAIL, "password": REGULAR_PASSWORD, "display_name": "Regular",
    })
    # After register, cookie is regular user's — try admin endpoint
    r = client.get("/admin/users")
    assert r.status_code == 403


def test_admin_list_users(admin_client):
    r = admin_client.get("/admin/users")
    assert r.status_code == 200
    data = r.json()
    assert "users" in data
    assert len(data["users"]) >= 1
    emails = [u["email"] for u in data["users"]]
    assert ADMIN_EMAIL in emails


def test_admin_update_user_plan(admin_client):
    regular_id = _create_regular_user(admin_client)
    r = admin_client.patch(f"/admin/users/{regular_id}", json={"plan": "pro"})
    assert r.status_code == 200
    assert r.json()["plan"] == "pro"


def test_admin_ban_user(admin_client):
    regular_id = _create_regular_user(admin_client)
    r = admin_client.patch(f"/admin/users/{regular_id}", json={"status": "banned"})
    assert r.status_code == 200
    assert r.json()["status"] == "banned"


def test_admin_banned_user_cannot_login(admin_client):
    regular_id = _create_regular_user(admin_client)
    # Ban the user
    admin_client.patch(f"/admin/users/{regular_id}", json={"status": "banned"})
    # Try to login as banned user — admin cookie overwritten, then check status
    r = admin_client.post("/auth/login", json={"email": REGULAR_EMAIL, "password": REGULAR_PASSWORD})
    assert r.status_code == 403


def test_sources_list_requires_auth(client):
    r = client.get("/sources")
    assert r.status_code == 401


def test_sources_list_for_user(client):
    client.post("/auth/register", json={
        "email": REGULAR_EMAIL, "password": REGULAR_PASSWORD, "display_name": "Regular",
    })
    r = client.get("/sources")
    assert r.status_code == 200
    data = r.json()
    assert "sources" in data


def test_source_toggle_requires_admin(client):
    client.post("/auth/register", json={
        "email": REGULAR_EMAIL, "password": REGULAR_PASSWORD, "display_name": "Regular",
    })
    r = client.patch("/admin/sources/arxiv", json={"enabled": False})
    assert r.status_code == 403


def test_source_toggle_by_admin(admin_client):
    # Disable arxiv
    r = admin_client.patch("/admin/sources/arxiv", json={"enabled": False})
    assert r.status_code == 200
    assert r.json()["enabled"] is False

    # Re-enable
    r2 = admin_client.patch("/admin/sources/arxiv", json={"enabled": True})
    assert r2.status_code == 200
    assert r2.json()["enabled"] is True


def test_admin_overview(admin_client):
    r = admin_client.get("/admin/overview")
    assert r.status_code == 200
    data = r.json()
    assert "kpis" in data
    assert "total_users" in data["kpis"]


def test_admin_cannot_ban_self(admin_client):
    """Admin cannot ban their own account."""
    me = admin_client.get("/auth/me").json()
    r = admin_client.patch(f"/admin/users/{me['id']}", json={"status": "banned"})
    assert r.status_code == 400


def test_admin_reset_password(admin_client):
    regular_id = _create_regular_user(admin_client)
    r = admin_client.post(f"/admin/users/{regular_id}/reset-password", json={
        "new_password": "newpass999",
    })
    assert r.status_code == 200
    assert r.json()["ok"] is True

    # Verify new password works
    r2 = admin_client.post("/auth/login", json={
        "email": REGULAR_EMAIL,
        "password": "newpass999",
    })
    assert r2.status_code == 200
