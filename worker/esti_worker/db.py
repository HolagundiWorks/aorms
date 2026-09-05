"""Job-result write-back and record fetch, split across two data sources.

Phase 6 (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md) resolved the worker's
hosting-topology question (stays a standalone Python process wherever it's
hosted; Hostinger Managed App Hosting — web/'s Next.js target — is Node-only
with no background-worker/Redis/Python support) and then ported this file's
functions domain-by-domain, matching exactly which domains Phases 2-10
actually migrated to Supabase — not a big-bang cutover, the same incremental
discipline every other phase used.

Migrated to Supabase (via `supabase_client`'s PostgREST helpers), because
`web/`'s live data for these domains already lives there:
  invoice, proposal (feeproposal + proposal — the same `proposals` table
  since the "unified proposals" model, migration 0116), transmittal,
  specsheet, payslip, progress_report, site_instruction, pmc_ra_bill,
  feasibility_report, letter, drawing.

Still on psycopg against DATABASE_URL, unchanged: inspection,
measurement_book, and reconcile (`fetch_open_invoices`/`update_reconcile`).
None of these three has a Supabase table yet — inspection and
measurement_book are real, un-ported domains (Phase 4's own explicit
deferral for measurement_book; inspection was never assigned a phase at
all), and reconcile is Phase 3's own explicit deferral ("a large feature in
its own right"). Not dead code like `engagement_register` was (already
removed, see ROADMAP-CLOUD.md's cleanup backlog) — genuinely un-migrated
features, left exactly as they were rather than silently dropped or ported
against a table that doesn't exist.
"""
from __future__ import annotations

import json
from typing import Any

import psycopg
from psycopg.rows import dict_row

from . import supabase_client as sb
from .config import settings


def fetch_storage_settings() -> dict[str, Any]:
    """BYOS per-firm storage override (`esti_orgsettings.storage_settings` in
    the old schema) has no Supabase-side equivalent yet — no orgsettings-style
    table was created by any Phase 2-10 migration. Always DEFAULT (Supabase
    Storage, wired in storage.py) until/unless a firm-settings table for it
    ships; flagged here rather than silently assumed, per the Phase 6 audit's
    "flag rather than silently drop" guidance for the NAS/S3 BYOS modes."""
    return {"mode": "DEFAULT"}


# ---------------------------------------------------------------------------
# Supabase-backed domains (Phases 2-10 migrated data)
# ---------------------------------------------------------------------------


def _flatten(row: dict[str, Any], alias: str, prefix: str, cols: tuple[str, ...]) -> dict[str, Any]:
    """Move a PostgREST embedded-resource sub-object's fields onto the parent
    row as `{prefix}_{col}`, matching the old SQL's `x.col as prefix_col`
    aliasing exactly. Missing/null embeds (an optional FK, e.g. letters'
    project_id) flatten to None fields rather than raising."""
    sub = row.pop(alias, None) or {}
    for c in cols:
        row[f"{prefix}_{c}"] = sub.get(c)
    return row


def update_invoice(invoice_id: str, **fields: Any) -> None:
    sb.patch("invoices", invoice_id, fields)


def fetch_invoice_full(invoice_id: str) -> dict[str, Any] | None:
    """Invoice tax snapshot joined with its project + client, for rendering."""
    row = sb.get_one(
        "invoices",
        invoice_id,
        select=(
            "ref,document_kind,gst_system,sac,inter_state,place_of_supply_state,"
            "taxable_paise,cgst_paise,sgst_paise,igst_paise,gst_total_paise,"
            "composition_levy_paise,tds_paise,grand_total_paise,net_receivable_paise,"
            "date_invoice,notes,"
            "project:project_offices(ref,title,city,state),"
            "client:clients(name,gstin,pan,state,city,email)"
        ),
    )
    if row is None:
        return None
    _flatten(row, "project", "project", ("ref", "title", "city", "state"))
    _flatten(row, "client", "client", ("name", "gstin", "pan", "state", "city", "email"))
    return row


def _fetch_phases(project_id: str) -> list[dict[str, Any]]:
    return sb.get_list(
        "phases",
        {"project_id": f"eq.{project_id}"},
        select="label,billing_pct",
        order="sort_order",
    )


