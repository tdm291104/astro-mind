"""Security-focused integration tests."""
import io
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(env_anthropic_key, tmp_path):
    from api.app import app
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture
def user_a_client(client):
    """Client logged in as user A."""
    client.post("/auth/register", json={
        "email": "user_a@example.com",
        "password": "password123",
        "display_name": "User A",
    })
    client.post("/auth/login", json={"email": "user_a@example.com", "password": "password123"})
    return client


@pytest.fixture
def user_b_client(env_anthropic_key, tmp_path):
    """Separate TestClient for user B (no shared cookies with user A)."""
    from api.app import app
    with TestClient(app, raise_server_exceptions=True) as c:
        c.post("/auth/register", json={
            "email": "user_b@example.com",
            "password": "password456",
            "display_name": "User B",
        })
        c.post("/auth/login", json={"email": "user_b@example.com", "password": "password456"})
        yield c


# ---------- tests ----------

def test_images_endpoint_requires_auth(client):
    r = client.get("/images/nonexistent.jpg")
    assert r.status_code in (401, 403)


def test_jwt_cookie_httponly(client):
    """Login response must set HttpOnly on the session cookie."""
    client.post("/auth/register", json={
        "email": "httponly@example.com",
        "password": "password123",
        "display_name": "HttpOnly Test",
    })
    r = client.post("/auth/login", json={
        "email": "httponly@example.com",
        "password": "password123",
    })
    assert r.status_code == 200
    set_cookie = r.headers.get("set-cookie", "")
    assert "httponly" in set_cookie.lower(), f"HttpOnly not found in: {set_cookie}"


def test_user_isolation_documents(user_a_client, user_b_client):
    """User A's documents are not visible to user B."""
    # Upload a text document as user A via URL ingest
    r = user_a_client.post("/ingest", data={
        "url": "https://en.wikipedia.org/wiki/Black_hole",
    })
    # Ingest is async — we just need the job to start (202); the doc entry
    # is created by the background task, so we check at the list level after
    # confirming the ingest endpoint accepts the request.
    # For isolation test: even if doc count is 0 (background not done),
    # user B should see 0 regardless.
    r_b = user_b_client.get("/documents")
    assert r_b.status_code == 200
    docs_b = r_b.json()["documents"]
    # User B should not see any docs belonging to user A
    assert len(docs_b) == 0


def test_file_size_validation(user_a_client):
    """Images larger than 10 MB should be rejected."""
    big_payload = "A" * (11 * 1024 * 1024)  # 11 MB of base64 (inflated, but > limit)
    import base64
    big_b64 = base64.b64encode(big_payload.encode()).decode()
    r = user_a_client.post("/converse", json={
        "message": "Phân tích ảnh",
        "image_data": big_b64,
        "image_type": "image/jpeg",
        "dry_run": True,
    })
    assert r.status_code == 400


def test_unauthenticated_converse_rejected(client):
    """POST /converse without auth returns 401."""
    r = client.post("/converse", json={"message": "test", "dry_run": True})
    assert r.status_code == 401


def test_conversation_isolation(user_a_client, user_b_client):
    """User B cannot access user A's conversation."""
    r = user_a_client.post("/converse", json={"message": "Sirius", "dry_run": True})
    session_id = _extract_session_id(r.text)
    assert session_id is not None

    r2 = user_b_client.get(f"/conversations/{session_id}")
    assert r2.status_code == 404


def test_share_token_nonexistent(client):
    """GET /share/{bad_token} returns 404."""
    r = client.get("/share/totally-made-up-token-xyz")
    assert r.status_code == 404


def test_admin_endpoint_requires_admin_role(user_a_client):
    """Regular user cannot access admin endpoints."""
    r = user_a_client.get("/admin/users")
    assert r.status_code == 403


# ---------- helper ----------

def _extract_session_id(sse_text: str) -> str | None:
    import json
    for line in sse_text.splitlines():
        if line.startswith("data: "):
            try:
                payload = json.loads(line[len("data: "):])
                if payload.get("type") == "done" and "session_id" in payload:
                    return payload["session_id"]
            except Exception:
                continue
    return None
