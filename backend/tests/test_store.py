"""Kiểm thử MetaStore — lưu trữ metadata tài liệu, người dùng, hội thoại, báo cáo."""
from pathlib import Path

import pytest
from sqlalchemy.exc import IntegrityError

from core.models import Chunk, Document, new_uuid
from persistence.store import MetaStore


def _make_store(tmp_path: Path) -> MetaStore:
    return MetaStore(tmp_path / "test.db")


def _make_user(store: MetaStore, email: str = "u@test.com") -> str:
    uid = new_uuid()
    store.create_user(id=uid, email=email, password_hash="h", display_name="Test")
    return uid


def _make_doc(user_id: str | None = None, name: str = "hubble.pdf") -> Document:
    return Document(name=name, type="pdf", file_path=f"/data/{name}", page_count=10, user_id=user_id)


# ── documents ──────────────────────────────────────────────────────────────────

def test_insert_and_list_documents(tmp_path):
    store = _make_store(tmp_path)
    uid = _make_user(store, "doc_user@test.com")
    doc = _make_doc(user_id=uid)
    store.insert_document(doc)
    docs = store.list_documents(user_id=uid)
    assert len(docs) == 1
    assert docs[0].name == "hubble.pdf"


def test_delete_document(tmp_path):
    store = _make_store(tmp_path)
    uid = _make_user(store, "del_user@test.com")
    doc = _make_doc(user_id=uid)
    store.insert_document(doc)
    deleted = store.delete_document(doc.id, uid)
    assert deleted is True
    assert store.list_documents(user_id=uid) == []


def test_delete_document_wrong_user(tmp_path):
    store = _make_store(tmp_path)
    uid = _make_user(store, "owner@test.com")
    doc = _make_doc(user_id=uid)
    store.insert_document(doc)
    result = store.delete_document(doc.id, "nonexistent-user-id")
    assert result is False
    # Document should still be there
    assert len(store.list_documents(user_id=uid)) == 1


def test_count_documents(tmp_path):
    store = _make_store(tmp_path)
    uid = _make_user(store, "count_user@test.com")
    for i in range(3):
        store.insert_document(_make_doc(user_id=uid, name=f"doc{i}.pdf"))
    assert store.count_documents(user_id=uid) == 3


# ── users ──────────────────────────────────────────────────────────────────────

def test_create_and_get_user(tmp_path):
    store = _make_store(tmp_path)
    uid = new_uuid()
    store.create_user(
        id=uid, email="mark@example.com", password_hash="hashed",
        display_name="Mark"
    )
    user = store.get_user_by_email("mark@example.com")
    assert user is not None
    assert user.id == uid
    assert user.display_name == "Mark"


def test_create_duplicate_email_raises(tmp_path):
    store = _make_store(tmp_path)
    kwargs = dict(id=new_uuid(), email="dup@example.com", password_hash="h", display_name="D")
    store.create_user(**kwargs)
    with pytest.raises(Exception):  # IntegrityError or similar
        store.create_user(**{**kwargs, "id": new_uuid()})


# ── conversations ──────────────────────────────────────────────────────────────

def test_create_conversation_and_list(tmp_path):
    store = _make_store(tmp_path)
    uid = new_uuid()
    store.create_user(id=uid, email="u@test.com", password_hash="h", display_name="U")
    cid = store.create_conversation(uid, "Hố đen Sagittarius A*")
    convs = store.list_conversations(uid)
    assert len(convs) == 1
    assert convs[0]["id"] == cid
    assert convs[0]["title"] == "Hố đen Sagittarius A*"


# ── messages ───────────────────────────────────────────────────────────────────

def test_add_message_and_list(tmp_path):
    store = _make_store(tmp_path)
    uid = new_uuid()
    store.create_user(id=uid, email="u2@test.com", password_hash="h", display_name="U2")
    cid = store.create_conversation(uid, "Test conv")
    store.append_message(cid, "user", "Thiên hà là gì?")
    store.append_message(cid, "assistant", "Thiên hà là tập hợp hàng tỷ ngôi sao.")
    msgs = store.get_messages(cid)
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[0]["content"] == "Thiên hà là gì?"
    assert msgs[1]["role"] == "assistant"


# ── reports ────────────────────────────────────────────────────────────────────

def test_create_report_and_get(tmp_path):
    store = _make_store(tmp_path)
    uid = new_uuid()
    store.create_user(id=uid, email="u3@test.com", password_hash="h", display_name="U3")
    payload = {"report_type": "research", "research_text": "Nội dung báo cáo về hố đen."}
    rid = store.create_report(uid, "Báo cáo hố đen", payload)
    report = store.get_report(rid, uid)
    assert report is not None
    assert report["id"] == rid
    assert report["title"] == "Báo cáo hố đen"
    assert report["payload"]["report_type"] == "research"


def test_report_generating_flag(tmp_path):
    store = _make_store(tmp_path)
    uid = new_uuid()
    store.create_user(id=uid, email="u4@test.com", password_hash="h", display_name="U4")
    payload = {"report_type": "trending", "generating": True}
    rid = store.create_report(uid, "Báo cáo xu hướng", payload)
    report = store.get_report(rid, uid)
    assert report["payload"]["generating"] is True


def test_get_report_wrong_user(tmp_path):
    store = _make_store(tmp_path)
    uid = new_uuid()
    other_uid = new_uuid()
    store.create_user(id=uid, email="u5@test.com", password_hash="h", display_name="U5")
    payload = {"report_type": "research"}
    rid = store.create_report(uid, "Private report", payload)
    result = store.get_report(rid, other_uid)
    assert result is None
