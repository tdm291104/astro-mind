from datetime import UTC, datetime
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import ForeignKey, create_engine, event, inspect
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class UserRow(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    display_name: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(nullable=False, default="user")
    plan: Mapped[str] = mapped_column(nullable=False, default="free")
    status: Mapped[str] = mapped_column(nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(default=_now, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(default=None)
    documents: Mapped[list["DocumentRow"]] = relationship(back_populates="user")


class DocumentRow(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=False)
    type: Mapped[str] = mapped_column(nullable=False)
    file_path: Mapped[str] = mapped_column(nullable=False)
    page_count: Mapped[int | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(default=_now, nullable=False)
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id"), default=None, index=True
    )
    user: Mapped["UserRow | None"] = relationship(back_populates="documents")
    chunks: Mapped[list["ChunkRow"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class ChunkRow(Base):
    __tablename__ = "chunks"
    id: Mapped[str] = mapped_column(primary_key=True)
    doc_id: Mapped[str] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(nullable=False)
    page_number: Mapped[int | None] = mapped_column(default=None)
    chunk_index: Mapped[int | None] = mapped_column(default=None)
    token_count: Mapped[int | None] = mapped_column(default=None)
    section_title: Mapped[str | None] = mapped_column(default=None)
    chunk_type: Mapped[str] = mapped_column(nullable=False, default="text")
    document: Mapped["DocumentRow"] = relationship(back_populates="chunks")


class ConversationRow(Base):
    __tablename__ = "conversations"
    id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(nullable=False)
    pinned: Mapped[bool] = mapped_column(default=False, nullable=False)
    pending_web_query: Mapped[str | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=_now, nullable=False)
    share_token: Mapped[str | None] = mapped_column(default=None, nullable=True, unique=True)
    messages: Mapped[list["MessageRow"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )


class MessageRow(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(primary_key=True)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(nullable=False)
    content: Mapped[str] = mapped_column(nullable=False)
    route: Mapped[str | None] = mapped_column(default=None)
    citations: Mapped[str | None] = mapped_column(default=None)  # JSON-encoded list[dict]
    arxiv_papers: Mapped[str | None] = mapped_column(default=None)  # JSON-encoded list[dict]
    web_sources: Mapped[str | None] = mapped_column(default=None)   # JSON-encoded list[dict]
    image_url: Mapped[str | None] = mapped_column(default=None)
    analysis_data: Mapped[str | None] = mapped_column(default=None)  # JSON-encoded dict
    seq: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=_now, nullable=False)
    conversation: Mapped["ConversationRow"] = relationship(back_populates="messages")


class UsageEventRow(Base):
    __tablename__ = "usage_events"
    id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    feature: Mapped[str] = mapped_column(nullable=False)
    total_tokens: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=_now, nullable=False, index=True)


class PlanRow(Base):
    __tablename__ = "plans"
    name: Mapped[str] = mapped_column(primary_key=True)
    tokens_per_month: Mapped[int | None] = mapped_column(default=None)
    requests_per_day: Mapped[int | None] = mapped_column(default=None)
    docs_per_notebook: Mapped[int | None] = mapped_column(default=None)


class SourceRow(Base):
    __tablename__ = "sources"
    key: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=False)
    icon: Mapped[str] = mapped_column(nullable=False)
    endpoint: Mapped[str] = mapped_column(nullable=False)
    enabled: Mapped[bool] = mapped_column(default=True, nullable=False)
    last_status: Mapped[str | None] = mapped_column(default=None)
    last_latency_ms: Mapped[int | None] = mapped_column(default=None)
    last_checked_at: Mapped[datetime | None] = mapped_column(default=None)


class ReportRow(Base):
    __tablename__ = "reports"
    id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(nullable=False)
    payload: Mapped[str] = mapped_column(nullable=False)  # JSON-encoded report_dict
    created_at: Mapped[datetime] = mapped_column(default=_now, nullable=False, index=True)


class NewsletterRow(Base):
    __tablename__ = "newsletter_subscriptions"
    email: Mapped[str] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=_now, nullable=False)


class PlanRequestRow(Base):
    __tablename__ = "plan_requests"
    id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_email: Mapped[str] = mapped_column(nullable=False)
    user_name: Mapped[str] = mapped_column(nullable=False)
    requested_plan: Mapped[str] = mapped_column(nullable=False)
    message: Mapped[str | None] = mapped_column(default=None)
    status: Mapped[str] = mapped_column(nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(default=_now, nullable=False, index=True)


class DocumentAnalysisRow(Base):
    __tablename__ = "document_analysis"
    doc_id: Mapped[str] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[str] = mapped_column(nullable=False, default="pending")
    analysis: Mapped[str | None] = mapped_column(default=None)
    error: Mapped[str | None] = mapped_column(default=None)
    model: Mapped[str | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=_now, nullable=False)


@event.listens_for(Engine, "connect")
def _sqlite_fk_pragma(dbapi_connection, _record):  # enforce FK cascade on SQLite
    cur = dbapi_connection.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.close()


def make_engine(db_path: Path | str):
    """SQLite engine usable from FastAPI's threadpool (check_same_thread=False)."""
    return create_engine(
        f"sqlite:///{Path(db_path)}", connect_args={"check_same_thread": False}
    )


def _alembic_config(db_path: Path | str) -> Config:
    cfg = Config()
    cfg.set_main_option("script_location", "persistence:migrations")
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{Path(db_path)}")
    return cfg


def ensure_schema(db_path: Path | str) -> None:
    """Bring the DB to the latest schema. Legacy DBs (documents table present but no
    alembic_version) are stamped at 0001 first so their tables aren't recreated.

    Legacy handling detail: the old DB may not have a `users` table at all.
    Since 0001 creates users (and is skipped by the stamp), we create it here
    via the ORM metadata so that 0002's batch ALTER on documents (which adds a
    FK → users) can succeed even with PRAGMA foreign_keys=ON.
    """
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    engine = make_engine(db_path)
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    is_legacy = "documents" in tables and "alembic_version" not in tables
    if is_legacy:
        if "users" not in tables:
            # Create the users table so the FK in migration 0002 resolves.
            UserRow.__table__.create(engine, checkfirst=True)
        # Pre-Sprint-2 legacy DBs may be missing chunks.section_title (was added
        # manually in the old store._init_schema).  Since we stamp at 0001 below
        # (which declares section_title already present), Alembic won't add it.
        # Patch it here before stamping so 0002 can run cleanly.
        chunk_cols = {c["name"] for c in insp.get_columns("chunks")}
        if "section_title" not in chunk_cols:
            with engine.begin() as conn:
                conn.execute(
                    __import__("sqlalchemy").text(
                        "ALTER TABLE chunks ADD COLUMN section_title TEXT"
                    )
                )
    engine.dispose()
    cfg = _alembic_config(db_path)
    if is_legacy:
        command.stamp(cfg, "0001")
    command.upgrade(cfg, "head")
