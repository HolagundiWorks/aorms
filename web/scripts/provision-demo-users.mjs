#!/usr/bin/env node
/**
 * Create / refresh the public demo logins (one per level of the hierarchy) — 2026-10-04.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/provision-demo-users.mjs
 *
 * Reads lib/demo-accounts.json, creates any missing login through the Auth admin API (never raw
 * SQL on auth.users), sets every roster password to DEMO_PASSWORD (default: the one printed on the
 * sign-in page), then calls public.sync_demo_accounts() (migration 0094) to put each profile in the
 * demo firm with its roster role and portal links. Safe to re-run — it is also the way to undo a
 * visitor changing a demo password. Needs the service-role key: run it yourself, never commit it.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD ?? "DemoAORMS2026!";
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const roster = JSON.parse(readFileSync(new URL("../lib/demo-accounts.json", import.meta.url), "utf8"));
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// Existing logins, by email (the roster is small; one page of 1000 is plenty).
const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listErr) throw listErr;
const byEmail = new Map(list.users.map((u) => [u.email?.toLowerCase(), u]));

for (const a of roster) {
  const existing = byEmail.get(a.email.toLowerCase());
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: { full_name: a.name } });
    if (error) throw error;
    console.log(`updated  ${a.email} (${a.role})`);
  } else {
    const { error } = await supabase.auth.admin.createUser({ email: a.email, password, email_confirm: true, user_metadata: { full_name: a.name } });
    if (error) throw error;
    console.log(`created  ${a.email} (${a.role})`);
  }
}

const { data: synced, error: syncErr } = await supabase.rpc("sync_demo_accounts");
if (syncErr) throw syncErr;
console.log(`sync_demo_accounts(): ${synced} profiles aligned to the roster`);
