/* global fetch, console, process, URL */
// Demo-account walkthrough of /api/aqc/v1: sign in, list online projects, push the pilot sample online, pull, edit, version,
// single-session replace, viewer/client refusals. Needs a running web app (AQC_API) with Platform access, and the demo accounts.
// Run: NEXT_PUBLIC_SUPABASE_ANON_KEY=... AQC_API=http://localhost:3000 node tests/fixtures/aqc/demo-e2e.mjs
import { readFileSync } from "node:fs";
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://aenacjqhmjlppmwodpar.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API = (process.env.AQC_API ?? "http://localhost:3000") + "/api/aqc/v1";
const login = async (email) => (await (await fetch(SB + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: KEY, "content-type": "application/json" }, body: JSON.stringify({ email, password: "DemoAORMS2026!" }) })).json()).access_token;
const call = async (tok, path, { method = "GET", session, body } = {}) => {
  const r = await fetch(API + path, { method, headers: { authorization: `Bearer ${tok}`, "content-type": "application/json", ...(session ? { "x-aqc-session": session } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t.slice(0, 200); } return { status: r.status, j };
};
const out = (k, v) => console.log(k.padEnd(34), typeof v === "string" ? v : JSON.stringify(v).slice(0, 260));

const owner = await login("aditi.rao@aorms.in");
const s1 = await call(owner, "/session", { method: "POST", body: { clientLabel: "AQC e2e (A)" } });
out("owner start session", { status: s1.status, studio: s1.j.studio, caps: s1.j.capabilities, ent: s1.j.entitlement });
const sess = s1.j.sessionId;
out("owner GET session", (await call(owner, "/session", { session: sess })).status);
out("no session header", (await call(owner, "/projects")).status + " " + (await call(owner, "/projects")).j.error?.code);

const list = await call(owner, "/projects", { session: sess });
out("online projects", { status: list.status, n: list.j.projects?.length, first: list.j.projects?.[0] && { ref: list.j.projects[0].ref, title: list.j.projects[0].title } });
const target = list.j.projects.find((p) => !p.aqc) ?? list.j.projects[0];

// Build rows from the pilot sample with minted row ids
const proj = JSON.parse(readFileSync(new URL("./pilot-sample.bbsproj", import.meta.url), "utf8"));
const SECTIONS = ["columns","beams","slabs","footings","masonry","masonry_openings","plaster","pcc","earthwork","flooring","painting","dpc","skirting","doors","windows"];
let n = 0; const rows = [];
for (const s of SECTIONS) for (const r of proj[s]) rows.push({ section: s, row_id: `pilot-${s}-${++n}`, fields: r });
const settings = { settings: proj.settings, levels: proj.levels, estimate_markups: proj.estimate_markups, link_rules: proj.link_rules, info: proj.project };

const push = await call(owner, "/projects", { method: "POST", session: sess, body: { projectOfficeId: target.projectOfficeId, formatVersion: 17, settings, rows } });
out("push online (adopt)", push);
const again = await call(owner, "/projects", { method: "POST", session: sess, body: { projectOfficeId: target.projectOfficeId, formatVersion: 17, settings, rows: [] } });
out("push same project again", again);
const aqcId = push.j.aqcProjectId;

const pull = await call(owner, `/projects/${aqcId}/rows?since=0`, { session: sess });
out("pull rows", { status: pull.status, n: pull.j.rows?.length, head: pull.j.headSeq, more: pull.j.more, hasSettings: !!pull.j.settings });
const edit = await call(owner, `/projects/${aqcId}/rows`, { method: "POST", session: sess, body: { rows: [{ section: "masonry", row_id: "pilot-masonry-" + (rows.findIndex(r=>r.section==="masonry")+1), fields: { ...proj.masonry[0], length: "19000" } }] } });
out("edit one row (lease held)", edit);
const delta = await call(owner, `/projects/${aqcId}/rows?since=${pull.j.headSeq}`, { session: sess });
out("delta since head", { n: delta.j.rows?.length, row: delta.j.rows?.[0] && { section: delta.j.rows[0].section, length: delta.j.rows[0].fields.length, seq: delta.j.rows[0].seq } });

const ver = await call(owner, `/projects/${aqcId}/versions`, { method: "POST", session: sess, body: { kind: "estimate", contentHash: "hash-demo-0001", summary: { grandTotalPaise: 123456700, markups: proj.estimate_markups } } });
const ver2 = await call(owner, `/projects/${aqcId}/versions`, { method: "POST", session: sess, body: { kind: "estimate", contentHash: "hash-demo-0001", summary: {} } });
out("version v1 / identical re-add", [ver.j, ver2.j]);
out("owner may add an IPC (cost:approve)", (await call(owner, `/projects/${aqcId}/versions`, { method: "POST", session: sess, body: { kind: "ipc", contentHash: "hash-ipc-0001", summary: {} } })).status);

// second sign-in as same user replaces the session
const s2 = await call(owner, "/session", { method: "POST", body: { clientLabel: "AQC e2e (B)" } });
out("second sign-in", s2.status);
out("old session after replace", { status: (await call(owner, "/projects", { session: sess })).status, code: (await call(owner, "/projects", { session: sess })).j.error?.code });

// viewer: read-only role
const viewer = await login("demo@aorms.in");
const v = await call(viewer, "/session", { method: "POST", body: {} });
out("viewer session", v.status);
const vp = await call(viewer, "/projects", { method: "POST", session: v.j.sessionId, body: { projectOfficeId: list.j.projects[1].projectOfficeId, rows: [] } });
out("viewer push (no write)", vp);
const vr = await call(viewer, `/projects/${aqcId}/rows?since=0`, { session: v.j.sessionId });
out("viewer can read rows", { status: vr.status, n: vr.j.rows?.length });
const client = await login("demo.client@aorms.in");
out("client portal account", (await call(client, "/session", { method: "POST", body: {} })).j.error?.code);
console.log("AQC_PROJECT_ID=" + aqcId);
