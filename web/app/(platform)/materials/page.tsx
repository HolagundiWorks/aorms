import NextLink from "next/link";
import { Button, Column, Grid, Select, SelectItem, Stack, Tag, TextInput, Tile } from "@carbon/react";
import { createClient as createWebClient } from "../../../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { PageHeader } from "../../../components/aorms/PageHeader";
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
const MAX_WINDOW = 500;

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

  let query = platformService
    .schema("connectdex")
    .from("products")
    .select("id, name, category, sku, mrp_paise, companies(id, name, public_id, city, state)");
  // Escape LIKE wildcards so a search for "50%" or "a_b" matches literally.
  if (q) query = query.ilike("name", `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  if (category) query = query.eq("category", category);

  // Bounded window (2026-10-01 audit R5): ranking is done in JS, so fetch at most
  // MAX_WINDOW newest matches, rank them, then page the result. Narrow the search
  // to see older products.
  const { data: products, error } = await query.order("created_at", { ascending: false }).limit(MAX_WINDOW);
  if (error) throw new Error(error.message);

  const rows = (products ?? []) as ProductRow[];

  // Three-tier nearest-first ordering: same city, then same state, then
  // the rest. Stable within each tier (products already came back newest
  // first from the query).
  const tier = (row: ProductRow): number => {
    const company = (Array.isArray(row.companies) ? row.companies[0] : row.companies) as CompanyEmbed;
    if (!company) return 3;
    if (referenceCity && company.city && company.city.toLowerCase() === referenceCity.toLowerCase()) return 0;
    if (referenceState && company.state && company.state.toLowerCase() === referenceState.toLowerCase()) return 1;
    return 2;
  };
  const ranked = [...rows].sort((a, b) => tier(a) - tier(b));
  const pageCount = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const sorted = ranked.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
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
              Page {currentPage} of {pageCount}
              {ranked.length >= MAX_WINDOW ? ` · showing the ${MAX_WINDOW} newest matches — narrow your search to see more` : ""}
            </span>
            {currentPage < pageCount && <NextLink href={pageHref(currentPage + 1)}>Next</NextLink>}
          </nav>
        )}
      </Column>
    </Grid>
    </>
  );
}
