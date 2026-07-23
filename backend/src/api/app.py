import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel, Field, ValidationError, field_validator

from agents.conversation import generate_title, memory_from_messages
from agents.document_analyzer import run_analysis
from agents.orchestrator import OrchestratorAgent
from agents.synthetic_chunks import build_synthetic_chunks
from api.auth import build_auth_router, get_current_user, require_admin, require_jwt_secret
from auth.accounts import User, seed_admin
from auth.security import hash_password
from core.config import Settings
from core.metering import meter
from core.models import Document, SourceBlock
from ingestion import pipeline as ingestion
from ingestion.fits_preview import fits_has_image, fits_header, render_fits_png
from ingestion.web import parse_url
from persistence.embed import Embedder
from persistence.rerank import Reranker
from persistence.store import MetaStore
from persistence.vector import VectorStore
from sources.apod import fetch_apod, shape_apod
from sources.arxiv import fetch_arxiv
from sources.health import check_source
from sources.nasa_images import fetch_images
from sources.websearch import fetch_web, get_web
from trends.report import build_report, report_dict, two_full_years

_logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Resources:
    settings: Settings
    store: MetaStore
    vector: VectorStore
    embedder: Embedder
    reranker: Reranker


@dataclass
class IngestJob:
    job_id: str
    status: str  # pending | processing | done | failed
    source_name: str
    doc_id: str | None = None
    page_count: int | None = None
    chunk_count: int | None = None
    error: str | None = None


class ConverseRequest(BaseModel):
    message: str
    session_id: str | None = None
    dry_run: bool = False
    mode: str | None = None           # "chat" | "notebook" | "search" | "report"
    doc_ids: list[str] | None = None  # context documents (notebook scope)
    web: bool = True                  # per-turn web toggle
    image_data: str | None = None     # base64-encoded image (data URL or raw base64)
    image_type: str | None = None     # MIME type, e.g. "image/jpeg"
    locale: str | None = None         # "vi" | "en" | "ja"


class AskRequest(BaseModel):
    query: str
    doc_ids: list[str] | None = None
    dry_run: bool = False


class ConversationUpdate(BaseModel):
    pinned: bool | None = None
    title: str | None = None


class SourceToggle(BaseModel):
    enabled: bool


class UserAdminUpdate(BaseModel):
    status: str | None = None
    plan: str | None = None


class PlanUpdate(BaseModel):
    tokens_per_month: int | None = None
    requests_per_day: int | None = None
    docs_per_notebook: int | None = None


class AdminResetPassword(BaseModel):
    new_password: str = Field(min_length=8, max_length=72)


