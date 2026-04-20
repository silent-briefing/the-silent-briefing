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
    perplexity_api_key: str = ""
    perplexity_base_url: str = "https://api.perplexity.ai"
    # Must match `rag_chunks.embedding` dimensions (1024 for pplx-embed-v1-0.6b full output).
    embedding_model_id: str = "pplx-embed-v1-0.6b"
    embedding_dimensions: int = 1024
    # Default model IDs: Perplexity Sonar family only (Chat Completions API).
    # See https://docs.perplexity.ai/docs/sonar/models — adjust per tier/cost.
    writer_model: str = "sonar-pro"
    adversarial_model: str = "sonar-reasoning-pro"
    correlation_model: str = "sonar"
    # Dedicated research / evidence-gathering runs (higher latency & cost than hot path).
    research_model: str = "sonar-deep-research"
    http_user_agent: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 SilentBriefing/1.0"
    )
    vote_utah_filings_url: str = "https://vote.utah.gov/2026-candidate-filings/"
    slco_candidate_list_url: str = (
        "https://www.saltlakecounty.gov/clerk/elections/current-candidate-list/"
    )
    slco_playwright_enabled: bool = False
    extraction_artifacts_dir: str = ""
    extraction_artifacts_retention_days: int = 14
    google_civic_api_key: str = ""
    google_civic_voter_address: str = ""
    google_civic_election_id: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
