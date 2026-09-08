import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { resolvePeriodRange, type PeriodFilterInput } from "../../../../lib/tax/fy";

/**
 * Invoice register CSV export — port of backend/src/modules/reports/
 * router.ts's `invoiceRegisterExport`, the one export /reports (the
 * GST/TDS abstract, 2026-09-06) deliberately didn't port. One row per
 * invoice (not month-bucketed like the abstract), same ISSUED/PAID +
 * date-in-period filter and column set as the old backend, formatted
 * amounts (not raw paise) since this is meant to be opened directly, not
 * re-parsed. Same `reports:view`-equivalent gate as /reports itself
 * (rank >= 80 — PARTNER/ACCOUNTANT/HR_MANAGER/OWNER), re-checked here
 * since a Route Handler has no page-level gate to inherit.
 */

const RANK: Record<string, number> = {
  OWNER: 100,
  PARTNER: 80,
  ACCOUNTANT: 80,
  HR_MANAGER: 80,
  SENIOR: 60,
  ASSOCIATE: 40,
  VIEWER: 20,
};

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function formatInr(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if ((RANK[profile?.role ?? ""] ?? 0) < 80) {
    return NextResponse.json({ error: "Financial reports require partner-level access or above." }, { status: 403 });
  }

  const url = new URL(request.url);
  const periodInput: PeriodFilterInput = {
    preset: (url.searchParams.get("preset") as PeriodFilterInput["preset"]) ?? "CURRENT_FY",
    fy: url.searchParams.get("fy") ?? undefined,
    quarter: (url.searchParams.get("quarter") as PeriodFilterInput["quarter"]) ?? undefined,
    month: url.searchParams.get("month") ?? undefined,
  };
  const { from, to, label } = resolvePeriodRange(periodInput);

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(
      "ref, status, document_kind, date_invoice, taxable_paise, cgst_paise, sgst_paise, igst_paise, gst_total_paise, tds_paise, net_receivable_paise, grand_total_paise, project_offices(ref, title)",
    )
    .in("status", ["ISSUED", "PAID"])
    .gte("date_invoice", from)
    .lte("date_invoice", to)
    .order("date_invoice", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = ["Ref", "Project", "Status", "Kind", "Date", "Taxable", "CGST", "SGST", "IGST", "GST total", "TDS", "Net", "Grand"];
  const lines = [header.join(",")];
  for (const inv of invoices ?? []) {
    const project = Array.isArray(inv.project_offices) ? inv.project_offices[0] : (inv.project_offices as { ref: string; title: string } | null);
    lines.push(
      [
        inv.ref,
        project ? `${project.ref} · ${project.title}` : "",
        inv.status,
        inv.document_kind,
        inv.date_invoice ?? "",
        formatInr(inv.taxable_paise ?? 0),
        formatInr(inv.cgst_paise ?? 0),
        formatInr(inv.sgst_paise ?? 0),
        formatInr(inv.igst_paise ?? 0),
        formatInr(inv.gst_total_paise ?? 0),
        formatInr(inv.tds_paise ?? 0),
        formatInr(inv.net_receivable_paise ?? 0),
        formatInr(inv.grand_total_paise ?? 0),
      ]
        .map((v) => csvCell(String(v)))
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoice-register-${label.replace(/[^a-z0-9]+/gi, "-")}.csv"`,
    },
  });
}
