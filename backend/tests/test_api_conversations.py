"""Integration tests for /conversations/* endpoints."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(env_anthropic_key, tmp_path):
    from api.app import app
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture
def auth_client(client):
    """Client that has already registered and logged in as a normal user."""
    client.post("/auth/register", json={
        "email": "conv@example.com",
        "password": "password123",
        "display_name": "Conv User",
    })
    client.post("/auth/login", json={"email": "conv@example.com", "password": "password123"})
    return client


def _converse_dry_run(client, message="Hố đen là gì?", session_id=None):
    body = {"message": message, "dry_run": True}
    if session_id:
        body["session_id"] = session_id
    return client.post("/converse", json=body)


# ---------- tests ----------

def test_list_conversations_empty(auth_client):
    r = auth_client.get("/conversations")
    assert r.status_code == 200
    data = r.json()
    assert data["conversations"] == []


def test_create_conversation_via_converse(auth_client):
    r = _converse_dry_run(auth_client)
    assert r.status_code == 200

    # The done event contains session_id
    text = r.text
    assert "session_id" in text

    # GET /conversations should have 1 item
    r2 = auth_client.get("/conversations")
    assert r2.status_code == 200
    assert len(r2.json()["conversations"]) == 1


def test_rename_conversation(auth_client):
    r = _converse_dry_run(auth_client)
    # Extract session_id from SSE done event
    session_id = _extract_session_id(r.text)
    assert session_id is not None

    r2 = auth_client.patch(f"/conversations/{session_id}", json={"title": "New Title"})
    assert r2.status_code == 200

    r3 = auth_client.get(f"/conversations/{session_id}")
    assert r3.json()["title"] == "New Title"


def test_delete_conversation(auth_client):
    r = _converse_dry_run(auth_client)
    session_id = _extract_session_id(r.text)
    assert session_id is not None

    r2 = auth_client.delete(f"/conversations/{session_id}")
    # delete_conversation returns {"ok": True}, not 204
    assert r2.status_code == 200

    # Should be gone
    r3 = auth_client.get(f"/conversations/{session_id}")
    assert r3.status_code == 404


def test_conversation_requires_auth(client):
    r = client.get("/conversations")
    assert r.status_code == 401


def test_share_token_created(auth_client):
    r = _converse_dry_run(auth_client)
    session_id = _extract_session_id(r.text)
    assert session_id is not None

    r2 = auth_client.post(f"/conversations/{session_id}/share")
    assert r2.status_code == 200
    data = r2.json()
    assert "token" in data
    assert len(data["token"]) > 10


def test_share_read_no_auth(client, auth_client):
    """Public share endpoint requires no auth cookie."""
    r = _converse_dry_run(auth_client)
    session_id = _extract_session_id(r.text)
    share_r = auth_client.post(f"/conversations/{session_id}/share")
    token = share_r.json()["token"]

    # Use a fresh client (no cookie)
    r2 = client.get(f"/share/{token}")
    assert r2.status_code == 200
    data = r2.json()
    assert "messages" in data


def test_get_conversation_messages(auth_client):
    """GET /conversations/{id} returns messages after converse."""
    r = _converse_dry_run(auth_client, message="Thiên hà là gì?")
    session_id = _extract_session_id(r.text)

    r2 = auth_client.get(f"/conversations/{session_id}")
    assert r2.status_code == 200
    data = r2.json()
    assert "messages" in data
    # dry_run still persists user + assistant messages
    assert len(data["messages"]) >= 2


# ---------- helper ----------

def _extract_session_id(sse_text: str) -> str | None:
    """Parse session_id from SSE done event payload."""
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