def update_proposal(pid: str, **fields: Any) -> None:
    sb.patch("proposals", pid, fields)


# `feeproposal` and `proposal` are the same `proposals` table since the
# unified-proposals model (migration 0116) — kept as two function names
# because pdf.py's `_RENDERERS` still dispatches on the historical `target`
# strings (COA fee proposals vs. plain scope agreements), each with its own
# HTML template, but both read the identical row shape now.
update_feeproposal = update_proposal


def fetch_proposal_full(pid: str) -> dict[str, Any] | None:
    row = sb.get_one(
        "proposals",
        pid,
        select=(
            "ref,work_category,work_type,fee_basis,cost_of_works_paise,fee_paise,"
            "built_up_area_sqm,rate_per_sqm_paise,doc_comm_pct,coa_minimum_paise,"
            "below_minimum,override_reason,scope,notes,revision_no,"
            "project:project_offices(id,ref,title,project_type,jurisdiction,site_address,client_id)"
        ),
    )
    if row is None:
        return None
    proj = row.pop("project", None) or {}
    row["project_id"] = proj.get("id")
    row["project_ref"] = proj.get("ref")
    row["project_title"] = proj.get("title")
    row["project_type"] = proj.get("project_type")
    row["jurisdiction"] = proj.get("jurisdiction")
    row["site_address"] = proj.get("site_address")
    client_id = proj.get("client_id")
    client = sb.get_one("clients", client_id, select="name,city,state") if client_id else None
    row["client_name"] = (client or {}).get("name")
    row["client_city"] = (client or {}).get("city")
    row["client_state"] = (client or {}).get("state")
    row["phases"] = _fetch_phases(row["project_id"]) if row["project_id"] else []
    return row


fetch_feeproposal_full = fetch_proposal_full


def update_transmittal(tr_id: str, **fields: Any) -> None:
    sb.patch("transmittals", tr_id, fields)


def fetch_transmittal_full(tr_id: str) -> dict[str, Any] | None:
    """Transmittal + project + its item rows, for the cover-sheet PDF."""
    row = sb.get_one(
        "transmittals",
        tr_id,
        select=(
            "ref,recipient,purpose,channel,date_issued,notes,"
            "project:project_offices(ref,title)"
        ),
    )
    if row is None:
        return None
    _flatten(row, "project", "project", ("ref", "title"))
    row["items"] = sb.get_list(
        "transmittal_items",
        {"transmittal_id": f"eq.{tr_id}"},
        select="drawing_ref,title,rev,copies",
        order="created_at",
    )
    return row


def update_drawing(drawing_id: str, **fields: Any) -> None:
    """Patch a `drawings` row. `layers`/`bounds` are jsonb — PostgREST accepts
    the Python dict/list as-is in the JSON body, no manual cast needed."""
    sb.patch("drawings", drawing_id, fields)


def fetch_drawing_full(drawing_id: str) -> dict[str, Any] | None:
    """Drawing + its project, for the watermarked issue-set PDF."""
    row = sb.get_one(
        "drawings",
        drawing_id,
        select="ref,title,svg_key,file_name,project:project_offices(ref,title)",
    )
    if row is None:
        return None
    _flatten(row, "project", "project", ("ref", "title"))
    return row


def update_letter(lid: str, **fields: Any) -> None:
    sb.patch("letters", lid, fields)


def fetch_letter_full(lid: str) -> dict[str, Any] | None:
    """`project_id` is nullable on letters — an unset project flattens to
    `project_ref`/`project_title` = None rather than failing, matching the
    original LEFT JOIN's behavior."""
    row = sb.get_one(
        "letters",
        lid,
        select="ref,recipient,subject,body,date_letter,project:project_offices(ref,title)",
    )
    if row is None:
        return None
    _flatten(row, "project", "project", ("ref", "title"))
    return row


def update_specsheet(sid: str, **fields: Any) -> None:
    sb.patch("spec_sheets", sid, fields)


