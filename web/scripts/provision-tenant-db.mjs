#!/usr/bin/env node
/**
 * Provisions a tenant database for one Studio — the per-firm counterpart
 * to the shared aorms-web project's own migration history. Applies every
 * file in web/supabase/migrations/, in order, to a NEW target Supabase
 * project (the only mode implemented so far — see docs/esti/
 * DATABASE-PER-TENANT-ARCHITECTURE.md § Provisioning for why a
 * self-hosted-Postgres target needs a different code path, not yet
 * written), then registers the result in aorms-platform's
 * `tenant_databases` table (migration 0034).
 *
 * This does NOT create the Supabase project itself and does NOT touch
 * live connection routing anywhere in web/ — see the architecture doc for
 * why those are deliberately separate, later steps. It only takes a
 * project that already exists (ref + tokens supplied on the command
 * line) and brings its schema up to date, then records it.
 *
 * Usage:
 *   node scripts/provision-tenant-db.mjs \
 *     --studio-id <uuid> \
 *     --project-ref <supabase-project-ref> \
 *     --management-pat <supabase-management-api-pat> \
 *     --anon-key <project-anon-key> \
 *     --service-role-key <project-service-role-key> \
 *     --platform-service-role-key <aorms-platform-service-role-key>
 *
 * PLATFORM_SUPABASE_URL defaults to the live aorms-platform project
 * (qbgbnhthchhbammzeebg) — override with --platform-project-ref if ever
 * pointed elsewhere.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (!key) continue;
    args[key] = argv[i + 1];
  }
  return args;
}

async function runManagementQuery(projectRef, pat, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Migration query failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function createVaultSecret(platformRef, platformPat, name, value) {
  if (!value) return null;
  const escaped = value.replace(/'/g, "''");
  const escapedName = name.replace(/'/g, "''");
  const result = await runManagementQuery(
    platformRef,
    platformPat,
    `select vault.create_secret('${escaped}', '${escapedName}') as id;`,
  );
  return result?.[0]?.id ?? null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const required = ["studio-id", "project-ref", "management-pat", "anon-key", "service-role-key", "platform-service-role-key"];
  const missing = required.filter((k) => !args[k]);
  if (missing.length) {
    console.error(`Missing required args: ${missing.map((m) => `--${m}`).join(", ")}`);
    process.exit(1);
  }

  const studioId = args["studio-id"];
  const projectRef = args["project-ref"];
  const managementPat = args["management-pat"];
  const platformRef = args["platform-project-ref"] || "qbgbnhthchhbammzeebg";
  const platformPat = args["platform-service-role-key"];

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Provisioning tenant DB for studio ${studioId} on project ${projectRef}`);
  console.log(`Applying ${files.length} migrations...`);

  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    process.stdout.write(`  ${file} ... `);
    try {
      await runManagementQuery(projectRef, managementPat, sql);
      console.log("ok");
    } catch (err) {
      console.log("FAILED");
      console.error(err.message);
      await recordFailure(platformRef, platformPat, studioId, `${file}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log("All migrations applied. Registering tenant database...");

  const anonSecretId = await createVaultSecret(platformRef, platformPat, `tenant-${studioId}-anon-key`, args["anon-key"]);
  const serviceRoleSecretId = await createVaultSecret(platformRef, platformPat, `tenant-${studioId}-service-role-key`, args["service-role-key"]);

  const lastMigration = files[files.length - 1]?.replace(/_.*$/, "") ?? null;

  await runManagementQuery(
    platformRef,
    platformPat,
    `insert into public.tenant_databases (studio_id, provider, status, api_url, anon_key_secret_id, service_role_key_secret_id, schema_version)
     values (
       '${studioId}',
       'supabase',
       'READY',
       'https://${projectRef}.supabase.co',
       ${anonSecretId ? `'${anonSecretId}'` : "null"},
       ${serviceRoleSecretId ? `'${serviceRoleSecretId}'` : "null"},
       '${lastMigration}'
     )
     on conflict (studio_id) do update set
       provider = excluded.provider,
       status = excluded.status,
       api_url = excluded.api_url,
       anon_key_secret_id = excluded.anon_key_secret_id,
       service_role_key_secret_id = excluded.service_role_key_secret_id,
       schema_version = excluded.schema_version,
       error_message = null;`,
  );

  console.log(`Done. Studio ${studioId} is now registered against ${projectRef}, schema ${lastMigration}.`);
}

async function recordFailure(platformRef, platformPat, studioId, message) {
  const escaped = message.replace(/'/g, "''").slice(0, 500);
  try {
    await runManagementQuery(
      platformRef,
      platformPat,
      `insert into public.tenant_databases (studio_id, provider, status, error_message)
       values ('${studioId}', 'supabase', 'ERROR', '${escaped}')
       on conflict (studio_id) do update set status = 'ERROR', error_message = excluded.error_message;`,
    );
  } catch {
    // Best-effort — the migration failure itself is already printed above.
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
