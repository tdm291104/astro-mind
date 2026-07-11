# src/persistence/store.py
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path


def _iso(dt: datetime) -> str:
    """Serialize datetime to ISO 8601, always with UTC offset.

    SQLite drops tzinfo on read-back, so naive datetimes stored as UTC
    must have +00:00 re-attached before serializing — otherwise JavaScript
    treats the string as local time and relative timestamps are wrong.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.isoformat()

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.models import Chunk, Document, new_uuid

from .orm import (
    ChunkRow,
    ConversationRow,
    DocumentAnalysisRow,
    DocumentRow,
    MessageRow,
    NewsletterRow,
    PlanRequestRow,
    PlanRow,
    ReportRow,
    SourceRow,
    UsageEventRow,
    UserRow,
    ensure_schema,
    make_engine,
)


def _chunk_from_row(row: ChunkRow) -> Chunk:
    return Chunk(
        id=row.id,
        doc_id=row.doc_id,
        content=row.content,
        page_number=row.page_number,
        chunk_index=row.chunk_index,
        token_count=row.token_count,
        section_title=row.section_title,
        chunk_type=row.chunk_type,
    )


class MetaStore:
    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        ensure_schema(self.db_path)
        self._engine = make_engine(self.db_path)

    # ---- documents / chunks (existing public API) ----
    def insert_document(self, doc: Document) -> None:
        with Session(self._engine) as s:
            s.add(
                DocumentRow(
                    id=doc.id, name=doc.name, type=doc.type, file_path=doc.file_path,
                    page_count=doc.page_count, created_at=doc.created_at, user_id=doc.user_id,
                )
            )
            s.commit()

    def insert_chunks(self, chunks: list[Chunk]) -> None:
        if not chunks:
            return
        with Session(self._engine) as s:
            s.add_all(
                ChunkRow(
                    id=c.id, doc_id=c.doc_id, content=c.content,
                    page_number=c.page_number, chunk_index=c.chunk_index,
                    token_count=c.token_count, section_title=c.section_title,
                    chunk_type=c.chunk_type,
                )
                for c in chunks
            )
            s.commit()

    def list_documents(
        self, user_id: str | None = None, limit: int | None = None, offset: int = 0,
    ) -> list[Document]:
        stmt = select(DocumentRow).order_by(DocumentRow.created_at)
        if user_id is not None:
            stmt = stmt.where(DocumentRow.user_id == user_id)
        if limit is not None:
            stmt = stmt.offset(offset).limit(limit)
        with Session(self._engine) as s:
            rows = s.scalars(stmt).all()
        return [
            Document(
                id=r.id, name=r.name, type=r.type, file_path=r.file_path,
                page_count=r.page_count, created_at=r.created_at, user_id=r.user_id,
            )
            for r in rows
        ]

    def count_documents(self, user_id: str | None = None) -> int:
        stmt = select(func.count()).select_from(DocumentRow)
        if user_id is not None:
            stmt = stmt.where(DocumentRow.user_id == user_id)
        with Session(self._engine) as s:
            return s.scalar(stmt) or 0

    def delete_document(self, doc_id: str, user_id: str) -> bool:
        """Delete document + its chunks (CASCADE). Returns True if found and deleted."""
        with Session(self._engine) as s:
            row = s.get(DocumentRow, doc_id)
            if row is None or row.user_id != user_id:
                return False
            s.delete(row)
            s.commit()
        return True

    def rename_document(self, doc_id: str, user_id: str, name: str) -> bool:
        with Session(self._engine) as s:
            row = s.get(DocumentRow, doc_id)
            if row is None or row.user_id != user_id:
                return False
            row.name = name
            s.commit()
        return True

    def fetch_chunks(self, chunk_ids: list[str]) -> list[tuple[Chunk, str]]:
        """Return [(chunk, doc_name)] for each id, preserving input order; skip unknown ids."""
        if not chunk_ids:
            return []
        with Session(self._engine, expire_on_commit=False) as s:
            rows = s.execute(
                select(ChunkRow, DocumentRow.name)
                .join(DocumentRow, ChunkRow.doc_id == DocumentRow.id)
                .where(ChunkRow.id.in_(chunk_ids))
            ).all()
            by_id = {row.ChunkRow.id: (_chunk_from_row(row.ChunkRow), row.name) for row in rows}
            return [by_id[cid] for cid in chunk_ids if cid in by_id]

    def get_first_chunks_by_doc(self, doc_ids: list[str], limit: int) -> list[tuple[Chunk, str]]:
        """Return first chunks per doc — analysis overview chunk first, then text chunks in order."""
        if not doc_ids:
            return []
        with Session(self._engine, expire_on_commit=False) as s:
            results: list[tuple[Chunk, str]] = []
            for doc_id in doc_ids:
                doc_name_row = s.execute(
                    select(DocumentRow.name).where(DocumentRow.id == doc_id)
                ).first()
                if doc_name_row is None:
                    continue
                doc_name = doc_name_row[0]

                overview_row = s.execute(
                    select(ChunkRow)
                    .where(
                        ChunkRow.doc_id == doc_id,
                        ChunkRow.chunk_type == "analysis",
                        ChunkRow.section_title == "Phân tích: Tổng quan",
                    )
                    .limit(1)
                ).scalar_one_or_none()

                remaining = limit
                if overview_row is not None:
                    results.append((_chunk_from_row(overview_row), doc_name))
                    remaining -= 1

                if remaining > 0:
                    text_rows = s.execute(
                        select(ChunkRow)
                        .where(ChunkRow.doc_id == doc_id, ChunkRow.chunk_type == "text")
                        .order_by(ChunkRow.page_number, ChunkRow.chunk_index)
                        .limit(remaining)
                    ).scalars().all()
                    results.extend((_chunk_from_row(row), doc_name) for row in text_rows)

            return results

    # ---- users (new) ----
    def create_user(
        self, *, id: str, email: str, password_hash: str, display_name: str,
        role: str = "user", plan: str = "free", status: str = "active",
        created_at: datetime | None = None,
    ) -> None:
        with Session(self._engine) as s:
            s.add(
                UserRow(
                    id=id, email=email, password_hash=password_hash, display_name=display_name,
                    role=role, plan=plan, status=status,
                    **({"created_at": created_at} if created_at else {}),
                )
            )
            s.commit()

    def get_user_by_email(self, email: str) -> UserRow | None:
        with Session(self._engine, expire_on_commit=False) as s:
            return s.scalars(select(UserRow).where(UserRow.email == email)).first()

    def get_user_by_id(self, user_id: str) -> UserRow | None:
        with Session(self._engine, expire_on_commit=False) as s:
            return s.get(UserRow, user_id)

    def update_last_login(self, user_id: str, when: datetime) -> None:
        with Session(self._engine) as s:
            row = s.get(UserRow, user_id)
            if row is not None:
                row.last_login_at = when
                s.commit()

    def count_users(self) -> int:
        with Session(self._engine) as s:
            return int(s.scalar(select(func.count()).select_from(UserRow)) or 0)

    def assign_orphan_documents(self, user_id: str) -> list[str]:
        """Set user_id on documents that have none. Returns the ids that were backfilled."""
        with Session(self._engine) as s:
            rows = s.scalars(select(DocumentRow).where(DocumentRow.user_id.is_(None))).all()
            ids = [r.id for r in rows]
            for r in rows:
                r.user_id = user_id
            s.commit()
            return ids

    # ---- conversations / messages (SP2) ----
    def create_conversation(self, user_id: str, title: str) -> str:
        cid = new_uuid()
        with Session(self._engine) as s:
            s.add(ConversationRow(id=cid, user_id=user_id, title=title))
            s.commit()
        return cid

    def get_conversation(self, conversation_id: str, user_id: str) -> dict | None:
        with Session(self._engine) as s:
            row = s.get(ConversationRow, conversation_id)
            if row is None or row.user_id != user_id:
                return None
            return {
                "id": row.id, "title": row.title, "pinned": row.pinned,
                "pending_web_query": row.pending_web_query,
                "updated_at": _iso(row.updated_at),
            }

    def create_share_token(self, conversation_id: str, user_id: str) -> str | None:
        """Generate (or return existing) share token for a conversation owned by user_id."""
        import secrets as _secrets
        with Session(self._engine) as s:
            row = s.get(ConversationRow, conversation_id)
            if row is None or row.user_id != user_id:
                return None
            if row.share_token:
                return row.share_token
            row.share_token = _secrets.token_urlsafe(24)
            s.commit()
            return row.share_token

    def get_shared_conversation(self, token: str) -> dict | None:
        """Return conversation + messages for a public share token (no auth required)."""
        with Session(self._engine) as s:
            row = s.scalars(
                select(ConversationRow).where(ConversationRow.share_token == token)
            ).first()
            if row is None:
                return None
            messages = s.scalars(
                select(MessageRow)
                .where(MessageRow.conversation_id == row.id)
                .order_by(MessageRow.seq)
            ).all()
            return {
                "id": row.id,
                "title": row.title,
                "messages": [
                    {
                        "role": m.role,
                        "content": m.content,
                        "route": m.route,
                        "citations": json.loads(m.citations) if m.citations else None,
                        "image_url": m.image_url,
                    }
                    for m in messages
                    if m.role in ("user", "assistant")
                ],
            }

    def list_conversations(
        self, user_id: str, limit: int | None = None, offset: int = 0,
    ) -> list[dict]:
        with Session(self._engine) as s:
            stmt = (
                select(ConversationRow)
                .where(ConversationRow.user_id == user_id)
                .order_by(ConversationRow.pinned.desc(), ConversationRow.updated_at.desc())
            )
            if limit is not None:
                stmt = stmt.offset(offset).limit(limit)
            rows = s.scalars(stmt).all()
            result = []
            for r in rows:
                routes = list(s.scalars(
                    select(MessageRow.route)
                    .where(
                        MessageRow.conversation_id == r.id,
                        MessageRow.role == "assistant",
                        MessageRow.route.isnot(None),
                    )
                    .distinct()
                ).all())
                result.append({
                    "id": r.id, "title": r.title, "pinned": r.pinned,
                    "updated_at": _iso(r.updated_at),
                    "routes": routes,
                })
            return result

    def count_conversations(self, user_id: str) -> int:
        with Session(self._engine) as s:
            return s.scalar(
                select(func.count()).select_from(ConversationRow)
                .where(ConversationRow.user_id == user_id)
            ) or 0

    def append_message(
        self, conversation_id: str, role: str, content: str,
        route: str | None = None, citations: list[dict] | None = None,
        arxiv_papers: list[dict] | None = None,
        web_sources: list[dict] | None = None,
        image_url: str | None = None,
        analysis_data: dict | None = None,
    ) -> None:
        with Session(self._engine) as s:
            conv = s.get(ConversationRow, conversation_id)
            if conv is None:
                raise ValueError(f"Unknown conversation_id: {conversation_id}")
            next_seq = s.scalar(
                select(func.count()).select_from(MessageRow)
                .where(MessageRow.conversation_id == conversation_id)
            ) or 0
            s.add(MessageRow(
                id=new_uuid(), conversation_id=conversation_id, role=role, content=content,
                route=route, citations=json.dumps(citations) if citations else None,
                arxiv_papers=json.dumps(arxiv_papers) if arxiv_papers else None,
                web_sources=json.dumps(web_sources) if web_sources else None,
                image_url=image_url,
                analysis_data=json.dumps(analysis_data) if analysis_data else None,
                seq=next_seq,
            ))
            conv.updated_at = datetime.now(UTC)
            s.commit()

    def get_messages(self, conversation_id: str) -> list[dict]:
        with Session(self._engine) as s:
            rows = s.scalars(
                select(MessageRow).where(MessageRow.conversation_id == conversation_id)
                .order_by(MessageRow.seq)
            ).all()
            return [
                {
                    "role": r.role, "content": r.content, "route": r.route, "seq": r.seq,
                    "citations": json.loads(r.citations) if r.citations else None,
                    "arxiv_papers": json.loads(r.arxiv_papers) if r.arxiv_papers else None,
                    "web_sources": json.loads(r.web_sources) if r.web_sources else None,
                    "image_url": r.image_url,
                    "analysis_data": json.loads(r.analysis_data) if r.analysis_data else None,
                }
                for r in rows
            ]

    def set_pinned(self, conversation_id: str, user_id: str, pinned: bool) -> bool:
        with Session(self._engine) as s:
            row = s.get(ConversationRow, conversation_id)
            if row is None or row.user_id != user_id:
                return False
            row.pinned = pinned
            s.commit()
            return True

    def rename_conversation(self, conversation_id: str, user_id: str, title: str) -> bool:
        with Session(self._engine) as s:
            row = s.get(ConversationRow, conversation_id)
            if row is None or row.user_id != user_id:
                return False
            row.title = title
            s.commit()
            return True

    def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        with Session(self._engine) as s:
            row = s.get(ConversationRow, conversation_id)
            if row is None or row.user_id != user_id:
                return False
            s.delete(row)
            s.commit()
            return True

    def set_pending_web_query(self, conversation_id: str, value: str | None) -> None:
        with Session(self._engine) as s:
            row = s.get(ConversationRow, conversation_id)
            if row is not None:
                row.pending_web_query = value
                s.commit()

    # ---- usage metering + plans (SP3) ----
    _FREE_DEFAULT = {"tokens_per_month": 20000, "requests_per_day": 25, "docs_per_notebook": 2}

    def get_plan(self, name: str) -> dict:
        with Session(self._engine) as s:
            row = s.get(PlanRow, name) or s.get(PlanRow, "free")
        if row is None:
            return dict(self._FREE_DEFAULT)
        return {
            "tokens_per_month": row.tokens_per_month,
            "requests_per_day": row.requests_per_day,
            "docs_per_notebook": row.docs_per_notebook,
        }

    def record_usage_event(self, user_id: str, feature: str, total_tokens: int) -> None:
        with Session(self._engine) as s:
            s.add(UsageEventRow(id=new_uuid(), user_id=user_id, feature=feature,
                                total_tokens=total_tokens))
            s.commit()

    def tokens_used_this_month(self, user_id: str) -> int:
        now = datetime.now(UTC)
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        with Session(self._engine) as s:
            total = s.scalar(
                select(func.coalesce(func.sum(UsageEventRow.total_tokens), 0))
                .where(UsageEventRow.user_id == user_id, UsageEventRow.created_at >= start)
            )
        return int(total or 0)

    def requests_today(self, user_id: str) -> int:
        now = datetime.now(UTC)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        with Session(self._engine) as s:
            count = s.scalar(
                select(func.count()).select_from(UsageEventRow)
                .where(UsageEventRow.user_id == user_id, UsageEventRow.created_at >= start)
            )
        return int(count or 0)

    def usage_summary(self, user_id: str, plan_name: str) -> dict:
        plan = self.get_plan(plan_name)
        now = datetime.now(UTC)
        return {
            "period": f"USAGE · {now.strftime('%b %Y').upper()}",
            "plan": plan_name,
            "tokens": {
                "used": self.tokens_used_this_month(user_id),
                "limit": plan["tokens_per_month"],
            },
            "requests": {
                "used": self.requests_today(user_id),
                "limit": plan["requests_per_day"],
            },
        }

    # ---- sources registry (SP5) ----
    _SOURCE_ORDER = ("apod", "arxiv", "images", "web")

    @staticmethod
    def _source_dict(r: SourceRow) -> dict:
        return {
            "key": r.key, "name": r.name, "icon": r.icon, "endpoint": r.endpoint,
            "enabled": r.enabled, "last_status": r.last_status,
            "last_latency_ms": r.last_latency_ms,
            "last_checked_at": _iso(r.last_checked_at) if r.last_checked_at else None,
        }

    def list_sources(self) -> list[dict]:
        order = {k: i for i, k in enumerate(self._SOURCE_ORDER)}
        with Session(self._engine) as s:
            rows = s.scalars(select(SourceRow)).all()
        return [self._source_dict(r) for r in sorted(rows, key=lambda r: order.get(r.key, 99))]

    def enabled_source_keys(self) -> set[str]:
        with Session(self._engine) as s:
            return set(s.scalars(select(SourceRow.key).where(SourceRow.enabled.is_(True))).all())

    def set_source_enabled(self, key: str, enabled: bool) -> bool:
        with Session(self._engine) as s:
            row = s.get(SourceRow, key)
            if row is None:
                return False
            row.enabled = enabled
            s.commit()
            return True

    def record_source_health(self, key: str, status: str, latency_ms: int) -> None:
        with Session(self._engine) as s:
            row = s.get(SourceRow, key)
            if row is not None:
                row.last_status = status
                row.last_latency_ms = latency_ms
                row.last_checked_at = datetime.now(UTC)
                s.commit()

    def get_source(self, key: str) -> dict | None:
        with Session(self._engine) as s:
            row = s.get(SourceRow, key)
            return self._source_dict(row) if row is not None else None

    # ---- admin aggregates (SP6, system-wide) ----
    def admin_kpis(self) -> dict:
        now = datetime.now(UTC)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_month_start = (month_start - timedelta(days=1)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        with Session(self._engine) as s:
            total_users = int(s.scalar(select(func.count()).select_from(UserRow)) or 0)
            new_users_7d = int(s.scalar(
                select(func.count()).select_from(UserRow)
                .where(UserRow.created_at >= week_ago)) or 0)
            tokens_this_month = int(s.scalar(
                select(func.coalesce(func.sum(UsageEventRow.total_tokens), 0))
                .where(UsageEventRow.created_at >= month_start)) or 0)
            tokens_last_month = int(s.scalar(
                select(func.coalesce(func.sum(UsageEventRow.total_tokens), 0))
                .where(UsageEventRow.created_at >= prev_month_start,
                       UsageEventRow.created_at < month_start)) or 0)
            requests_today = int(s.scalar(
                select(func.count()).select_from(UsageEventRow)
                .where(UsageEventRow.created_at >= day_start)) or 0)
            requests_7d = int(s.scalar(
                select(func.count()).select_from(UsageEventRow)
                .where(UsageEventRow.created_at >= week_ago)) or 0)
        return {
            "total_users": total_users, "new_users_7d": new_users_7d,
            "tokens_this_month": tokens_this_month, "tokens_last_month": tokens_last_month,
            "requests_today": requests_today, "requests_avg_7d": round(requests_7d / 7),
        }

    def admin_request_volume(self, days: int = 14) -> list[dict]:
        now = datetime.now(UTC)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start = today - timedelta(days=days - 1)
        with Session(self._engine) as s:
            rows = s.execute(
                select(UsageEventRow.created_at, UsageEventRow.total_tokens)
                .where(UsageEventRow.created_at >= start)
            ).all()
        buckets = {(start + timedelta(days=i)).strftime("%Y-%m-%d"): [0, 0] for i in range(days)}
        for created_at, tokens in rows:
            key = created_at.strftime("%Y-%m-%d")
            if key in buckets:
                buckets[key][0] += 1
                buckets[key][1] += int(tokens or 0)
        return [{"day": d, "requests": c, "tokens": t} for d, (c, t) in buckets.items()]

    def admin_feature_usage(self) -> list[dict]:
        now = datetime.now(UTC)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        with Session(self._engine) as s:
            rows = s.execute(
                select(UsageEventRow.feature,
                       func.coalesce(func.sum(UsageEventRow.total_tokens), 0))
                .where(UsageEventRow.created_at >= month_start)
                .group_by(UsageEventRow.feature)
            ).all()
        total = sum(int(t) for _, t in rows)
        result = [
            {"feature": f, "tokens": int(t), "pct": round(int(t) / total * 100) if total else 0}
            for f, t in rows
        ]
        return sorted(result, key=lambda r: r["tokens"], reverse=True)

    def admin_alerts(self, limit: int = 10) -> list[dict]:
        with Session(self._engine, expire_on_commit=False) as s:
            users = s.scalars(select(UserRow).where(UserRow.status == "active")).all()
        out: list[dict] = []
        for u in users:
            plan = self.get_plan(u.plan)
            tok_used, tok_limit = self.tokens_used_this_month(u.id), plan["tokens_per_month"]
            req_used, req_limit = self.requests_today(u.id), plan["requests_per_day"]
            if tok_limit is not None and tok_used >= tok_limit:
                out.append({"tone": "danger", "title": f"{u.email} — 100% quota token",
                            "detail": f"{u.plan.upper()} · {tok_used}/{tok_limit} tok", "_sev": 2})
            elif tok_limit is not None and tok_used >= 0.8 * tok_limit:
                pct = round(tok_used / tok_limit * 100)
                out.append({"tone": "amber", "title": f"{u.email} — {pct}% quota token",
                            "detail": f"{u.plan.upper()} · {tok_used}/{tok_limit} tok", "_sev": 1})
            if req_limit is not None and req_used >= 0.8 * req_limit:
                rpct = round(req_used / req_limit * 100)
                out.append({"tone": "amber", "title": f"{u.email} — {rpct}% request hôm nay",
                            "detail": f"{u.plan.upper()} · {req_used}/{req_limit} req", "_sev": 1})
        out.sort(key=lambda a: a["_sev"], reverse=True)
        return [{k: v for k, v in a.items() if k != "_sev"} for a in out[:limit]]

    # ---- user + plan management (SP6) ----
    _PLAN_ORDER = ("free", "pro", "team")

    def admin_user(self, user_id: str) -> dict | None:
        with Session(self._engine, expire_on_commit=False) as s:
            r = s.get(UserRow, user_id)
        if r is None:
            return None
        plan = self.get_plan(r.plan)
        return {
            "id": r.id, "email": r.email, "display_name": r.display_name, "role": r.role,
            "plan": r.plan, "status": r.status,
            "tokens_used": self.tokens_used_this_month(r.id),
            "token_limit": plan["tokens_per_month"],
            "created_at": _iso(r.created_at),
            "last_login_at": _iso(r.last_login_at) if r.last_login_at else None,
        }

    def list_all_users(self) -> list[dict]:
        with Session(self._engine) as s:
            ids = list(s.scalars(select(UserRow.id).order_by(UserRow.created_at)).all())
        return [u for u in (self.admin_user(i) for i in ids) if u is not None]

    def set_user_status(self, user_id: str, status: str) -> bool:
        with Session(self._engine) as s:
            row = s.get(UserRow, user_id)
            if row is None:
                return False
            row.status = status
            s.commit()
            return True

    def set_user_plan(self, user_id: str, plan: str) -> bool:
        with Session(self._engine) as s:
            row = s.get(UserRow, user_id)
            if row is None:
                return False
            row.plan = plan
            s.commit()
            return True

    def update_password_hash(self, user_id: str, new_hash: str) -> bool:
        with Session(self._engine) as s:
            row = s.get(UserRow, user_id)
            if row is None:
                return False
            row.password_hash = new_hash
            s.commit()
            return True

    def list_plans(self) -> list[dict]:
        order = {n: i for i, n in enumerate(self._PLAN_ORDER)}
        with Session(self._engine) as s:
            rows = s.scalars(select(PlanRow)).all()
        rows = sorted(rows, key=lambda r: order.get(r.name, 99))
        return [
            {"name": r.name, "tokens_per_month": r.tokens_per_month,
             "requests_per_day": r.requests_per_day, "docs_per_notebook": r.docs_per_notebook}
            for r in rows
        ]

    # ---- newsletter subscriptions ----

    def subscribe_newsletter(self, email: str) -> None:
        """Insert subscription; silently ignore duplicate emails (upsert by PK)."""
        with Session(self._engine) as s:
            existing = s.get(NewsletterRow, email)
            if existing is None:
                s.add(NewsletterRow(email=email))
                s.commit()

    def update_plan(self, name: str, *, tokens_per_month: int | None,
                    requests_per_day: int | None, docs_per_notebook: int | None) -> bool:
        with Session(self._engine) as s:
            row = s.get(PlanRow, name)
            if row is None:
                return False
            row.tokens_per_month = tokens_per_month
            row.requests_per_day = requests_per_day
            row.docs_per_notebook = docs_per_notebook
            s.commit()
            return True

    # ---- reports (assistant @report artifacts) ----
    def create_report(self, user_id: str, title: str, payload: dict) -> str:
        rid = new_uuid()
        with Session(self._engine) as s:
            s.add(ReportRow(id=rid, user_id=user_id, title=title,
                            payload=json.dumps(payload)))
            s.commit()
        return rid

    def list_reports(
        self, user_id: str, limit: int | None = None, offset: int = 0,
    ) -> list[dict]:
        with Session(self._engine) as s:
            stmt = (
                select(ReportRow).where(ReportRow.user_id == user_id)
                .order_by(ReportRow.created_at.desc())
            )
            if limit is not None:
                stmt = stmt.offset(offset).limit(limit)
            rows = s.scalars(stmt).all()
            return [
                {
                    "id": r.id,
                    "title": r.title,
                    "created_at": _iso(r.created_at),
                    "report_type": json.loads(r.payload).get("report_type", "research"),
                }
                for r in rows
            ]

    def count_reports(self, user_id: str) -> int:
        with Session(self._engine) as s:
            return s.scalar(
                select(func.count()).select_from(ReportRow)
                .where(ReportRow.user_id == user_id)
            ) or 0

    def delete_report(self, report_id: str, user_id: str) -> bool:
        with Session(self._engine) as s:
            row = s.get(ReportRow, report_id)
            if row is None or row.user_id != user_id:
                return False
            s.delete(row)
            s.commit()
        return True

    def rename_report(self, report_id: str, user_id: str, title: str) -> bool:
        with Session(self._engine) as s:
            row = s.get(ReportRow, report_id)
            if row is None or row.user_id != user_id:
                return False
            row.title = title
            s.commit()
        return True

    def update_report(self, report_id: str, payload: dict) -> None:
        with Session(self._engine) as s:
            row = s.get(ReportRow, report_id)
            if row:
                row.payload = json.dumps(payload)
                s.commit()

    def get_report(self, report_id: str, user_id: str) -> dict | None:
        with Session(self._engine) as s:
            r = s.get(ReportRow, report_id)
            if r is None or r.user_id != user_id:
                return None
            return {"id": r.id, "title": r.title,
                    "created_at": _iso(r.created_at),
                    "payload": json.loads(r.payload)}

    # ---- document analysis (deep extraction) ----

    def create_document_analysis(self, doc_id: str) -> None:
        with Session(self._engine) as s:
            existing = s.get(DocumentAnalysisRow, doc_id)
            if existing is not None:
                return
            s.add(DocumentAnalysisRow(doc_id=doc_id, status="pending"))
            s.commit()

    def update_document_analysis(
        self,
        doc_id: str,
        *,
        status: str,
        analysis: dict | None = None,
        error: str | None = None,
        model: str | None = None,
    ) -> None:
        with Session(self._engine) as s:
            row = s.get(DocumentAnalysisRow, doc_id)
            if row is None:
                return
            row.status = status
            if analysis is not None:
                row.analysis = json.dumps(analysis)
            if error is not None:
                row.error = error
            if model is not None:
                row.model = model
            row.updated_at = datetime.now(UTC)
            s.commit()

    def get_document_analysis(self, doc_id: str) -> dict | None:
        with Session(self._engine) as s:
            row = s.get(DocumentAnalysisRow, doc_id)
            if row is None:
                return None
            return {
                "status": row.status,
                "analysis": json.loads(row.analysis) if row.analysis else None,
                "error": row.error,
                "model": row.model,
            }

    # ---- user usage history ----

    def user_usage_history(self, user_id: str, days: int = 14) -> dict:
        from datetime import timedelta as _td
        now = datetime.now(UTC)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start = today - _td(days=days - 1)
        with Session(self._engine) as s:
            vol_rows = s.execute(
                select(
                    func.date(UsageEventRow.created_at).label("day"),
                    func.count().label("requests"),
                    func.coalesce(func.sum(UsageEventRow.total_tokens), 0).label("tokens"),
                )
                .where(UsageEventRow.user_id == user_id, UsageEventRow.created_at >= start)
                .group_by(func.date(UsageEventRow.created_at))
                .order_by(func.date(UsageEventRow.created_at))
            ).all()
            feat_rows = s.execute(
                select(
                    UsageEventRow.feature,
                    func.coalesce(func.sum(UsageEventRow.total_tokens), 0).label("tokens"),
                )
                .where(UsageEventRow.user_id == user_id, UsageEventRow.created_at >= start)
                .group_by(UsageEventRow.feature)
            ).all()
        date_map = {r.day: {"requests": r.requests, "tokens": r.tokens} for r in vol_rows}
        volume = []
        for i in range(days):
            d = (start + _td(days=i)).strftime("%Y-%m-%d")
            entry = date_map.get(d, {"requests": 0, "tokens": 0})
            volume.append({"day": d, "requests": entry["requests"], "tokens": entry["tokens"]})
        total_tok = sum(r.tokens for r in feat_rows)
        feature_usage = [
            {"feature": r.feature, "tokens": int(r.tokens),
             "pct": round(r.tokens / total_tok * 100) if total_tok > 0 else 0}
            for r in sorted(feat_rows, key=lambda x: -x.tokens)
        ]
        return {"volume": volume, "feature_usage": feature_usage}

    # ---- plan upgrade requests ----

    def create_plan_request(
        self, user_id: str, user_email: str, user_name: str,
        requested_plan: str, message: str | None,
    ) -> str:
        rid = new_uuid()
        with Session(self._engine) as s:
            s.add(PlanRequestRow(
                id=rid, user_id=user_id, user_email=user_email, user_name=user_name,
                requested_plan=requested_plan, message=message, status="pending",
            ))
            s.commit()
        return rid

    def list_plan_requests(self, status: str = "pending") -> list[dict]:
        with Session(self._engine) as s:
            rows = s.scalars(
                select(PlanRequestRow)
                .where(PlanRequestRow.status == status)
                .order_by(PlanRequestRow.created_at.desc())
            ).all()
        return [
            {
                "id": r.id, "user_id": r.user_id, "user_email": r.user_email,
                "user_name": r.user_name, "requested_plan": r.requested_plan,
                "message": r.message, "status": r.status,
                "created_at": _iso(r.created_at),
            }
            for r in rows
        ]

    def dismiss_plan_request(self, request_id: str) -> bool:
        with Session(self._engine) as s:
            row = s.get(PlanRequestRow, request_id)
            if row is None:
                return False
            row.status = "dismissed"
            s.commit()
        return True
