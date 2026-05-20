from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    log_level: str = "INFO"

    database_url: str = "postgresql+psycopg://wce:wce@localhost:5432/wce"

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    workflow_max_retries: int = 5
    workflow_retry_backoff_base_seconds: int = 30
    simulate_external_failure: int = 0

    # CORS — comma-separated list of allowed origins
    # e.g. ALLOWED_ORIGINS=https://wce.vercel.app,https://staging.wce.vercel.app
    allowed_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"

    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
