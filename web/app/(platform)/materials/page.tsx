import NextLink from "next/link";
import { Button, Column, Grid, Select, SelectItem, Stack, Tag, TextInput, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { QuoteRequestForm } from "../../../components/aorms/platform/QuoteRequestForm";
import { ConnectDexPortalHeader } from "../../../components/aorms/platform/PortalHeaders";

type CompanyEmbed = { id: string; name: string; public_id: string; city: string | null; state: string | null } | null;

type ProductRow = {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  mrp_paise: number | null;
  companies: CompanyEmbed | CompanyEmbed[];
};

const PAGE_SIZE = 24;

const CATEGORY_LABELS: Record<string, string> = {
  BUILDING_MATERIAL: "Building material",
  INTERIOR_MATERIAL: "Interior material",
  FINISH: "Finish",
  OTHER: "Other",
};

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * Cross-company Material Catalogue browsing/search — Phase C of the
 * Studio/Company split + Material Catalogue plan. Reads `products` +
 * `companies` platform-wide via the service-role client (RLS on those
 * tables already allows any authenticated platform account to read them
 * — see platform/supabase/migrations/0008_material_catalogue.sql — this
 * page just needs to work the same way for a browser tab that may not
 * itself hold an active platform session, same justification as
 * identity/page.tsx and companies/[companyId]/page.tsx).
 *
 * "Nearest vendor" ranking is plain city/state text matching against the
 * viewer's own (first active) Studio membership — same city first, then
 * same state, then everything else — computed here in three tiers, no
 * geocoding/lat-lng/external API (confirmed with the user up front).
 */
export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const category = sp.category ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const webSupabase = await createWebClient();
  const {
    data: { user },
  } = await webSupabase.auth.getUser();
  const { data: profile } = await webSupabase
    .from("profiles")
    .select("platform_public_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const handle = profile?.platform_public_id ?? null;

  const platformService = createPlatformServiceRoleClient();

  // Resolve the viewer's own reference city/state from their first active
  // Studio membership, if any — used only to bias ordering, never to gate
  // access (the catalogue is platform-wide read, per RLS).
  let referenceCity: string | null = null;
  let referenceState: string | null = null;
  if (handle) {
    const { data: account } = await platformService.from("accounts").select("id").eq("public_id", handle).maybeSingle();
    if (account) {
      const { data: studioMembership } = await platformService
        .from("studio_memberships")
        .select("studios(city, state)")
        .eq("account_id", account.id)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (studioMembership) {
        const studio = (Array.isArray(studioMembership.studios) ? studioMembership.studios[0] : studioMembership.studios) as {
          city: string | null;
          state: string | null;
        } | null;
        referenceCity = studio?.city ?? null;
        referenceState = studio?.state ?? null;
      }
    }
  }

  // SQL-side nearest-first ranking + paging (2026-10-06, roadmap P1; migration platform/0050):
  // `connectdex.search_products` ranks same city → same state → rest (newest first inside each tier),
  // applies the name/category filters and OFFSET/LIMIT, and returns the full match count — so every
  // match is reachable, not just a 500-row JS window.
  const requestedOffset = (page - 1) * PAGE_SIZE;
  const searchArgs = { p_q: q, p_category: category, p_city: referenceCity ?? "", p_state: referenceState ?? "", p_limit: PAGE_SIZE };
  type SearchRow = {
    id: string;
    name: string;
    category: string;
    sku: string | null;
    mrp_paise: number | null;
    company_id: string | null;
    company_name: string | null;
    company_public_id: string | null;
    company_city: string | null;
    company_state: string | null;
    total_count: number;
  };
  let { data: found, error } = await platformService.schema("connectdex").rpc("search_products", { ...searchArgs, p_offset: requestedOffset });
  if (error) throw new Error(error.message);
  let hits = (found ?? []) as SearchRow[];
  // A page past the end (stale link) falls back to the last page.
  const total = hits[0]?.total_count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (hits.length === 0 && currentPage !== page) {
    ({ data: found, error } = await platformService.schema("connectdex").rpc("search_products", { ...searchArgs, p_offset: (currentPage - 1) * PAGE_SIZE }));
    if (error) throw new Error(error.message);
    hits = (found ?? []) as SearchRow[];
  }
  const sorted: ProductRow[] = hits.map((h) => ({
    id: h.id,
    name: h.name,
    category: h.category,
    sku: h.sku,
    mrp_paise: h.mrp_paise,
    companies: h.company_id
      ? { id: h.company_id, name: h.company_name ?? "", public_id: h.company_public_id ?? "", city: h.company_city, state: h.company_state }
      : null,
  }));
  const pageHref = (n: number) => `/materials?${new URLSearchParams({ ...(q ? { q } : {}), ...(category ? { category } : {}), page: String(n) })}`;

  return (
    <>
      <ConnectDexPortalHeader />
      <Grid>
      <Column sm={4} md={8} lg={12}>
        <PageHeader
          title="Material Catalogue" result="Materials specifiers can find and compare."
          description={
            <>
              Browse products from every supplier Company on the AORMS Platform.
              {referenceCity || referenceState
                ? ` Showing nearest vendors first (${[referenceCity, referenceState].filter(Boolean).join(", ")}).`
                : ""}
            </>
          }
        />

        <form method="GET" action="/materials" style={{ marginBottom: "1.5rem" }}>
          <Stack gap={4} orientation="horizontal" style={{ alignItems: "flex-end" }}>
            <TextInput id="materials-q" name="q" labelText="Search products" defaultValue={q} placeholder="e.g. cement, tiles, paint" />
            <Select id="materials-category" name="category" labelText="Category" defaultValue={category}>
              <SelectItem value="" text="All categories" />
              <SelectItem value="BUILDING_MATERIAL" text="Building material" />
              <SelectItem value="INTERIOR_MATERIAL" text="Interior material" />
              <SelectItem value="FINISH" text="Finish" />
              <SelectItem value="OTHER" text="Other" />
            </Select>
            <Button type="submit" kind="tertiary" size="md">
              Search
            </Button>
          </Stack>
        </form>

        <Stack gap={4}>
          {sorted.map((row) => {
            const company = (Array.isArray(row.companies) ? row.companies[0] : row.companies) as CompanyEmbed;
            return (
              <Tile key={row.id}>
                <Stack gap={3} orientation="horizontal" style={{ alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <Stack gap={2} orientation="horizontal" style={{ alignItems: "center" }}>
                      <strong className="cds--type-productive-heading-02">{row.name}</strong>
                      <Tag type="cool-gray" size="sm">
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </Tag>
                      {row.sku && (
                        <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          SKU: {row.sku}
                        </span>
                      )}
                      {row.mrp_paise != null && (
                        <Tag type="green" size="sm">
                          MRP {formatInr(row.mrp_paise)}
                        </Tag>
                      )}
                    </Stack>
                    {company && (
                      <p className="cds--type-body-01" style={{ marginTop: "0.5rem" }}>
                        <NextLink href={`/companies/${company.id}`}>{company.name}</NextLink>{" "}
                        <span style={{ color: "var(--cds-text-secondary)" }}>
                          {company.public_id}
                          {(company.city || company.state) && ` · ${[company.city, company.state].filter(Boolean).join(", ")}`}
                        </span>
                      </p>
                    )}
                  </div>
                  <QuoteRequestForm productId={row.id} productName={row.name} />
                </Stack>
              </Tile>
            );
          })}
          {sorted.length === 0 && (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              No products found.
            </p>
          )}
        </Stack>
        {pageCount > 1 && (
          <nav aria-label="Pagination" style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "1.5rem" }}>
            {currentPage > 1 && <NextLink href={pageHref(currentPage - 1)}>Previous</NextLink>}
            <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
              Page {currentPage} of {pageCount} · {total.toLocaleString("en-IN")} products
            </span>
            {currentPage < pageCount && <NextLink href={pageHref(currentPage + 1)}>Next</NextLink>}
          </nav>
        )}
      </Column>
    </Grid>
    </>
  );
}
