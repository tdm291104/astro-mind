<div align="center">
  <img src="docs/icon.svg" alt="AstroMind" width="120" height="120">
  <h1>AstroMind</h1>
  <p>A multi-agent AI assistant for astronomy — conversational search, RAG with citations, NASA/arXiv integration, astronomical image analysis, and trend reports.</p>

  ![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
  ![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
  ![Claude](https://img.shields.io/badge/Claude-API-D97706?logo=anthropic)
  ![License](https://img.shields.io/badge/license-MIT-22c55e)

  <sub>Graduation project — University of Science and Technology, The University of Da Nang (DUT)</sub>
</div>

---

## Features

- **Multi-agent orchestration** — OrchestratorAgent coordinates SearchAgent, NotebookAgent, ReportAgent, and ImageAgent with extended thinking (interleaved-thinking beta)
- **RAG Notebook** — upload PDF/DOCX/FITS files, chunk, embed (multilingual-e5-small), rerank, and answer with inline citations
- **NASA/arXiv search** — APOD, NASA Images, web search (Tavily), arXiv paper filtering
- **Image analysis** — Claude Vision + CNN galaxy morphology classifier (Keras), FITS viewer with colormap and stretch controls
- **Trend reports** — Google Trends + arXiv paper volume, exported as PDF
- **Admin dashboard** — user management, quota configuration, data source monitoring, usage analytics
- **i18n** — Vietnamese / English / Japanese

## Architecture

```
frontend (Next.js 14)  ──API proxy──▶  backend (FastAPI)
                                              │
                          ┌───────────────────┼────────────────────┐
                          │                   │                    │
                     ChromaDB            SQLite (ORM)        Anthropic API
                  (vector store)       (users, docs,        (Sonnet orchestrator
                                         sessions)           + Haiku sub-agents)
```

## Prerequisites

- Python 3.11+ with [uv](https://docs.astral.sh/uv/)
- Node.js 18+ with [pnpm](https://pnpm.io/)
- An [Anthropic API key](https://console.anthropic.com/)

## Local Development

```bash
# Backend
cd backend
cp .env.example .env        # fill in ANTHROPIC_API_KEY, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
uv sync
uv run uvicorn src.api.app:app --reload   # http://localhost:8000

# Frontend (new terminal)
cd frontend
pnpm install
pnpm dev                    # http://localhost:3000
```

Open http://localhost:3000 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Docker

```bash
cp backend/.env.example backend/.env   # fill in required variables
cp .env.example .env                   # CLOUDFLARE_TUNNEL_TOKEN (optional)

docker compose up -d --build
```

Application data (SQLite, ChromaDB, uploads) is stored in the `astromind_data` named volume.  
Access at http://localhost:3000.

## Environment Variables

`backend/.env` — copy from `backend/.env.example`:

| Variable | Required | Description |
|---|:---:|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key |
| `JWT_SECRET` | ✅ | Random string ≥ 32 chars (`python -c "import secrets; print(secrets.token_urlsafe(32))"`) |
| `ADMIN_EMAIL` | ✅ | Bootstrap admin email |
| `ADMIN_PASSWORD` | ✅ | Bootstrap admin password |
| `GOOGLE_CLIENT_ID/SECRET` | ☐ | Google OAuth |
| `GITHUB_CLIENT_ID/SECRET` | ☐ | GitHub OAuth |
| `NASA_API_KEY` | ☐ | APOD + NASA Images (defaults to `DEMO_KEY`) |
| `TAVILY_API_KEY` | ☐ | Web search |
| `SERPAPI_API_KEY` | ☐ | Google Trends (trend reports) |
| `ANTHROPIC_MODEL` | ☐ | Orchestrator model (default: `claude-sonnet-4-6`) |
| `ANTHROPIC_MODEL_LIGHT` | ☐ | Sub-agent model (default: `claude-haiku-4-5-20251001`) |
| `COOKIE_SECURE` | ☐ | Set `true` when running behind HTTPS |

## Galaxy Morphology Model

`galaxy_morphology_predictor/galaxy_morphology_predictor.keras` (~40 MB) is not committed to the repository. To enable galaxy morphology classification:

1. Place the model file at `galaxy_morphology_predictor/galaxy_morphology_predictor.keras`
2. Or set `GALAXY_MODEL_PATH=/path/to/model.keras` in `.env`

Without the model, `ImageAgent` still works using Claude Vision alone.

## Testing

```bash
cd backend && uv run pytest
cd frontend && pnpm lint && pnpm build
```

## License

MIT — see [LICENSE](LICENSE).
