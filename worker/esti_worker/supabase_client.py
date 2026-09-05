"""Thin PostgREST client for the domains Phase 2-10 migrated to Supabase.

Phase 6 (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md) resolved its central
open question — Hostinger Managed App Hosting (the web/ Next.js app's
deployment target) is Node.js-only with no documented background-worker,
Redis, or Python support, so this worker stays a standalone Python process
reading Redis Streams, wherever it's actually hosted (today: the existing
VPS, unchanged). What DOES change regardless of that hosting answer is who
the worker's fetch/update functions talk to: `web/`'s live data lives in
Supabase now, reached over PostgREST (the direct Postgres connection is
IPv6-only and unreachable from most networks — the same reason `web/`'s own
migrations go through the Supabase Management API rather than a raw
connection), not the old backend's Postgres.

Only domains with a real Supabase table use this client (see db.py's module
docstring for the exact list). Domains Phase 2-10 haven't migrated yet
(inspection, measurement_book, reconcile) keep using psycopg against
DATABASE_URL until they get their own migration — this module does not
replace that path, it sits alongside it.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from .config import settings


def _headers(*, prefer: str | None = None) -> dict[str, str]:
    h = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def _url(table: str) -> str:
    return f"{settings.supabase_url}/rest/v1/{table}"


def get_one(table: str, row_id: str, select: str = "*") -> dict[str, Any] | None:
    """Fetch a single row by id, optionally with PostgREST embedded-resource
    joins in `select` (e.g. "*,project:project_offices(ref,title)")."""
    resp = httpx.get(
        _url(table),
        params={"id": f"eq.{row_id}", "select": select},
        headers=_headers(),
        timeout=30.0,
    )
    resp.raise_for_status()
    rows = resp.json()
    return rows[0] if rows else None


def get_list(
    table: str,
    filters: dict[str, str],
    select: str = "*",
    order: str | None = None,
) -> list[dict[str, Any]]:
    """Fetch every row matching `filters` (each value a PostgREST operator
    expression, e.g. {"bill_id": "eq.<uuid>"})."""
    params: dict[str, str] = {**filters, "select": select}
    if order:
        params["order"] = order
    resp = httpx.get(_url(table), params=params, headers=_headers(), timeout=30.0)
    resp.raise_for_status()
    return resp.json()


def patch(table: str, row_id: str, fields: dict[str, Any]) -> None:
    """Patch a row by id. jsonb-typed fields (dicts/lists) are sent as-is —
    PostgREST accepts a JSON body and serializes object/array values into
    the column's jsonb type on its own, no explicit cast needed (unlike the
    raw-SQL `::jsonb` cast the psycopg path used)."""
    if not fields:
        return
    resp = httpx.patch(
        _url(table),
        params={"id": f"eq.{row_id}"},
        headers=_headers(prefer="return=minimal"),
        content=json.dumps(fields),
        timeout=30.0,
    )
    resp.raise_for_status()
