"""Integration tests for /auth/* endpoints."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(env_anthropic_key, tmp_path):
    """TestClient wired to a fresh app + isolated SQLite DB in tmp_path."""
    # env_anthropic_key already set ANTHROPIC_API_KEY and JWT_SECRET,
    # and chdir'd to tmp_path so Settings() picks up data_dir=./data by default.
    from api.app import app
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# ---------- helpers ----------

def _register(client, email="user@example.com", password="testpass1", name="Test User"):
    return client.post("/auth/register", json={
        "email": email,
        "password": password,
        "display_name": name,
    })


def _login(client, email="user@example.com", password="testpass1"):
    return client.post("/auth/login", json={"email": email, "password": password})


# ---------- tests ----------

def test_register_new_user(client):
    r = _register(client)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "user@example.com"
    assert data["role"] == "user"
    assert data["plan"] == "free"
    assert "id" in data


def test_register_duplicate_email(client):
    _register(client)
    r = _register(client)  # same email
    assert r.status_code == 409


def test_login_valid(client):
    _register(client)
    r = _login(client)
    assert r.status_code == 200
    # JWT cookie should be set
    assert "am_session" in r.cookies


def test_login_invalid_password(client):
    _register(client)
    r = _login(client, password="wrongpassword")
    assert r.status_code == 401


def test_logout(client):
    _register(client)
    _login(client)
    r = client.post("/auth/logout")
    assert r.status_code == 200
    # Cookie should be deleted (empty value or not present)
    cookie_val = r.cookies.get("am_session", "")
    assert cookie_val == "" or "am_session" not in r.cookies


def test_me_requires_auth(client):
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_me_returns_user(client):
    _register(client, email="me@example.com")
    _login(client, email="me@example.com")
    r = client.get("/auth/me")
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "me@example.com"
    assert data["role"] == "user"
    assert data["plan"] == "free"


def test_change_password_valid(client):
    _register(client, password="oldpassword")
    _login(client, password="oldpassword")
    r = client.post("/auth/change-password", json={
        "current_password": "oldpassword",
        "new_password": "newpassword123",
    })
    assert r.status_code == 200
    # Can log in with new password
    r2 = _login(client, password="newpassword123")
    assert r2.status_code == 200


def test_change_password_wrong_old(client):
    _register(client, password="realpassword")
    _login(client, password="realpassword")
    r = client.post("/auth/change-password", json={
        "current_password": "wrongpassword",
        "new_password": "newpassword123",
    })
    assert r.status_code == 400


def test_register_short_password_rejected(client):
    r = client.post("/auth/register", json={
        "email": "short@example.com",
        "password": "abc",  # < 8 chars
        "display_name": "Short",
    })
    assert r.status_code == 422


def test_login_cookie_is_httponly(client):
    """Set-Cookie header must include HttpOnly flag."""
    _register(client)
    r = _login(client)
    set_cookie = r.headers.get("set-cookie", "")
    assert "httponly" in set_cookie.lower()
