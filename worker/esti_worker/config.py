"""Worker configuration from environment."""
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379"
    worker_job_stream: str = "esti:jobs"
    worker_group: str = "esti-workers"
    consumer_name: str = "worker-1"

    # Reliability: retry a failed/abandoned job up to N deliveries, reclaiming
    # entries left pending (crashed/stuck consumer) after they go idle, then
    # route the poison job to a dead-letter stream.
    worker_max_retries: int = 3
    worker_reclaim_idle_ms: int = 30000
    worker_dead_letter_stream: str = "esti:jobs:dead"

    # Domains not yet migrated to Supabase (inspection, measurement_book,
    # reconcile — see db.py's module docstring) still read/write here via
    # psycopg. Everything else uses supabase_url/supabase_service_role_key
    # below. Not a fallback for each other — two separate data sources during
    # the migration, per-domain, not per-environment.
    database_url: str = "postgres://esti:esti@localhost:5432/esti"

    # Aliased to NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (matching
    # web/'s own .env, not Python convention) so the same secret has one name
    # across both services sharing the project, rather than two names for
    # one value.
    supabase_url: str = Field(default="", validation_alias="NEXT_PUBLIC_SUPABASE_URL")
    supabase_service_role_key: str = Field(
        default="", validation_alias="SUPABASE_SERVICE_ROLE_KEY"
    )

    # Defaults are the old local MinIO dev values. In an environment wired to
    # Supabase Storage (see storage.py's module docstring), set S3_ENDPOINT to
    # https://<project-ref>.supabase.co/storage/v1/s3 and S3_ACCESS_KEY/
    # S3_SECRET_KEY to a Storage S3 access-key pair (Supabase dashboard →
    # Storage → S3 Access Keys — not the service-role key above).
    s3_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "esti-documents"
    s3_access_key: str = "esti"
    s3_secret_key: str = "esti-secret"


settings = Settings()
