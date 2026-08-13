# AstroMind

> AI assistant đa tác nhân chuyên về thiên văn học — hội thoại, RAG có trích dẫn, tìm kiếm NASA/arXiv, phân tích ảnh thiên văn và báo cáo xu hướng.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Claude](https://img.shields.io/badge/Claude-API-D97706?logo=anthropic)
![License](https://img.shields.io/badge/license-MIT-22c55e)

---

## Tính năng

- **Chat đa tác nhân** — OrchestratorAgent điều phối SearchAgent, NotebookAgent, ReportAgent, ImageAgent với extended thinking (interleaved-thinking beta)
- **Notebook RAG** — tải PDF/DOCX/FITS, phân đoạn, embed (multilingual-e5-small), rerank và trả lời có trích dẫn nguồn
- **Tìm kiếm NASA/arXiv** — APOD, NASA Images, web search (Tavily), lọc bài báo arXiv
- **Phân tích ảnh** — Claude Vision + CNN phân loại hình thái thiên hà (Keras), FITS viewer với colormap/stretch
- **Báo cáo xu hướng** — Google Trends + arXiv, xuất PDF
- **Admin dashboard** — quản lý user, quota, data source, usage analytics
- **I18n** — Tiếng Việt / English / 日本語

## Kiến trúc

```
frontend (Next.js 14)  ──API proxy──▶  backend (FastAPI)
                                            │
                        ┌───────────────────┼────────────────────┐
                        │                   │                    │
                   ChromaDB            SQLite (ORM)        Anthropic API
                (vector store)       (users, docs,        (Claude claude-sonnet-4-6
                                      sessions)            + Haiku sub-agents)
```

## Yêu cầu

- Python 3.11+ với [uv](https://docs.astral.sh/uv/)
- Node.js 18+ với [pnpm](https://pnpm.io/)
- Anthropic API key

## Chạy local

```bash
# Backend
cd backend
cp .env.example .env        # điền ANTHROPIC_API_KEY, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
uv sync
uv run uvicorn src.api.app:app --reload   # http://localhost:8000

# Frontend (terminal mới)
cd frontend
pnpm install
pnpm dev                    # http://localhost:3000
```

Mở http://localhost:3000 → đăng ký tài khoản hoặc đăng nhập bằng `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Docker

```bash
cp backend/.env.example backend/.env   # điền các biến bắt buộc
cp .env.example .env                   # CLOUDFLARE_TUNNEL_TOKEN (tuỳ chọn)

docker compose up -d --build
```

Dữ liệu (SQLite, ChromaDB, uploads) được lưu trong volume `astromind_data`.  
Truy cập tại http://localhost:3000.

## Biến môi trường

`backend/.env` — copy từ `backend/.env.example`:

| Biến | Bắt buộc | Mô tả |
|---|:---:|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key |
| `JWT_SECRET` | ✅ | ≥ 32 ký tự ngẫu nhiên (`python -c "import secrets; print(secrets.token_urlsafe(32))"`) |
| `ADMIN_EMAIL` | ✅ | Email tài khoản admin khởi tạo |
| `ADMIN_PASSWORD` | ✅ | Mật khẩu admin |
| `GOOGLE_CLIENT_ID/SECRET` | ☐ | OAuth Google |
| `GITHUB_CLIENT_ID/SECRET` | ☐ | OAuth GitHub |
| `NASA_API_KEY` | ☐ | APOD + NASA Images (mặc định `DEMO_KEY`) |
| `TAVILY_API_KEY` | ☐ | Web search |
| `SERPAPI_API_KEY` | ☐ | Google Trends (báo cáo xu hướng) |
| `ANTHROPIC_MODEL` | ☐ | Orchestrator model (mặc định `claude-sonnet-4-6`) |
| `ANTHROPIC_MODEL_LIGHT` | ☐ | Sub-agent model (mặc định `claude-haiku-4-5-20251001`) |
| `COOKIE_SECURE` | ☐ | `true` khi chạy qua HTTPS |

## Galaxy Morphology Model

File `galaxy_morphology_predictor/galaxy_morphology_predictor.keras` (~40 MB) không được commit vào repo. Để kích hoạt phân loại hình thái thiên hà:

1. Đặt file model vào `galaxy_morphology_predictor/galaxy_morphology_predictor.keras`
2. Hoặc set `GALAXY_MODEL_PATH=/path/to/model.keras` trong `.env`

Nếu không có model, `ImageAgent` vẫn hoạt động bình thường bằng Claude Vision.

## Kiểm thử

```bash
cd backend && uv run pytest
cd frontend && pnpm lint && pnpm build
```

## License

MIT