class NewsletterSubscribe(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        import re
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("invalid email address")
        return v.lower().strip()


def build_resources() -> Resources | None:
    """Build the shared notebook resources once. None if ANTHROPIC_API_KEY is absent
    (so the server still boots; notebook endpoints then return 500)."""
    try:
        settings = Settings()
    except ValidationError:
        return None
    settings.ensure_dirs()
    return Resources(
        settings,
        MetaStore(settings.db_path),
        VectorStore(settings.chroma_dir),
        Embedder(settings.embed_model),
        Reranker(settings.rerank_model),
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    resources = build_resources()
    app.state.resources = resources
    app.state.jobs = {}
    if resources is not None:
        app.state.store = resources.store
        app.state.settings = resources.settings
        require_jwt_secret(resources.settings)  # fail fast if JWT_SECRET unset
        seed_admin(
            resources.store,
            email=resources.settings.admin_email,
            password=resources.settings.admin_password,
            vector=resources.vector,
        )
        # Eager-load GalaxyPredictor: import tensorflow + load model at startup
        # (8-10s one-time cost) so first galaxy request gets 13ms inference,
        # not an 8s freeze that would timeout the SSE stream.
        from agents.image_agent import _get_predictor
        import asyncio as _asyncio
        await _asyncio.to_thread(_get_predictor)
    yield


app = FastAPI(title="AstroMind API", lifespan=lifespan)

# CORS origins: read from Settings if available, else env var fallback.
# Middleware must be registered at module load (before lifespan), so we can't
# wait for lifespan to build Settings. Settings() may fail if ANTHROPIC_API_KEY
# is absent in minimal/test environments.
try:
    _cors_origins = Settings().cors_origins
except Exception:
    import os
    _cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(build_auth_router())


def get_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as e:
        raise HTTPException(
            status_code=503, detail="Dịch vụ chưa được cấu hình (thiếu ANTHROPIC_API_KEY)."
        ) from e


def get_resources(request: Request) -> Resources:
    resources = getattr(request.app.state, "resources", None)
    if resources is None:
        raise HTTPException(
            status_code=503, detail="Dịch vụ chưa được cấu hình (thiếu ANTHROPIC_API_KEY)."
        )
    return resources


def quota_guard(
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> User:
    plan = res.store.get_plan(user.plan)
    token_limit = plan["tokens_per_month"]
    if token_limit is not None and res.store.tokens_used_this_month(user.id) >= token_limit:
        raise HTTPException(
            status_code=429,
            detail="Đã đạt giới hạn token tháng này — nâng cấp gói để tiếp tục.",
        )
    req_limit = plan["requests_per_day"]
    if req_limit is not None and res.store.requests_today(user.id) >= req_limit:
        raise HTTPException(status_code=429, detail="Đã đạt giới hạn số request hôm nay.")
    return user


def require_source(res: Resources, key: str) -> None:
    """Raise 503 if the named source is disabled in the registry."""
    if key not in res.store.enabled_source_keys():
        src = res.store.get_source(key)
        name = src["name"] if src else key
        raise HTTPException(status_code=503, detail=f"Nguồn '{name}' hiện đang tắt.")


@app.get("/images/{filename}")
def serve_image(
    filename: str,
    res: Resources = Depends(get_resources),
    user: User = Depends(get_current_user),
) -> FileResponse:
    img_path = res.settings.images_dir / filename
    if not img_path.exists() or not img_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(img_path)


@app.get("/usage")
def usage(
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    return res.store.usage_summary(user.id, user.plan)


@app.get("/usage/history")
def usage_history(days: int = 14, user: User = Depends(get_current_user), res: Resources = Depends(get_resources)):
    days = max(7, min(days, 30))
    return res.store.user_usage_history(user.id, days)


@app.post("/plan-requests", status_code=201)
def create_plan_request(
    body: dict,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
):
    plan = body.get("requested_plan", "")
    if plan not in ("pro", "team"):
        raise HTTPException(status_code=400, detail="Plan không hợp lệ")
    msg = body.get("message") or None
    row = res.store.get_user_by_id(user.id)
    rid = res.store.create_plan_request(
        user_id=user.id,
        user_email=row.email if row else user.email,
        user_name=row.display_name if row else "",
        requested_plan=plan,
        message=msg,
    )
    return {"id": rid}


@app.get("/admin/plan-requests")
def admin_plan_requests(
    status: str = "pending",
    user: User = Depends(require_admin),
    res: Resources = Depends(get_resources),
):
    return {"requests": res.store.list_plan_requests(status)}


@app.patch("/admin/plan-requests/{request_id}")
def admin_dismiss_plan_request(
    request_id: str,
    body: dict,
    user: User = Depends(require_admin),
    res: Resources = Depends(get_resources),
):
    if body.get("status") != "dismissed":
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ status=dismissed")
    ok = res.store.dismiss_plan_request(request_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Yêu cầu không tồn tại")
    return {"ok": True}


@app.get("/sources")
def sources(
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    return {
        "sources": [
            {"key": s["key"], "name": s["name"], "icon": s["icon"],
             "endpoint": s["endpoint"], "enabled": s["enabled"]}
            for s in res.store.list_sources()
        ]
    }


@app.get("/admin/sources")
def admin_sources(
    admin: User = Depends(require_admin),
    res: Resources = Depends(get_resources),
) -> dict:
    return {"sources": res.store.list_sources()}


@app.patch("/admin/sources/{key}")
def admin_toggle_source(
    key: str, body: SourceToggle,
    admin: User = Depends(require_admin),
    res: Resources = Depends(get_resources),
) -> dict:
    if not res.store.set_source_enabled(key, body.enabled):
        raise HTTPException(status_code=404, detail="Nguồn không tồn tại")
    return {"key": key, "enabled": body.enabled}


@app.post("/admin/sources/{key}/test")
def admin_test_source(
    key: str, dry_run: bool = False,
    admin: User = Depends(require_admin),
    res: Resources = Depends(get_resources),
) -> dict:
    if res.store.get_source(key) is None:
        raise HTTPException(status_code=404, detail="Nguồn không tồn tại")
    status, latency_ms = check_source(key, res.settings, dry_run=dry_run)
    res.store.record_source_health(key, status, latency_ms)
    src = res.store.get_source(key)
    return {"key": key, "status": status, "latency_ms": latency_ms,
            "checked_at": src["last_checked_at"]}


@app.get("/admin/overview")
def admin_overview(
    admin: User = Depends(require_admin),
    res: Resources = Depends(get_resources),
) -> dict:
    rate = res.settings.cost_per_1k_tokens
    k = res.store.admin_kpis()
    volume = res.store.admin_request_volume()
    return {
        "kpis": {
            "total_users": k["total_users"],
            "new_users_7d": k["new_users_7d"],
            "tokens": {"this_month": k["tokens_this_month"], "last_month": k["tokens_last_month"]},
            "requests": {"today": k["requests_today"], "avg_7d": k["requests_avg_7d"]},
            "cost": {"this_month": round(k["tokens_this_month"] * rate / 1000, 4),
                     "rate_per_1k": rate},
        },
        "request_volume": [
            {**v, "cost": round(v["tokens"] * rate / 1000, 4)} for v in volume
        ],
        "feature_usage": res.store.admin_feature_usage(),
        "alerts": res.store.admin_alerts(),
    }


@app.get("/admin/users")
def admin_users(
    admin: User = Depends(require_admin),
    res: Resources = Depends(get_resources),
) -> dict:
    return {"users": res.store.list_all_users()}


@app.patch("/admin/users/{user_id}")
def admin_update_user(
    user_id: str, body: UserAdminUpdate,
    admin: User = Depends(require_admin),
    res: Resources = Depends(get_resources),
) -> dict:
    if body.status is None and body.plan is None:
        raise HTTPException(status_code=400, detail="Cần ít nhất 'status' hoặc 'plan'")
    if res.store.get_user_by_id(user_id) is None:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    if body.status is not None:
        if body.status not in ("active", "banned"):
            raise HTTPException(status_code=400, detail="status không hợp lệ")
        if user_id == admin.id and body.status == "banned":
            raise HTTPException(
                status_code=400, detail="Không thể tự khoá tài khoản của chính mình"
            )
        res.store.set_user_status(user_id, body.status)
    if body.plan is not None:
        if body.plan not in ("free", "pro", "team"):
            raise HTTPException(status_code=400, detail="plan không hợp lệ")
        res.store.set_user_plan(user_id, body.plan)
    return res.store.admin_user(user_id)


@app.post("/admin/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: str,
    body: AdminResetPassword,
    admin: User = Depends(require_admin),
    res: Resources = Depends(get_resources),
) -> dict:
    if res.store.get_user_by_id(user_id) is None:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    res.store.update_password_hash(user_id, hash_password(body.new_password))
    return {"ok": True}


@app.get("/admin/plans")
def admin_plans(
    admin: User = Depends(require_admin),
    res: Resources = Depends(get_resources),
) -> dict:
    return {"plans": res.store.list_plans()}


@app.patch("/admin/plans/{name}")
def admin_update_plan(
    name: str, body: PlanUpdate,
    admin: User = Depends(require_admin),
    res: Resources = Depends(get_resources),
) -> dict:
    ok = res.store.update_plan(
        name, tokens_per_month=body.tokens_per_month,
        requests_per_day=body.requests_per_day, docs_per_notebook=body.docs_per_notebook)
    if not ok:
        raise HTTPException(status_code=404, detail="Gói không tồn tại")
    return next(p for p in res.store.list_plans() if p["name"] == name)


@app.get("/reports")
def reports(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    items = res.store.list_reports(user.id, limit=limit, offset=offset)
    total = res.store.count_reports(user.id)
    return {"reports": items, "has_more": offset + len(items) < total}


@app.get("/reports/{report_id}")
def get_report(
    report_id: str,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    report = res.store.get_report(report_id, user.id)
    if report is None:
        raise HTTPException(status_code=404, detail="Báo cáo không tồn tại")
    return report


@app.delete("/reports/{report_id}", status_code=204)
def delete_report(
    report_id: str,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> None:
    if not res.store.delete_report(report_id, user.id):
        raise HTTPException(status_code=404, detail="Báo cáo không tồn tại")


@app.get("/reports/{report_id}/pdf")
def get_report_pdf(
    report_id: str,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> Response:
    report = res.store.get_report(report_id, user.id)
    if report is None:
        raise HTTPException(status_code=404, detail="Báo cáo không tồn tại")

    from reports.pdf import render_report_pdf

    pdf_bytes = render_report_pdf(report["title"], report["created_at"], report["payload"])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report-{report_id}.pdf"'},
    )


@app.patch("/reports/{report_id}")
def rename_report(
    report_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    title = (body.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")
    if not res.store.rename_report(report_id, user.id, title):
        raise HTTPException(status_code=404, detail="Báo cáo không tồn tại")
    return {"ok": True}


@app.post("/ask")
def ask(
    body: AskRequest,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    import dataclasses
    from agents.notebook import NotebookAgent
    agent = NotebookAgent(
        store=res.store,
        vector=res.vector,
        embedder=res.embedder,
        api_key=res.settings.anthropic_api_key,
        model=res.settings.anthropic_model_light,
        user_id=user.id,
        reranker=res.reranker,
    )
    try:
        result = agent.run(body.query, doc_ids=body.doc_ids, dry_run=body.dry_run)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Notebook agent error: {e}") from e
    return {
        "answer": result.text,
        "citations": [dataclasses.asdict(c) for c in result.citations],
        "had_hits": result.had_hits,
        "answer_type": "factual_with_citation" if result.citations else ("no_citation" if result.had_hits else "no_hits"),
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/apod")
def apod(
    date: str | None = None, dry_run: bool = False,
    settings: Settings = Depends(get_settings),
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    require_source(res, "apod")
    if dry_run:
        return {
            "title": "[dry-run] APOD", "date": "today", "explanation": "",
            "image_url": "", "media_type": "image", "copyright": None,
        }
    try:
        return shape_apod(fetch_apod(settings.nasa_api_key, date))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"NASA API error: {e}") from e


@app.get("/arxiv")
def arxiv(
    q: str, max_results: int = 5, dry_run: bool = False,
    settings: Settings = Depends(get_settings),
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    require_source(res, "arxiv")
    if dry_run:
        return {"query": q, "results": []}
    try:
        return {"query": q, "results": fetch_arxiv(q, max_results=max_results)}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"arXiv API error: {e}") from e


@app.get("/images")
def images(
    q: str, max_results: int = 5, dry_run: bool = False,
    settings: Settings = Depends(get_settings),
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    require_source(res, "images")
    if dry_run:
        return {"query": q, "results": []}
    try:
        return {"query": q, "results": fetch_images(q, max_results=max_results)}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"NASA Images API error: {e}") from e


@app.get("/web")
def web(
    q: str, max_results: int = 5, dry_run: bool = False,
    settings: Settings = Depends(get_settings),
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    require_source(res, "web")
    if dry_run:
        return {"query": q, "results": []}
    if not settings.tavily_api_key:
        raise HTTPException(status_code=400, detail="TAVILY_API_KEY chưa cấu hình")
    try:
        return {
            "query": q,
            "results": fetch_web(q, settings.tavily_api_key, max_results=max_results),
        }
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Web search error: {e}") from e


@app.get("/documents")
def documents(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    res: Resources = Depends(get_resources),
    user: User = Depends(get_current_user),
) -> dict:
    items = res.store.list_documents(user_id=user.id, limit=limit, offset=offset)
    total = res.store.count_documents(user_id=user.id)
    return {
        "documents": [
            {"id": d.id, "name": d.name, "type": d.type, "page_count": d.page_count}
            for d in items
        ],
        "has_more": offset + len(items) < total,
    }


@app.delete("/documents/{doc_id}", status_code=204)
def delete_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> None:
    if not res.store.delete_document(doc_id, user.id):
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại")
    res.vector.delete_by_doc(doc_id)
    # Best-effort: remove raw file from disk
    path = _raw_path(res, doc_id)
    if path and path.exists():
        path.unlink(missing_ok=True)


@app.patch("/documents/{doc_id}")
def rename_document(
    doc_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if not res.store.rename_document(doc_id, user.id, name):
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại")
    return {"ok": True}


_VIEW_MEDIA = {"pdf": "application/pdf", "text": "text/plain"}


def _find_doc(res: Resources, doc_id: str, user_id: str):
    return next((d for d in res.store.list_documents(user_id=user_id) if d.id == doc_id), None)


def _raw_path(res: Resources, doc_id: str) -> Path | None:
    matches = sorted(res.settings.docs_dir.glob(f"{doc_id}.*"))
    return matches[0] if matches else None


@app.get("/documents/{doc_id}/view")
def document_view(
    doc_id: str,
    res: Resources = Depends(get_resources),
    user: User = Depends(get_current_user),
) -> dict:
    doc = _find_doc(res, doc_id, user.id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại")
    base = {"id": doc.id, "name": doc.name, "type": doc.type}
    if doc.type == "url":
        return {**base, "kind": "url", "url": doc.file_path}
    path = _raw_path(res, doc_id)
    if path is None:
        raise HTTPException(status_code=404, detail="Tệp gốc không còn")
    if doc.type == "pdf":
        return {**base, "kind": "pdf", "file_url": f"/documents/{doc_id}/file"}
    if doc.type == "fits" and fits_has_image(path):
        return {**base, "kind": "image", "image_url": f"/documents/{doc_id}/preview.png"}
    blocks = ingestion.parse_file(path)
    return {**base, "kind": "text", "text": "\n\n".join(b.text for b in blocks)}


@app.get("/documents/{doc_id}/file")
def document_file(
    doc_id: str,
    res: Resources = Depends(get_resources),
    user: User = Depends(get_current_user),
) -> Response:
    doc = _find_doc(res, doc_id, user.id)
    path = _raw_path(res, doc_id) if doc is not None else None
    if doc is None or path is None:
        raise HTTPException(status_code=404, detail="Tệp không tồn tại")
    media = _VIEW_MEDIA.get(doc.type, "application/octet-stream")
    return Response(content=path.read_bytes(), media_type=media)


@app.get("/documents/{doc_id}/preview.png")
def document_preview(
    doc_id: str,
    colormap: str = "magma",
    stretch: str = "linear",
    res: Resources = Depends(get_resources),
    user: User = Depends(get_current_user),
) -> Response:
    doc = _find_doc(res, doc_id, user.id)
    path = _raw_path(res, doc_id) if doc is not None else None
    if doc is None or path is None or doc.type != "fits":
        raise HTTPException(status_code=404, detail="Không có ảnh preview")
    png = render_fits_png(path, colormap=colormap, stretch=stretch)
    if png is None:
        raise HTTPException(status_code=404, detail="FITS không có dữ liệu ảnh")
    return Response(content=png, media_type="image/png")


@app.get("/documents/{doc_id}/fits-header")
def document_fits_header(
    doc_id: str,
    res: Resources = Depends(get_resources),
    user: User = Depends(get_current_user),
) -> dict:
    doc = _find_doc(res, doc_id, user.id)
    path = _raw_path(res, doc_id) if doc is not None else None
    if doc is None or path is None or doc.type != "fits":
        raise HTTPException(status_code=404, detail="Không phải tệp FITS")
    return {"header": fits_header(path)}


@app.get("/documents/{doc_id}/analysis")
def document_analysis(
    doc_id: str,
    res: Resources = Depends(get_resources),
    user: User = Depends(get_current_user),
) -> dict:
    doc = _find_doc(res, doc_id, user.id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại")
    record = res.store.get_document_analysis(doc_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Tài liệu này chưa có phân tích sâu")
    return record


def get_jobs(request: Request) -> dict:
    jobs = getattr(request.app.state, "jobs", None)
    if jobs is None:  # lifespan normally sets this; lazy-init as a fallback
        request.app.state.jobs = jobs = {}
    return jobs


def _run_deep_analysis(doc: Document, blocks: list[SourceBlock], res: Resources) -> None:
    """Plan-gated (pro/team) deep analysis: never raises, always leaves
    document_analysis in a terminal status if it ran at all."""
    if doc.user_id is None:
        return
    user = res.store.get_user_by_id(doc.user_id)
    if user is None or user.plan not in ("pro", "team"):
        return

    res.store.create_document_analysis(doc.id)
    try:
        with meter() as m:
            analysis = run_analysis(
                blocks, doc.type,
                api_key=res.settings.anthropic_api_key, model=res.settings.anthropic_model,
            )
        synthetic_chunks = build_synthetic_chunks(doc.id, analysis)
        if synthetic_chunks:
            embeddings = res.embedder.embed_batch([c.content for c in synthetic_chunks])
            res.store.insert_chunks(synthetic_chunks)
            res.vector.upsert(synthetic_chunks, embeddings, doc_name=doc.name, user_id=doc.user_id)
        res.store.update_document_analysis(
            doc.id, status="done", analysis=analysis, model=res.settings.anthropic_model
        )
        res.store.record_usage_event(doc.user_id, "analysis", m.total)
    except Exception as e:  # noqa: BLE001
        _logger.exception("deep analysis failed for doc %s", doc.id)
        res.store.update_document_analysis(doc.id, status="failed", error=str(e))


def _run_ingest(jobs, job_id, doc, kind, source, res) -> None:
    jobs[job_id].status = "processing"
    try:
        blocks = ingestion.parse_file(source) if kind == "file" else parse_url(source)

        from agents.guard import InputGuard, _REJECT_DOCUMENT_MESSAGE
        sample = "\n\n".join(b.text for b in blocks[:5]).strip()
        if sample:
            relevant = asyncio.run(InputGuard().is_document_relevant(
                sample,
                api_key=res.settings.anthropic_api_key,
                model=res.settings.anthropic_model_light,
            ))
            if not relevant:
                jobs[job_id].status = "failed"
                jobs[job_id].error = _REJECT_DOCUMENT_MESSAGE
                return

        result = ingestion.persist_document(
            doc, blocks, store=res.store, vector=res.vector, embedder=res.embedder
        )
        job = jobs[job_id]
        job.status = "done"
        job.doc_id = result.doc_id
        job.page_count = result.page_count
        job.chunk_count = result.chunk_count
    except Exception as e:  # noqa: BLE001
        jobs[job_id].status = "failed"
        jobs[job_id].error = str(e)
        return

    _run_deep_analysis(doc, blocks, res)


@app.post("/ingest", status_code=202)
def ingest(
    background_tasks: BackgroundTasks,
    file: UploadFile | None = File(default=None),
    url: str | None = Form(default=None),
    res: Resources = Depends(get_resources),
    jobs: dict = Depends(get_jobs),
    user: User = Depends(get_current_user),
) -> dict:
    if bool(file) == bool(url):  # need exactly one
        raise HTTPException(status_code=400, detail="Provide exactly one of `file` or `url`")
    doc_limit = res.store.get_plan(user.plan)["docs_per_notebook"]
    if doc_limit is not None:
        current = len(res.store.list_documents(user_id=user.id))
        if current >= doc_limit:
            raise HTTPException(
                status_code=429,
                detail=f"Đã đạt giới hạn {doc_limit} tài liệu cho gói {user.plan}. Xóa bớt hoặc nâng cấp gói.",
            )
    doc_id = uuid.uuid4().hex
    if file is not None:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in ingestion.PARSERS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type (expected {ingestion.SUPPORTED_EXTS})",
            )
        stored = res.settings.docs_dir / f"{doc_id}{suffix}"
        stored.write_bytes(file.file.read())
        doc = Document(
            name=file.filename, type=ingestion.PARSERS[suffix][1],
            file_path=str(stored.resolve()), page_count=0, id=doc_id,
            user_id=user.id,
        )
        kind, source = "file", stored
    else:
        if not url.startswith(("http://", "https://")):
            raise HTTPException(status_code=400, detail="url must be http(s)://")
        doc = Document(
            name=url, type="url", file_path=url, page_count=0, id=doc_id, user_id=user.id
        )
        kind, source = "url", url
    job_id = uuid.uuid4().hex
    jobs[job_id] = IngestJob(job_id=job_id, status="pending", source_name=doc.name)
    background_tasks.add_task(_run_ingest, jobs, job_id, doc, kind, source, res)
    return {"job_id": job_id, "status": "pending"}


@app.get("/ingest/{job_id}")
def ingest_status(
    job_id: str,
    jobs: dict = Depends(get_jobs),
    user: User = Depends(get_current_user),
) -> dict:
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job_id")
    return asdict(job)


@app.post("/assistant")
async def assistant(
    req: ConverseRequest,
    res: Resources = Depends(get_resources),
    user: User = Depends(quota_guard),
) -> dict:
    store = res.store
    created_title: str | None = None
    if req.session_id is None:
        created_title = generate_title(req.message, api_key=res.settings.anthropic_api_key,
                                       model=res.settings.anthropic_model, dry_run=req.dry_run)
        conv_id = store.create_conversation(user.id, created_title)
        conv = store.get_conversation(conv_id, user.id)
    else:
        conv = store.get_conversation(req.session_id, user.id)
        if conv is None:
            raise HTTPException(status_code=404, detail="Unknown session_id")
        conv_id = req.session_id

    if conv["pending_web_query"] is not None:
        query = conv["pending_web_query"]
        store.set_pending_web_query(conv_id, None)
        _affirmative_words = {"có", "yes", "đúng", "ok", "okay", "ừ", "vâng", "được", "sure"}
        if any(w in req.message.lower().split() for w in _affirmative_words) or req.message.strip().lower() in _affirmative_words:
            if "web" not in store.enabled_source_keys():
                text = "Nguồn tìm kiếm web hiện đang tắt."
                store.append_message(conv_id, "user", req.message)
                store.append_message(conv_id, "assistant", text, route="search_web")
                store.record_usage_event(user.id, "search", 0)
                return {"session_id": conv_id, "reply": text, "route": "search_web",
                        "report_id": None, "citations": [], "fallback_query": None,
                        "title": created_title}
            if not req.dry_run and not res.settings.tavily_api_key:
                raise HTTPException(status_code=400, detail="TAVILY_API_KEY chưa cấu hình")
            with meter() as m:
                try:
                    text = get_web(query, res.settings.tavily_api_key, dry_run=req.dry_run)
                except Exception as e:  # noqa: BLE001
                    raise HTTPException(status_code=502, detail=f"Web search error: {e}") from e
            store.append_message(conv_id, "user", req.message)
            store.append_message(conv_id, "assistant", text, route="search_web")
            store.record_usage_event(user.id, "search", m.total)
            return {"session_id": conv_id, "reply": text, "route": "search_web",
                    "report_id": None, "citations": [], "fallback_query": None,
                    "title": created_title}

    memory = memory_from_messages(store.get_messages(conv_id))

    valid_modes = {"chat", "notebook", "search", "report"}
    intent = req.mode if req.mode in valid_modes else ("notebook" if req.doc_ids else None)

    if intent == "report":
        prev_year, recent_year = two_full_years(datetime.now(UTC).year)
        if req.dry_run:
            payload = {
                "prev_year": prev_year, "recent_year": recent_year,
                "topics": {"rows": [], "analysis": "[dry-run] topics"},
                "timeline": {"rows": [], "by_method": {"years": [], "series": {}},
                             "analysis": "[dry-run] timeline"},
                "interest": {"series": {}, "text": "[dry-run] interest"},
            }
            tokens = 0
        else:
            with meter() as m:
                try:
                    report = build_report(
                        api_key=res.settings.anthropic_api_key, model=res.settings.anthropic_model,
                        prev_year=prev_year, recent_year=recent_year,
                        serpapi_api_key=res.settings.serpapi_api_key,
                    )
                except Exception as e:  # noqa: BLE001
                    raise HTTPException(status_code=502, detail=f"Trend report error: {e}") from e
            payload = report_dict(report)
            tokens = m.total
        title = f"Báo cáo xu hướng {prev_year}–{recent_year}"
        report_id = store.create_report(user.id, title, payload)
        text = f"Đã tạo báo cáo: {title}. Mở ở mục Reports để xem biểu đồ."
        store.append_message(conv_id, "user", req.message)
        store.append_message(conv_id, "assistant", text, route="report")
        store.set_pending_web_query(conv_id, None)
        store.record_usage_event(user.id, "report", tokens)
        return {"session_id": conv_id, "reply": text, "route": "report", "report_id": report_id,
                "citations": [], "fallback_query": None, "title": created_title}

    from agents.base import collect_events as _collect_events

    agent = OrchestratorAgent(
        api_key=res.settings.anthropic_api_key,
        model=res.settings.anthropic_model,
        model_light=res.settings.anthropic_model_light,
        nasa_api_key=res.settings.nasa_api_key,
        tavily_key=res.settings.tavily_api_key,
        serpapi_api_key=res.settings.serpapi_api_key,
        store=res.store,
        vector=res.vector,
        embedder=res.embedder,
        reranker=res.reranker,
        user_id=user.id,
        doc_ids=req.doc_ids,
        enabled_sources=store.enabled_source_keys(),
        conversation_id=conv_id,
    )
    with meter() as m:
        try:
            events = await _collect_events(agent.run(req.message, memory, dry_run=req.dry_run))
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=f"Assistant error: {e}") from e

    final_text = "".join(e.delta for e in events if e.type == "text_delta")
    done_ev = next((e for e in events if e.type == "done"), None)
    reply_route = done_ev.route if done_ev else "chat"
    citations = done_ev.citations if done_ev else []

    store.append_message(conv_id, "user", req.message)
    store.append_message(conv_id, "assistant", final_text, route=reply_route,
                         citations=citations or None,
                         analysis_data=done_ev.analysis_data if done_ev else None)
    store.set_pending_web_query(conv_id, None)
    feature = ("search" if reply_route.startswith("search")
               else "notebook" if reply_route.startswith("notebook")
               else "report" if reply_route == "report"
               else "image" if reply_route == "image"
               else "chat")
    store.record_usage_event(user.id, feature, m.total)
    return {"session_id": conv_id, "reply": final_text, "route": reply_route, "report_id": None,
            "citations": citations, "fallback_query": None, "title": created_title}


@app.post("/converse")
async def converse(
    req: ConverseRequest,
    res: Resources = Depends(get_resources),
    user: User = Depends(quota_guard),
) -> StreamingResponse:
    import base64
    import json as _json

    # Decode base64 image if provided
    image_bytes: bytes | None = None
    if req.image_data:
        try:
            # Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
            raw = req.image_data.split(",", 1)[-1]
            image_bytes = base64.b64decode(raw)
            if len(image_bytes) == 0:
                raise HTTPException(status_code=400, detail="File ảnh trống.")
            if len(image_bytes) > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Ảnh quá lớn (tối đa 10MB).")
        except HTTPException:
            raise
        except Exception:
            image_bytes = None  # ignore malformed base64

    # Persist image to disk so it survives across sessions
    saved_image_url: str | None = None
    if image_bytes is not None:
        import mimetypes
        ext = mimetypes.guess_extension(req.image_type or "image/jpeg") or ".jpg"
        if ext == ".jpe":
            ext = ".jpg"
        img_filename = f"{uuid.uuid4()}{ext}"
        img_path = res.settings.images_dir / img_filename
        img_path.write_bytes(image_bytes)
        saved_image_url = f"/images/{img_filename}"

    parsed_doc_ids = req.doc_ids

    store = res.store
    created_title: str | None = None

    if req.session_id is None:
        created_title = generate_title(
            req.message,
            api_key=res.settings.anthropic_api_key,
            model=res.settings.anthropic_model,
            dry_run=req.dry_run,
            image_data=req.image_data,
        )
        conv_id = store.create_conversation(user.id, created_title)
    else:
        conv = store.get_conversation(req.session_id, user.id)
        if conv is None:
            async def error_stream():
                yield f"data: {_json.dumps({'type': 'error', 'message': 'Unknown session_id'})}\n\n"
                yield f"data: {_json.dumps({'type': 'done', 'session_id': req.session_id, 'route': 'error', 'citations': []})}\n\n"
            return StreamingResponse(error_stream(), media_type="text/event-stream")
        conv_id = req.session_id

    memory = memory_from_messages(store.get_messages(conv_id))

    # Input guard: reject off-topic requests before running orchestrator
    if not req.dry_run and (req.message.strip() or req.image_data):
        from agents.guard import InputGuard, get_reject_message
        _guard = InputGuard()
        doc_names = None
        if parsed_doc_ids:
            docs = store.list_documents(user_id=user.id)
            doc_names = [d.name for d in docs if d.id in parsed_doc_ids]
        _relevant = await _guard.is_relevant(
            req.message,
            req.image_data,
            api_key=res.settings.anthropic_api_key,
            model=res.settings.anthropic_model_light,
            history=memory.messages(),
            doc_names=doc_names,
        )
        if not _relevant:
            _reject_msg = get_reject_message(req.locale)
            store.append_message(conv_id, "user", req.message, image_url=saved_image_url)
            store.append_message(conv_id, "assistant", _reject_msg, route="chat")
            store.record_usage_event(user.id, "chat", 0)

            async def _guard_stream():
                yield f"data: {_json.dumps({'type': 'text_delta', 'delta': _reject_msg})}\n\n"
                yield f"data: {_json.dumps({'type': 'done', 'session_id': conv_id, 'route': 'chat', 'citations': [], 'arxiv_papers': [], 'title': created_title, 'report_id': None})}\n\n"

            return StreamingResponse(_guard_stream(), media_type="text/event-stream")

    original_message = req.message

    agent = OrchestratorAgent(
        api_key=res.settings.anthropic_api_key,
        model=res.settings.anthropic_model,
        model_light=res.settings.anthropic_model_light,
        nasa_api_key=res.settings.nasa_api_key,
        tavily_key=res.settings.tavily_api_key,
        serpapi_api_key=res.settings.serpapi_api_key,
        store=res.store,
        vector=res.vector,
        embedder=res.embedder,
        reranker=res.reranker,
        user_id=user.id,
        doc_ids=parsed_doc_ids,
        enabled_sources=store.enabled_source_keys(),
        image_data=req.image_data,
        images_dir=res.settings.images_dir,
        conversation_id=conv_id,
        locale=req.locale or "vi",
    )

    async def event_stream():
        final_text = ""
        final_route = "chat"
        final_citations: list = []
        final_arxiv_papers: list = []
        final_web_sources: list = []
        final_search_images: list = []
        final_report_id: str | None = None
        final_analysis_data: dict | None = None
        final_suggested_action: dict | None = None

        with meter() as m:
            try:
                async for event in agent.run(req.message, memory, dry_run=req.dry_run):
                    if event.type == "text_delta":
                        final_text += event.delta
                    elif event.type == "done":
                        final_route = event.route
                        final_citations = event.citations
                        final_arxiv_papers = event.arxiv_papers
                        final_web_sources = event.web_sources
                        final_search_images = event.search_images
                        final_report_id = event.report_id
                        final_analysis_data = event.analysis_data
                        final_suggested_action = event.suggested_action
                        continue
                    yield f"data: {event.to_json()}\n\n"
            finally:
                # Always persist messages, even when client disconnects mid-stream
                store.append_message(conv_id, "user", original_message, image_url=saved_image_url)
                store.append_message(
                    conv_id, "assistant", final_text,
                    route=final_route, citations=final_citations or None,
                    arxiv_papers=final_arxiv_papers or None,
                    web_sources=final_web_sources or None,
                    search_images=final_search_images or None,
                    analysis_data=final_analysis_data,
                )
                feature = (
                    "search" if final_route.startswith("search")
                    else "notebook" if final_route.startswith("notebook")
                    else "report" if final_route == "report"
                    else "image" if final_route == "image"
                    else "chat"
                )
                store.record_usage_event(user.id, feature, m.total)

        yield f"data: {_json.dumps({'type': 'done', 'session_id': conv_id, 'route': final_route, 'citations': final_citations, 'arxiv_papers': final_arxiv_papers, 'web_sources': final_web_sources, 'search_images': final_search_images, 'title': created_title, 'report_id': final_report_id, 'suggested_action': final_suggested_action})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/conversations")
def list_conversations(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    items = res.store.list_conversations(user.id, limit=limit, offset=offset)
    total = res.store.count_conversations(user.id)
    return {"conversations": items, "has_more": offset + len(items) < total}


@app.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    conv = res.store.get_conversation(conversation_id, user.id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Unknown conversation")
    return {
        "id": conv["id"], "title": conv["title"], "pinned": conv["pinned"],
        "messages": res.store.get_messages(conversation_id),
    }


@app.patch("/conversations/{conversation_id}")
def update_conversation(
    conversation_id: str, body: ConversationUpdate,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    if body.pinned is not None:
        if not res.store.set_pinned(conversation_id, user.id, body.pinned):
            raise HTTPException(status_code=404, detail="Unknown conversation")
    if body.title is not None:
        t = body.title.strip()
        if not t:
            raise HTTPException(status_code=400, detail="title cannot be empty")
        if not res.store.rename_conversation(conversation_id, user.id, t):
            raise HTTPException(status_code=404, detail="Unknown conversation")
    return {"id": conversation_id}


@app.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    if not res.store.delete_conversation(conversation_id, user.id):
        raise HTTPException(status_code=404, detail="Unknown conversation")
    return {"ok": True}


@app.post("/conversations/{conversation_id}/share")
def share_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    res: Resources = Depends(get_resources),
) -> dict:
    token = res.store.create_share_token(conversation_id, user.id)
    if token is None:
        raise HTTPException(status_code=404, detail="Hội thoại không tồn tại")
    return {"token": token}


@app.get("/share/{token}")
def get_shared(token: str, res: Resources = Depends(get_resources)) -> dict:
    data = res.store.get_shared_conversation(token)
    if data is None:
        raise HTTPException(status_code=404, detail="Link chia sẻ không hợp lệ hoặc đã hết hạn")
    return data


# ---- newsletter (public, no auth required) ----

@app.post("/newsletter/subscribe")
def newsletter_subscribe(
    body: NewsletterSubscribe,
    res: Resources = Depends(get_resources),
) -> dict:
    res.store.subscribe_newsletter(body.email)
    return {"ok": True}
