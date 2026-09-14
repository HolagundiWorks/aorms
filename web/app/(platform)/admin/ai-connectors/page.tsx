import { Column, Grid, Stack, Tile } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { CreateConnectorForm } from "../../../../components/aorms/platform/CreateConnectorForm";
import { ConnectorCard, type Connector } from "../../../../components/aorms/platform/ConnectorCard";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

/**
 * Esti AI Model Connectors — platform-admin (2026-09-13), migration
 * 0020_ai_model_connectors.sql. Generic "connect any model over an API"
 * registry plus per-Studio/individual entitlements — see that
 * migration's own header comment for why this lives here rather than in
 * the per-studio Office Hub admin.
 */
function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 4) return "••••";
  return `••••${key.slice(-4)}`;
}

export default async function AiConnectorsAdminPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!isSuperAdmin(account)) return <AdminAccessDenied title="Esti AI Connectors" />;

  const platform = createPlatformServiceRoleClient();

  const [{ data: connectors }, { data: grants }] = await Promise.all([
    platform
      .from("ai_model_connectors")
      .select("id, name, kind, base_url, api_key, model_name, enabled, default_for_all, notes")
      .order("created_at", { ascending: true }),
    platform.from("ai_model_connector_access").select("id, connector_id, scope_type, company_id, account_id"),
  ]);

  const grantRows = grants ?? [];
  const companyIds = [...new Set(grantRows.filter((g) => g.scope_type === "company").map((g) => g.company_id as string))];
  const accountIds = [...new Set(grantRows.filter((g) => g.scope_type === "account").map((g) => g.account_id as string))];

  const [{ data: companies }, { data: accounts }] = await Promise.all([
    companyIds.length
      ? platform.schema("connectdex").from("companies").select("id, public_id, name").in("id", companyIds)
      : Promise.resolve({ data: [] as { id: string; public_id: string; name: string }[] }),
    accountIds.length
      ? platform.from("accounts").select("id, public_id, full_name").in("id", accountIds)
      : Promise.resolve({ data: [] as { id: string; public_id: string; full_name: string | null }[] }),
  ]);

  const companyLabel = new Map((companies ?? []).map((c) => [c.id, `${c.name} (${c.public_id})`]));
  const accountLabel = new Map((accounts ?? []).map((a) => [a.id, `${a.full_name ?? "—"} (${a.public_id})`]));

  const connectorList: Connector[] = (connectors ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    base_url: c.base_url,
    api_key_masked: maskApiKey(c.api_key),
    model_name: c.model_name,
    enabled: c.enabled,
    default_for_all: c.default_for_all,
    notes: c.notes,
    grants: grantRows
      .filter((g) => g.connector_id === c.id)
      .map((g) => ({
        id: g.id,
        scope_type: g.scope_type as "company" | "account",
        label:
          g.scope_type === "company"
            ? (companyLabel.get(g.company_id as string) ?? "unknown studio")
            : (accountLabel.get(g.account_id as string) ?? "unknown account"),
      })),
  }));

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader
            title="Esti AI Connectors"
            description="Connect any model over an API, and control which Studio or individual gets to use it. API keys never leave this server — connector rows below show only a masked suffix."
          />

          <Grid narrow>
            <Column sm={4} md={8} lg={6}>
              <Tile>
                <p className="cds--type-heading-compact-01" style={{ marginBottom: "1rem" }}>
                  New connector
                </p>
                <CreateConnectorForm />
              </Tile>
            </Column>
            <Column sm={4} md={8} lg={10}>
              <Stack gap={4}>
                {connectorList.length === 0 ? (
                  <Tile>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No connectors registered yet.
                    </p>
                  </Tile>
                ) : (
                  connectorList.map((c) => <ConnectorCard key={c.id} connector={c} />)
                )}
              </Stack>
            </Column>
          </Grid>
        </Column>
      </Grid>
    </>
  );
}
