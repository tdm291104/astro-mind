# AstroMind

Multi-agent AI assistant chuyên về thiên văn học. Hỗ trợ hội thoại, notebook RAG với trích dẫn nguồn, tìm kiếm NASA/arXiv, phân tích ảnh thiên văn, FITS viewer và admin dashboard.

**Stack:** FastAPI · Next.js 14 · Claude API · ChromaDB · SQLite · Keras CNN

---

## Quickstart

```bash
# Backend
cd backend
uv sync
cp .env.example .env
# Chỉnh .env (xem bảng biến môi trường bên dưới)
uv run uvicorn src.api.app:app --reload   # :8000

# Frontend (terminal khác)
cd frontend
pnpm install
pnpm dev   # :3000
```

Mở http://localhost:3000 → đăng ký tài khoản hoặc đăng nhập bằng `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

---

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key |
| `JWT_SECRET` | ✅ | ≥ 32 ký tự ngẫu nhiên |
| `ADMIN_EMAIL` | ✅ | Email tài khoản admin |
| `ADMIN_PASSWORD` | ✅ | Mật khẩu admin |
| `ANTHROPIC_MODEL` | ☐ | Orchestrator model (mặc định `claude-sonnet-4-6`) |
| `ANTHROPIC_MODEL_LIGHT` | ☐ | Sub-agent model (mặc định `claude-haiku-4-5-20251001`) |
| `NASA_API_KEY` | ☐ | APOD + NASA Images (mặc định `DEMO_KEY`) |
| `TAVILY_API_KEY` | ☐ | Web search |
| `SERPAPI_API_KEY` | ☐ | Google Trends cho báo cáo xu hướng |
| `GALAXY_MODEL_PATH` | ☐ | Path tới model Keras (mặc định `galaxy_morphology_predictor/galaxy_morphology_predictor.keras`) |
| `COOKIE_SECURE` | ☐ | `true` khi chạy qua HTTPS |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ☐ | OAuth Google |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | ☐ | OAuth GitHub |

---

## Docker

```bash
cp backend/.env.example backend/.env
# Điền các biến bắt buộc

docker compose up -d --build

# Xem logs
docker compose logs -f backend
```

Dữ liệu (SQLite, ChromaDB, ảnh, tài liệu) được lưu trong named volume `astromind_data`. Truy cập tại http://localhost:3000.

---

## Testing

```bash
# Backend
cd backend && uv run pytest

# Frontend
cd frontend && pnpm lint && pnpm build
```

---

## Galaxy Morphology Model

File `galaxy_morphology_predictor/galaxy_morphology_predictor.keras` (~40MB) không được commit vào repo. Để dùng tính năng phân tích hình thái thiên hà:

1. Tải model và đặt vào `galaxy_morphology_predictor/galaxy_morphology_predictor.keras`
2. Hoặc set `GALAXY_MODEL_PATH=/path/to/model.keras` trong `.env`

Nếu không có model, `ImageAgent` vẫn hoạt động bình thường bằng Claude Vision.
