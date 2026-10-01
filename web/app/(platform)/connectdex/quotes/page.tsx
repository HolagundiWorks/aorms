import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { createClient as createPlatformClient } from "../../../../lib/platform/server";
import { createServiceRoleClient } from "../../../../lib/platform/service";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { PlatformAuthCta } from "../../../../components/aorms/platform/PlatformAuthCta";
import { ConnectDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";
import { QuoteReplyForm } from "../../../../components/aorms/platform/QuoteReplyForm";

const STATUS_TAG: Record<string, "blue" | "gray" | "green" | "cool-gray"> = { NEW: "blue", READ: "gray", REPLIED: "green", CLOSED: "cool-gray" };

type Row = {
  id: string;
  quantity: string | null;
  message: string;
  status: string;
  reply: string | null;
  created_at: string;
  company_id: string;
  requester_id: string;
  product_id: string;
};

/**
 * Quotes inbox (2026-10-01). One page, two roles, scoped entirely by RLS on
 * connectdex.quote_requests: a company owner sees requests addressed to companies
 * they own (and can reply/close); any account sees the requests it sent.
 */
export default async function QuotesPage() {
  const platform = await createPlatformClient();
  const {
    data: { user },
  } = await platform.auth.getUser();
  if (!user) {
    return (
      <>
        <ConnectDexPortalHeader />
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <PageHeader title="Quotes" result="Requests and replies in one place." description="Sign in to see your quote requests." />
            <PlatformAuthCta />
          </Column>
        </Grid>
      </>
    );
  }

  const { data } = await platform
    .schema("connectdex")
    .from("quote_requests")
    .select("id, quantity, message, status, reply, created_at, company_id, requester_id, product_id")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Row[];

  const service = createServiceRoleClient();
  const productIds = [...new Set(rows.map((r) => r.product_id))];
  const companyIds = [...new Set(rows.map((r) => r.company_id))];
  const [{ data: products }, { data: companies }] = await Promise.all([
    productIds.length ? service.schema("connectdex").from("products").select("id, name").in("id", productIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    companyIds.length ? service.schema("connectdex").from("companies").select("id, name").in("id", companyIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const productName = new Map((products ?? []).map((p) => [p.id, p.name]));
  const company = new Map((companies ?? []).map((c) => [c.id, c]));

  // RLS already limited `rows` to what this user may see: requests they sent, plus requests
  // addressed to companies they own. Anything not sent by them is therefore incoming.
  const incoming = rows.filter((r) => r.requester_id !== user.id);
  const sent = rows.filter((r) => r.requester_id === user.id);

  const card = (r: Row, inbox: boolean) => (
    <Tile key={r.id}>
      <Stack gap={3}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <strong className="cds--type-productive-heading-02">{productName.get(r.product_id) ?? "Product"}</strong>
          <Tag type={STATUS_TAG[r.status] ?? "gray"} size="sm">
            {r.status}
          </Tag>
          <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
            {inbox ? "" : `to ${company.get(r.company_id)?.name ?? "supplier"} · `}
            {new Date(r.created_at).toLocaleString()}
          </span>
        </div>
        {r.quantity && <p className="cds--type-body-01">Quantity: {r.quantity}</p>}
        <p className="cds--type-body-01" style={{ whiteSpace: "pre-wrap" }}>
          {r.message}
        </p>
        {r.reply && (
          <p className="cds--type-body-01" style={{ whiteSpace: "pre-wrap", borderInlineStart: "2px solid var(--aorms-ink)", paddingInlineStart: "0.75rem" }}>
            <strong>Reply:</strong> {r.reply}
          </p>
        )}
        {inbox && r.status !== "CLOSED" && <QuoteReplyForm id={r.id} replied={r.status === "REPLIED"} />}
      </Stack>
    </Tile>
  );

  return (
    <>
      <ConnectDexPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={12}>
          <PageHeader title="Quotes" result="Requests answered, nothing lost." description="Quote requests sent by Studios, and the ones you've sent. Suppliers reply here — when email is configured, both sides are notified; otherwise check back." />
          {incoming.length > 0 && (
            <>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                Received
              </h2>
              <Stack gap={4}>{incoming.map((r) => card(r, true))}</Stack>
            </>
          )}
          <h2 className="cds--type-heading-02" style={{ margin: "2rem 0 1rem" }}>
            Sent
          </h2>
          <Stack gap={4}>
            {sent.map((r) => card(r, false))}
            {sent.length === 0 && <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>You haven&apos;t requested any quotes yet — use “Request quote” in the Materials directory.</p>}
          </Stack>
        </Column>
      </Grid>
    </>
  );
}
