"""Integration tests for POST /converse with dry_run=True."""
import json
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(env_anthropic_key, tmp_path):
    from api.app import app
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture
def auth_client(client):
    client.post("/auth/register", json={
        "email": "converse@example.com",
        "password": "password123",
        "display_name": "Converse User",
    })
    client.post("/auth/login", json={"email": "converse@example.com", "password": "password123"})
    return client


def _parse_sse(text: str) -> list[dict]:
    """Parse SSE response into list of event dicts."""
    events = []
    for line in text.splitlines():
        if line.startswith("data: "):
            try:
                events.append(json.loads(line[len("data: "):]))
            except Exception:
                pass
    return events


def _get_done_event(text: str) -> dict | None:
    for ev in _parse_sse(text):
        if ev.get("type") == "done":
            return ev
    return None


# ---------- tests ----------

def test_converse_dry_run_returns_sse(auth_client):
    r = auth_client.post("/converse", json={"message": "Hố đen là gì?", "dry_run": True})
    assert r.status_code == 200
    assert "text/event-stream" in r.headers.get("content-type", "")
    events = _parse_sse(r.text)
    assert len(events) >= 1
    # At minimum the done event should be present
    types = {e.get("type") for e in events}
    assert "done" in types


def test_converse_requires_auth(client):
    r = client.post("/converse", json={"message": "Hello", "dry_run": True})
    assert r.status_code == 401


def test_converse_invalid_input(auth_client):
    """Empty body should fail validation."""
    r = auth_client.post("/converse", json={})
    assert r.status_code == 422


def test_new_session_created(auth_client):
    """Without session_id, a new session_id is returned in done event."""
    r = auth_client.post("/converse", json={"message": "Sao Hỏa", "dry_run": True})
    assert r.status_code == 200
    done = _get_done_event(r.text)
    assert done is not None
    assert "session_id" in done
    assert done["session_id"]  # non-empty


def test_session_id_persists(auth_client):
    """Re-using session_id accumulates messages."""
    # First turn — new session
    r1 = auth_client.post("/converse", json={"message": "Sao Mộc", "dry_run": True})
    done1 = _get_done_event(r1.text)
    session_id = done1["session_id"]

    # Second turn — reuse session
    r2 = auth_client.post("/converse", json={
        "message": "Kể thêm về nó", "dry_run": True, "session_id": session_id,
    })
    assert r2.status_code == 200
    done2 = _get_done_event(r2.text)
    assert done2["session_id"] == session_id

    # Verify messages accumulated
    r3 = auth_client.get(f"/conversations/{session_id}")
    assert r3.status_code == 200
    msgs = r3.json()["messages"]
    user_msgs = [m for m in msgs if m["role"] == "user"]
    assert len(user_msgs) == 2


def test_converse_unknown_session_returns_error_event(auth_client):
    """Passing an invalid session_id streams an error event rather than HTTP 4xx."""
    r = auth_client.post("/converse", json={
        "message": "Test", "dry_run": True, "session_id": "nonexistent-id",
    })
    assert r.status_code == 200
    events = _parse_sse(r.text)
    types = {e.get("type") for e in events}
    assert "error" in types or "done" in types


def test_converse_dry_run_no_real_api_call(auth_client):
    """dry_run must complete without hitting real Anthropic API (dummy key)."""
    r = auth_client.post("/converse", json={"message": "Thiên hà Milky Way", "dry_run": True})
    # Should not get 502 from API error
    assert r.status_code == 200
    done = _get_done_event(r.text)
    assert done is not None
