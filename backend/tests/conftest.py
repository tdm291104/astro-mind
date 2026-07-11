from pathlib import Path

import pytest

# HF_HOME normalization now lives in production code: persistence.embed runs a
# write-probe fallback at import time (the only module that imports
# huggingface_hub). Tests no longer need to clear HF_HOME themselves.


@pytest.fixture
def ingest_doc():
    """Parse + persist a fixture file into the current DATA_DIR.

    Mirrors the (now-removed) `cli ingest` command's local-file path, for tests
    that need a document in the store/vector index to query against.
    """

    def _ingest(path: Path):
        from core.config import Settings
        from core.models import Document
        from ingestion import pipeline as ingestion
        from persistence.embed import Embedder
        from persistence.store import MetaStore
        from persistence.vector import VectorStore

        settings = Settings()
        settings.ensure_dirs()
        store = MetaStore(settings.db_path)
        vector = VectorStore(settings.chroma_dir)
        embedder = Embedder(settings.embed_model)

        suffix = path.suffix.lower()
        doc_type = ingestion.PARSERS[suffix][1]
        blocks = ingestion.parse_file(path)
        doc = Document(name=path.name, type=doc_type, file_path=str(path), page_count=0)
        return ingestion.persist_document(doc, blocks, store=store, vector=vector, embedder=embedder)

    return _ingest


@pytest.fixture
def tmp_data_dir(tmp_path: Path) -> Path:
    """Isolated data dir per test."""
    d = tmp_path / "data"
    d.mkdir()
    return d


@pytest.fixture
def env_anthropic_key(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Provide a dummy Anthropic key + isolate from the developer's .env and env vars."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-not-used")
    monkeypatch.delenv("ANTHROPIC_MODEL", raising=False)
    monkeypatch.delenv("ANTHROPIC_MODEL_LIGHT", raising=False)
    monkeypatch.delenv("EMBED_MODEL", raising=False)
    monkeypatch.delenv("DATA_DIR", raising=False)
    monkeypatch.delenv("LOG_LEVEL", raising=False)
    monkeypatch.delenv("NASA_API_KEY", raising=False)
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)
    monkeypatch.delenv("SERPAPI_API_KEY", raising=False)
    monkeypatch.delenv("MODEL_PATH", raising=False)
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-0123456789-abcdefgh")
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    monkeypatch.chdir(tmp_path)


@pytest.fixture(autouse=True)
def _quiet_chroma_telemetry(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ANONYMIZED_TELEMETRY", "False")
    monkeypatch.setenv("CHROMA_TELEMETRY", "False")
