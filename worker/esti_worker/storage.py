"""Object-storage access for the worker (MinIO / S3 via boto3) with BYOS.

DEFAULT mode targets **Supabase Storage** (Phase 6, docs/esti/
NEXTJS-MIGRATION-PHASE6-AUDIT.md) via its S3-compatible API — set
`S3_ENDPOINT` to `https://<project-ref>.supabase.co/storage/v1/s3` and
`S3_ACCESS_KEY`/`S3_SECRET_KEY` to a set of Storage S3 access keys (Supabase
dashboard → Storage → S3 Access Keys, a *different* credential pair from the
service-role key `supabase_client.py` uses for PostgREST). The boto3 client
code below is unchanged from the old MinIO setup — Supabase Storage's
S3-compatible surface is a drop-in target for the same client, only the
endpoint/credentials move. This is storage, a single axis independent of
which domains' *rows* have migrated to Supabase (db.py) — every job's file
bytes move here regardless.

Per-firm BYOS is otherwise resolved from `esti_orgsettings.storage_settings`
in the old schema, which has no Supabase-side equivalent yet (`db.py`'s
`fetch_storage_settings()` always returns DEFAULT now — flagged there, not
silently dropped, per the Phase 6 audit's recommendation to keep S3/NAS BYOS
modes real rather than remove them from a live self-hosted-VPS feature):
  - DEFAULT → env config (now Supabase Storage; was MinIO)
  - NAS     → local filesystem at a configured (mounted) path — unaffected,
              still real for the self-hosted VPS deployment model
  - S3      → the firm's own S3-compatible endpoint/bucket/keys — unaffected,
              already storage-agnostic
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import boto3
from botocore.client import Config

from .config import settings
from .db import fetch_storage_settings

_client = None
_ensured_buckets: set[str] = set()


def s3():
    """The env-configured S3 client (DEFAULT mode)."""
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name="us-east-1",
            config=Config(signature_version="s3v4"),
        )
    return _client


@dataclass
class Backend:
    kind: str  # "default" | "fs" | "s3"
    root: str | None = None
    client: Any | None = None
    bucket: str | None = None


def backend_from_settings(cfg: dict[str, Any]) -> Backend:
    """Pure mapping from a storage_settings dict to an active backend descriptor."""
    mode = (cfg or {}).get("mode", "DEFAULT")
    if mode == "NAS" and (cfg.get("nasPath") or "").strip():
        return Backend(kind="fs", root=str(cfg["nasPath"]).strip())
    if mode == "S3" and (cfg.get("s3Endpoint") or "").strip() and (cfg.get("s3Bucket") or "").strip():
        client = boto3.client(
            "s3",
            endpoint_url=str(cfg["s3Endpoint"]).strip(),
            aws_access_key_id=cfg.get("s3AccessKey") or "",
            aws_secret_access_key=cfg.get("s3SecretKey") or "",
            region_name=cfg.get("s3Region") or "us-east-1",
            config=Config(signature_version="s3v4"),
        )
        return Backend(kind="s3", client=client, bucket=str(cfg["s3Bucket"]).strip())
    return Backend(kind="default")


_cached: Backend | None = None
_cached_at: float = 0.0
_TTL = 10.0  # seconds — pick up config changes within 10s, reuse within a job


def resolve_backend() -> Backend:
    global _cached, _cached_at
    now = time.monotonic()
    if _cached is None or now - _cached_at > _TTL:
        _cached = backend_from_settings(fetch_storage_settings())
        _cached_at = now
    return _cached


def _fs_path(root: str, key: str) -> Path:
    base = Path(root).resolve()
    p = (base / key).resolve()
    if base != p and base not in p.parents:
        raise ValueError("invalid storage key")
    return p


def ensure_bucket(bucket: str) -> None:
    """Idempotently create the documents bucket (MinIO does not auto-provision)."""
    b = resolve_backend()
    if b.kind == "fs":
        Path(b.root).mkdir(parents=True, exist_ok=True)
        return
    client = b.client if b.kind == "s3" else s3()
    target = b.bucket if b.kind == "s3" else bucket
    if target in _ensured_buckets:
        return
    try:
        client.head_bucket(Bucket=target)
    except client.exceptions.ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code not in ("404", "NoSuchBucket", "NotFound"):
            raise
        client.create_bucket(Bucket=target)
    _ensured_buckets.add(target)


def get_bytes(bucket: str, key: str) -> bytes:
    b = resolve_backend()
    if b.kind == "fs":
        return _fs_path(b.root, key).read_bytes()
    if b.kind == "s3":
        return b.client.get_object(Bucket=b.bucket, Key=key)["Body"].read()
    return s3().get_object(Bucket=bucket, Key=key)["Body"].read()


def put_bytes(bucket: str, key: str, data: bytes, content_type: str) -> None:
    b = resolve_backend()
    if b.kind == "fs":
        path = _fs_path(b.root, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return
    if b.kind == "s3":
        ensure_bucket(bucket)
        b.client.put_object(Bucket=b.bucket, Key=key, Body=data, ContentType=content_type)
        return
    ensure_bucket(bucket)
    s3().put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