def fetch_specsheet_full(sid: str) -> dict[str, Any] | None:
    row = sb.get_one(
        "spec_sheets",
        sid,
        select="ref,title,project:project_offices(ref,title)",
    )
    if row is None:
        return None
    _flatten(row, "project", "project", ("ref", "title"))
    row["items"] = sb.get_list(
        "spec_items",
        {"spec_sheet_id": f"eq.{sid}"},
        select="category,item,make,specification,finish,remarks",
        order="sort_order",
    )
    return row


def update_payslip(payslip_id: str, **fields: Any) -> None:
    sb.patch("payslips", payslip_id, fields)


def fetch_payslip_full(payslip_id: str) -> dict[str, Any] | None:
    """Payslip joined with its team member, for rendering."""
    row = sb.get_one(
        "payslips",
        payslip_id,
        select=(
            "month,gross_paise,deductions_paise,net_paise,paid,paid_date,notes,"
            "member:team_members(name,role,employment_type,date_joined)"
        ),
    )
    if row is None:
        return None
    _flatten(row, "member", "member", ("name", "role", "employment_type", "date_joined"))
    return row


def update_progress_report(rid: str, **fields: Any) -> None:
    sb.patch("progress_reports", rid, fields)


def fetch_progress_report_full(rid: str) -> dict[str, Any] | None:
    row = sb.get_one(
        "progress_reports",
        rid,
        select=(
            "period_start,period_end,narrative,physical_progress_pct,"
            "schedule_progress_pct,open_snag_count,open_rfi_count,status,"
            "project:project_offices(ref,title)"
        ),
    )
    if row is None:
        return None
    _flatten(row, "project", "project", ("ref", "title"))
    return row


def update_site_instruction(sid: str, **fields: Any) -> None:
    sb.patch("site_instructions", sid, fields)


def fetch_site_instruction_full(sid: str) -> dict[str, Any] | None:
    row = sb.get_one(
        "site_instructions",
        sid,
        select="ref,subject,body,issued_at,project:project_offices(ref,title)",
    )
    if row is None:
        return None
    _flatten(row, "project", "project", ("ref", "title"))
    return row


def update_pmc_ra_bill(rid: str, **fields: Any) -> None:
    sb.patch("pmc_ra_bills", rid, fields)


def fetch_pmc_ra_bill_full(rid: str) -> dict[str, Any] | None:
    row = sb.get_one(
        "pmc_ra_bills",
        rid,
        select=(
            "ref,bill_no,period_start,period_end,status,gross_paise,"
            "advance_recovery_paise,retention_paise,other_deduction_paise,"
            "other_deduction_note,gst_note,tds_note,narrative,certified_at,"
            "project:project_offices(ref,title)"
        ),
    )
    if row is None:
        return None
    _flatten(row, "project", "project", ("ref", "title"))
    row["lines"] = sb.get_list(
        "pmc_ra_lines",
        {"bill_id": f"eq.{rid}"},
        select="description,unit,previous_qty,this_qty,rate_paise,amount_paise",
        order="sort_order",
    )
    return row


def update_feasibility_report(report_id: str, **fields: Any) -> None:
    """Patch a `feasibility_reports` row (only pdf_status/pdf_key; the
    snapshot is written by the Server Action and never touched here)."""
    sb.patch("feasibility_reports", report_id, fields)


def fetch_feasibility_report_full(report_id: str) -> dict[str, Any] | None:
    """Project OS Slice D — carries the frozen assessment `snapshot` jsonb +
    project header, so the PDF prints straight from the snapshot taken at
    generation time. PostgREST parses jsonb into a dict natively."""
    row = sb.get_one(
        "feasibility_reports",
        report_id,
        select="snapshot,generated_at,pdf_key,pdf_status,project:project_offices(ref,title)",
    )
    if row is None:
        return None
    _flatten(row, "project", "project", ("ref", "title"))
    return row


def update_repo_source(source_id: str, **fields: Any) -> None:
    """Patch `repo_sources` after PDF→Markdown conversion (Knowledge Bank
    portal, Phase 8)."""
    col_map = {
        "markdown_text": "markdown_text",
        "raw_text": "raw_text",
        "convert_status": "convert_status",
        "convert_error": "convert_error",
    }
    mapped = {col_map.get(k, k): v for k, v in fields.items()}
    sb.patch("repo_sources", source_id, mapped)


