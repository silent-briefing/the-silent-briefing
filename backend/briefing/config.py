from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from briefing.defaults import source_urls as _urls


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
    # Stage 1 A/B/C retrieval passes (Step 3); default to cheap Sonar unless overridden.
    retrieval_model: str = "sonar"
    # Dedicated research / evidence-gathering runs (higher latency & cost than hot path).
    research_model: str = "sonar-deep-research"
    http_user_agent: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 SilentBriefing/1.0"
    )
    # External source URLs — override via env when sites move (see defaults/source_urls.py).
    vote_utah_filings_url: str = Field(default=_urls.VOTE_UTAH_FILINGS_PAGE)
    slco_candidate_list_url: str = Field(default=_urls.SLCO_CANDIDATE_LIST_PAGE)
    utcourts_supreme_roster_url: str = Field(default=_urls.UTCOURTS_SUPREME_ROSTER_HTML)
    utcourts_site_origin: str = Field(default=_urls.UTCOURTS_SITE_ORIGIN)
    ut_legacy_opinion_index_url: str = Field(default=_urls.UT_LEGACY_SUPREME_OPINION_INDEX)
    ballotpedia_base_url: str = Field(default=_urls.BALLOTPEDIA_ORIGIN)
    google_civic_elections_url: str = Field(default=_urls.GOOGLE_CIVIC_ELECTIONS)
    google_civic_divisions_by_address_url: str = Field(
        default=_urls.GOOGLE_CIVIC_DIVISIONS_BY_ADDRESS
    )
    google_civic_voterinfo_url: str = Field(default=_urls.GOOGLE_CIVIC_VOTERINFO)
    slco_playwright_enabled: bool = False
    extraction_artifacts_dir: str = ""
    extraction_artifacts_retention_days: int = 14
    google_civic_api_key: str = ""
    google_civic_voter_address: str = ""
    google_civic_election_id: str = ""
    # Step 3 routing (U3.4): comma-separated A,B,C — GOP skips judicial-record (B) by default.
    retrieval_stage_spec_gop: str = Field(default="A,C")
    retrieval_stage_spec_default: str = Field(default="A,B,C")
    # Days without a retrieval_sonar claim before ``--skip-if-fresh`` treats official as stale; 0 = always stale.
    retrieval_stale_days: int = Field(default=30, ge=0)


@lru_cache
def get_settings() -> Settings:
    return Settings()
