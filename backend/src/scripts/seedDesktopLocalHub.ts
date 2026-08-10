/**
 * Local Docker hub bind for desktop apps (AStudio / AConsulting / Connect).
 *
 * Seeds (idempotent):
 *   1. Demo STANDARD licence (same as seed:demo-licenses)
 *   2. Fixed product API key for loopback Activate (never use in prod)
 *
 *   docker compose exec backend pnpm --filter @esti/backend seed:desktop-local-hub
 *
 * Then launch desktop with:
 *   ESTI_HUB_URL=http://127.0.0.1:4000
 *   ESTI_LICENSE_API_URL=http://127.0.0.1:4000/platform
 *   ESTI_PRODUCT_API_KEY=<printed key>
 *   Activate with the printed HLP-… licence key.
 */
import { and, eq, isNull } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import { db, schema } from "../licensing-platform/db/client.js";
import { hashApiKey } from "../licensing-platform/lib/apikey.js";
import { newId, newLicenseKey } from "../licensing-platform/lib/ids.js";
import { ensureAormsStandardPlan } from "../licensing-platform/lib/standardPlan.js";
import { upsertAccount } from "../licensing-platform/modules/auth/service.js";

const DEMO_PASSWORD = "demo1234";
const DEMO_EMAIL = "demo.standard1@aorms.in";

/** Fixed plaintext — only for local Docker / desktop bind. Hash stored in hub DB. */
export const LOCAL_DESKTOP_PRODUCT_API_KEY =
  "hlp_sk_local_desktop_dev_do_not_use_in_prod";

const API_KEY_LABEL = "local-desktop-dev";

async function ensureDemoLicence(): Promise<string> {
  const planId = await ensureAormsStandardPlan();
  const [plan] = await db
    .select({
      productId: schema.plans.productId,
      seats: schema.plans.seats,
      deviceLimit: schema.plans.deviceLimit,
    })
    .from(schema.plans)
    .where(eq(schema.plans.id, planId))
    .limit(1);
  if (!plan) throw new Error("STANDARD plan missing after ensure");

  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);
  const account = await upsertAccount({ email: DEMO_EMAIL, name: "Demo Standard 1" });

  await db
    .update(schema.accounts)
    .set({ passwordHash: demoPasswordHash })
    .where(and(eq(schema.accounts.id, account.id), isNull(schema.accounts.passwordHash)));

  let [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.ownerAccountId, account.id))
    .limit(1);
  if (!org) {
    const orgId = newId("org");
    [org] = await db
      .insert(schema.organizations)
      .values({
        id: orgId,
        name: "Demo Standard workspace",
        slug: "demo-standard-1",
        billingEmail: DEMO_EMAIL,
        ownerAccountId: account.id,
      })
      .returning();
    await db
      .insert(schema.orgMembers)
      .values({ id: newId("mem"), orgId, accountId: account.id, role: "OWNER" })
      .onConflictDoNothing();
  }

  const [existing] = await db
    .select()
    .from(schema.licenses)
    .where(and(eq(schema.licenses.orgId, org!.id), eq(schema.licenses.productId, plan.productId)))
    .limit(1);
  if (existing) return existing.key;

  const licId = newId("lic");
  const [lic] = await db
    .insert(schema.licenses)
    .values({
      id: licId,
      orgId: org!.id,
      productId: plan.productId,
      planId,
      key: newLicenseKey(),
      status: "ACTIVE",
      seats: plan.seats,
      deviceLimit: plan.deviceLimit,
      notes: "Demo licence (desktop local hub)",
    })
    .returning();
  await db.insert(schema.licenseEvents).values({
    id: newId("evt"),
    licenseId: licId,
    type: "CREATE",
    actor: "seed:desktop-local-hub",
    meta: { via: "seed", product: "AORMS", plan: "STANDARD" },
  });
  return lic!.key;
}

async function ensureLocalProductApiKey(productId: string): Promise<void> {
  const keyHash = hashApiKey(LOCAL_DESKTOP_PRODUCT_API_KEY);
  const [existing] = await db
    .select({ id: schema.apiKeys.id })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.keyHash, keyHash))
    .limit(1);
  if (existing) {
    await db
      .update(schema.apiKeys)
      .set({ status: "ACTIVE", label: API_KEY_LABEL })
      .where(eq(schema.apiKeys.id, existing.id));
    return;
  }
  await db.insert(schema.apiKeys).values({
    id: newId("ak"),
    productId,
    orgId: null,
    keyHash,
    label: API_KEY_LABEL,
    status: "ACTIVE",
  });
}

async function main() {
  const planId = await ensureAormsStandardPlan();
  const [plan] = await db
    .select({ productId: schema.plans.productId })
    .from(schema.plans)
    .where(eq(schema.plans.id, planId))
    .limit(1);
  if (!plan) throw new Error("STANDARD plan missing");

  const licenseKey = await ensureDemoLicence();
  await ensureLocalProductApiKey(plan.productId);

  console.log("✓ desktop ↔ local Docker hub seed ready");
  console.log("");
  console.log("  ESTI_HUB_URL=http://127.0.0.1:4000");
  console.log("  ESTI_LICENSE_API_URL=http://127.0.0.1:4000/platform");
  console.log(`  ESTI_PRODUCT_API_KEY=${LOCAL_DESKTOP_PRODUCT_API_KEY}`);
  console.log(`  ESTI_LICENSE_KEY=${licenseKey}`);
  console.log("");
  console.log(`  panel login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("  (Postgres stays on the hub; desktop firm.db is SQLite — bind via Activate/Flush.)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed:desktop-local-hub failed:", err);
    process.exit(1);
  });