# ---------------------------------------------------------------------------
# Not yet migrated — psycopg against DATABASE_URL (see module docstring)
# ---------------------------------------------------------------------------


def _patch(table: str, row_id: str, json_cols: set[str], fields: dict[str, Any]) -> None:
    if not fields:
        return
    sets: list[str] = []
    values: list[Any] = []
    for col, val in fields.items():
        if col in json_cols:
            sets.append(f"{col} = %s::jsonb")
            values.append(json.dumps(val))
        else:
            sets.append(f"{col} = %s")
            values.append(val)
    sets.append("updated_at = now()")
    values.append(row_id)
    sql = f"update {table} set {', '.join(sets)} where id = %s"
    with psycopg.connect(settings.database_url) as conn:
        conn.execute(sql, values)
        conn.commit()


def update_reconcile(reconcile_id: str, **fields: Any) -> None:
    """Patch an esti_reconcile row. The 'lines' jsonb column is json-encoded.
    Not migrated: no `reconciliations` table exists on Supabase yet — Phase 3
    deferred the whole reconcile domain as "a large feature in its own
    right," and it still is."""
    _patch("esti_reconcile", reconcile_id, {"lines"}, fields)


def fetch_open_invoices() -> list[dict[str, Any]]:
    """Invoices eligible for matching — issued receivables awaiting payment.
    Kept on the old psycopg path rather than partially moved to Supabase's
    `invoices` table: reconcile_import() calls update_reconcile() first thing
    (status="PROCESSING"), which fails immediately with no `reconciliations`
    table to write to — porting fetch_open_invoices alone wouldn't unblock
    anything, so both stay together, consistently unmigrated, until
    reconcile gets its own Supabase migration."""
    with psycopg.connect(settings.database_url) as conn:
        cur = conn.execute(
            "select id, ref, grand_total_paise, net_receivable_paise "
            "from esti_invoice where status = 'ISSUED' "
            "order by created_at, id"
        )
        return [
            {
                "id": str(r[0]),
                "ref": r[1],
                "grand_total_paise": int(r[2]),
                "net_receivable_paise": int(r[3]),
            }
            for r in cur.fetchall()
        ]


def update_inspection(iid: str, **fields: Any) -> None:
    """Not migrated: `inspection` was never assigned a phase number at all
    (see the Phase 6 audit) — no Supabase table exists to move this to."""
    _patch("esti_inspection", iid, set(), fields)


def fetch_inspection_full(iid: str) -> dict[str, Any] | None:
    sql = """
        select s.ref, s.date_visit, s.weather, s.attendees, s.progress,
               s.observations, s.instructions, s.next_visit, s.inspector_name,
               p.ref as project_ref, p.title as project_title, p.site_address
        from esti_inspection s
        join esti_projectoffice p on p.id = s.project_id
        where s.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        return conn.execute(sql, [iid]).fetchone()


def update_measurement_book(bid: str, **fields: Any) -> None:
    """Not migrated: the current Estimation model (rateBooks/estimates,
    2026-07-18) replaced the old measurement-book complex with
    `estimate_measurements` — a different shape, not a straight port. Phase
    4's own audit flagged measurement-row drill-down as out of scope for now;
    this stays on the old schema until that's picked up."""
    _patch("esti_measurement_book", bid, set(), fields)


def fetch_measurement_book_full(bid: str) -> dict[str, Any] | None:
    """Abstract sheet: the book header, its project, and every measured row."""
    sql = """
        select b.title, b.status, b.revision_no,
               p.ref as project_ref, p.title as project_title
        from esti_measurement_book b
        join esti_projectoffice p on p.id = b.project_id
        where b.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        row = conn.execute(sql, [bid]).fetchone()
        if row is None:
            return None
        row["rows"] = conn.execute(
            "select r.particulars, r.library_item_code, r.length_mm, r.breadth_mm, "
            "       r.height_mm, r.quantity, r.uom, r.derivation, "
            "       l.code as level_code, l.name as level_name "
            "from esti_measurement_row r "
            "left join esti_building_level l on l.id = r.level_id "
            "where r.book_id = %s order by r.sort_order",
            [bid],
        ).fetchall()
        return row
