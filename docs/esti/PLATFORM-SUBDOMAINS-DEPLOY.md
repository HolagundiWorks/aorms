# AORMS Platform subdomains — deployment runbook

**Read this before touching DNS or Hostinger.** This session has no
Hostinger dashboard or DNS access (and wouldn't use either on your
behalf even if it did) — every step below is written for you to execute,
same posture as every other deploy step this repo has flagged as
"outside this session's reach" (`gateway/README.md`'s own VPS runbook is
the precedent).

## What changed, in one paragraph

The three AORMS Platform portals — **Identity** (`/identity`,
`/studios/[id]`, `/licences`), **ConnectDeX** (`/connectdex`,
`/connectdex-apply`, `/companies/[id]`, `/materials`), and **SysDeX**
(`/admin/*`) — now resolve at their own subdomains:
`identity.aorms.in`, `connectdex.aorms.in`, `sysdex.aorms.in`. This is
**routing-level** separation, not a new deployment: the exact same
Next.js app/build already live at aorms.in on Hostinger now also answers
these three hostnames, via `web/proxy.ts` reading the `Host` header
(no DNS or Hostinger changes are needed for the *code* to be correct —
only for the subdomains to actually resolve to it). See
`web/lib/platform/subdomains.ts` for the exact routing table and
`docs/esti/AORMS-PLATFORM-ARCHITECTURE.md` § Three portals for the
naming/audience rationale.

## 1. DNS

**Confirmed 2026-09-10, via `nslookup <host> 8.8.8.8`** (Google's public
resolver, bypasses any local caching): `aorms.in` is on Hostinger's own
DNS (`ns1.dns-parking.com`, Hostinger's nameserver brand), plain **A
records**, no CNAME — `91.108.106.25` and `93.127.173.174`, TTL 600s.
None of the three subdomains have any DNS record at all yet (`8.8.8.8`
returns `Non-existent domain` for all three) — that's the exact cause of
the "check if there is a typo" error Chrome shows for
`identity.aorms.in` right now; it isn't a code or Hostinger-app problem,
there is simply nothing for DNS to resolve yet.

Since Hostinger is the authoritative nameserver here, add these in
**hPanel → Domains → aorms.in → DNS / Nameservers → DNS Zone Editor**
(not a third-party DNS provider):

| Host | Type | Points to | TTL |
| --- | --- | --- | --- |
| `identity` | A | `91.108.106.25` | 600 (or default) |
| `identity` | A | `93.127.173.174` | 600 (or default) |
| `connectdex` | A | `91.108.106.25` | 600 (or default) |
| `connectdex` | A | `93.127.173.174` | 600 (or default) |
| `sysdex` | A | `91.108.106.25` | 600 (or default) |
| `sysdex` | A | `93.127.173.174` | 600 (or default) |

(Enter just the subdomain label — `identity`, not `identity.aorms.in` —
in hPanel's "Host" field; it appends `.aorms.in` itself. Both A records
per host, matching `aorms.in`'s own two-address setup.)

With a 600s TTL this should resolve within about 10 minutes — re-check
with `nslookup identity.aorms.in 8.8.8.8` (swap in `connectdex`/`sysdex`)
rather than just retrying the browser, since browsers/OS also cache a
negative DNS result for a while after a failed lookup.

## 2. Hostinger hPanel

**Flagged: the exact click-path below is a best-effort description, not
independently verified against Hostinger's current panel from this
session — confirm the actual menu wording matches before following it.**

Hostinger Managed App Hosting typically lets one deployed Node app answer
multiple attached domains/subdomains without a second deployment:

1. Log into hPanel → **Websites** (or **Hosting**) → the site currently
   serving `aorms.in`.
2. Look for a **Domains** (or **Subdomains** / **Domain aliases**)
   section on that site's management page.
3. Add `identity.aorms.in`, `connectdex.aorms.in`, `sysdex.aorms.in` as
   additional domains/aliases pointing at this **same** app instance —
   do **not** create three new, separate app deployments; the whole
   point of this design is one app answering four hostnames.
4. If Hostinger's panel instead only offers "add a new website," check
   whether it lets that new website point at the *same* app/build
   directory `aorms.in` already uses, rather than a fresh deploy — the
   goal is one running Node process, four hostnames.

## 3. SSL

Confirm each of the three subdomains gets its own TLS certificate issued
— Hostinger's Managed App Hosting auto-provisions SSL per attached
domain in every prior deploy this repo has documented (see
`docs/esti/ROADMAP.md` § History, the original Hostinger cutover entry).
If a subdomain shows a certificate warning after DNS propagates, check
hPanel's SSL section for that specific subdomain — it may need to be
issued explicitly rather than inheriting `aorms.in`'s own certificate
(a wildcard cert would cover all of them; a per-domain cert needs one
issued per subdomain).

## 4. Environment

Confirm the deployed environment has:

```
NEXT_PUBLIC_ROOT_DOMAIN=aorms.in
```

(Already in `web/.env`, committed — this just confirms whatever
environment-variable mechanism Hostinger's build actually reads from
picks it up. The code defaults to `"aorms.in"` even if this var is
somehow missing, so this isn't a hard blocker, just worth confirming.)

## 5. Post-deploy verification checklist

Run these once DNS has propagated:

```bash
# Root of each portal subdomain should 30x to that portal's home:
curl -sI https://identity.aorms.in/ | grep -i location    # → /identity
curl -sI https://connectdex.aorms.in/ | grep -i location  # → /connectdex
curl -sI https://sysdex.aorms.in/ | grep -i location      # → /admin

# A legacy in-path URL on the main domain should redirect to its portal:
curl -sI https://aorms.in/identity | grep -i location     # → https://identity.aorms.in/identity

# A portal subdomain must NOT serve an Office Hub route:
curl -sI https://identity.aorms.in/dashboard | grep -i location  # → https://aorms.in/dashboard
```

Then in a real browser:
- Sign in on `identity.aorms.in/platform-login`, then click the "SysDeX"
  link (only visible if that account is `is_admin`) and confirm you land
  on `sysdex.aorms.in/admin` **already signed in** — this is the real
  test of the `.aorms.in`-scoped cookie working across subdomains, and
  can only be confirmed once DNS/SSL are actually live (local dev can't
  reproduce a real multi-subdomain cookie).
- Confirm `/support` and `/platform-login`/`/platform-signup` render
  identically no matter which of the three subdomains you reach them
  from.

## 6. Rollback

Everything here is DNS-level, not code-level. If anything goes wrong,
removing the three subdomain DNS records reverts the whole change
immediately with no redeploy needed — `web/proxy.ts`'s routing logic is a
complete no-op for any hostname other than the three it explicitly
checks for, so the existing `aorms.in` traffic is never at risk from this
change in the first place.
