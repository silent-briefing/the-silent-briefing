from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env.local", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str = "http://127.0.0.1:54321"
    supabase_service_role_key: str = ""
    database_url: str = ""
    backend_service_key: str = ""
    writer_model: str = "claude-sonnet-4-5"
    adversarial_model: str = "grok-4"
    correlation_model: str = "sonar"


@lru_cache
def get_settings() -> Settings:
    return Settings()
