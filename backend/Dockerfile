FROM python:3.12-slim

WORKDIR /app

# Don't persist uv's wheel cache in the image — it duplicates everything
# already installed into .venv (was ~6.6GB of dead weight).
ENV UV_NO_CACHE=1

# Native libs required by WeasyPrint (PDF report export) for text shaping/rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies (cached layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy source and install the project itself, so `uv run` at container
# start doesn't need to re-sync (and hit PyPI) on every restart.
COPY src/ ./src/
RUN uv sync --frozen --no-dev

ENV PYTHONPATH=/app/src \
    PYTHONUNBUFFERED=1

# Pre-download the embedding & reranker models into the image so the first
# notebook ingest/query after startup doesn't block on a HuggingFace download.
RUN uv run python -c "\
from persistence.embed import Embedder; \
from persistence.rerank import Reranker; \
Embedder('intfloat/multilingual-e5-small').embed_one('warmup'); \
Reranker('cross-encoder/mmarco-mMiniLMv2-L12-H384-v1').score('warmup', ['warmup'])"

# Create data directories
RUN mkdir -p data/docs data/chroma data/images

EXPOSE 8000

CMD ["uv", "run", "--no-dev", "uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "8000"]
