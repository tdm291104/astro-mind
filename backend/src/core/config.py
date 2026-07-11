from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    anthropic_api_key: str
    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_model_light: str = "claude-haiku-4-5-20251001"
    embed_model: str = "intfloat/multilingual-e5-small"
    rerank_model: str = "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1"
    data_dir: Path = Path("./data")
    log_level: str = "INFO"
    nasa_api_key: str = "DEMO_KEY"
    tavily_api_key: str = ""
    serpapi_api_key: str = ""
    galaxy_model_path: str = "galaxy_morphology_predictor/galaxy_morphology_predictor.keras"
    cost_per_1k_tokens: float = 0.0007
    jwt_secret: str = ""
    jwt_expire_days: int = 7
    cookie_secure: bool = False
    cors_origins: list[str] = ["http://localhost:3000"]
    frontend_url: str = "http://localhost:3000"
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
    admin_email: str = ""
    admin_password: str = ""

    @property
    def docs_dir(self) -> Path:
        return self.data_dir / "docs"

    @property
    def chroma_dir(self) -> Path:
        return self.data_dir / "chroma"

    @property
    def db_path(self) -> Path:
        return self.data_dir / "astromind.db"

    @property
    def images_dir(self) -> Path:
        return self.data_dir / "images"

    def ensure_dirs(self) -> None:
        self.docs_dir.mkdir(parents=True, exist_ok=True)
        self.chroma_dir.mkdir(parents=True, exist_ok=True)
        self.images_dir.mkdir(parents=True, exist_ok=True)
