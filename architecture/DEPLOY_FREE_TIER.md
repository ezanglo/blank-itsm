# Free-tier smoke deploy — architecture notes (Neon + Vercel)

**Owner:** Architect · **Date:** 2026-09-16 (Asia/Manila)  
**Auth:** `decisions/FOUNDER_FREE_DEPLOY_2026-09-16.md` — **free Neon + Vercel Hobby only**  
**Ops checklist:** `ops/DEPLOY_FREE_NEON_VERCEL.md`  
**Canonical code:** `ezraanglo/tmp-24caffaea01e301c` @ `38d9f56` (M7+M8)  
**Auth source of truth:** `lib/auth/settings.ts` (+ `BETTER_AUTH_SECRET` in `lib/auth/index.ts`); mirror names in `.env.example`

**Non-goals:** paid plans · custom DNS · Resend/live email · MSP · weakening RLS · renaming Origin temp slug · making GitHub the product SoT

This is a **public HTTPS smoke** for Founder testing — not a production launch.

---

## 1. Neon free — pooled URL, `itsm_app`, RLS, migrations

### Topology (unchanged from INFRA / ADR-001)

```text
Neon free project (one)
  └── database (one)  → all orgs, row-level organization_id
        ├── role: migrate / owner   — DDL (drizzle migrate)
        └── role: itsm_app          — runtime app (non-superuser)  ← H2
```

### Connection strings

| Use | Which URL | Notes |
|-----|-----------|--------|
| **Vercel runtime** (`DATABASE_URL`) | **Pooled** Neon connection string | Required for serverless (many short-lived connections). Prefer Neon’s pooler host (`-pooler` in hostname). |
| **Migrations (one-shot)** | **Direct** (non-pooled) if Neon provides both | Avoid running long DDL through a transaction pooler when Neon docs warn against it; use direct URL for migrate job, then point app at pooled. |
| Optional | `ITSM_APP_DATABASE_URL` | Listed in `.env.example` — use only if Developer wires dual URLs; otherwise single pooled `DATABASE_URL` as `itsm_app` after grants. |

Set `DATABASE_URL_DIRECT` locally or in a one-shot migrate shell (never commit). `drizzle.config.ts` and `scripts/db-migrate-neon.sh` prefer it over `DATABASE_URL` for migrate.

### H2 — non-superuser `itsm_app` + RLS

Runtime must **not** use Neon/Postgres superuser (superuser bypasses RLS).

1. Create role `itsm_app` (login) with password.  
2. `GRANT CONNECT` on database; `USAGE` on `public` (or app schema); `SELECT/INSERT/UPDATE/DELETE` on application tables; sequences as needed.  
3. Ensure RLS policies remain enabled on tenant-owned tables; app continues to set tenant GUC / `withTenantContext` as implemented (SEC-009).  
4. Point Vercel `DATABASE_URL` at **`itsm_app` + pooled** URL.  
5. Keep owner/migrate credentials **out of Vercel** — run migrate from a one-shot CI/Cloud Agent/local with owner URL, then discard.

Template (placeholders only): `docs/scripts/neon-itsm-app-role.template.sql`. Local dev equivalent: `db/migrations/0006_itsm_app_role.sql`.

If Neon UI makes role creation awkward: create DB as owner, document **H2 follow-up**, but **do not** ship Founder smoke as permanent superuser — escalate to CoS if free tier cannot create a non-superuser role.

### Migration apply order

See `docs/scripts/NEON_MIGRATE_AND_SEED.md` for the runnable sequence. Summary:

1. Provision Neon free project + DB.  
2. Apply Drizzle migrations with **migrate/owner** URL (direct preferred).  
3. Confirm RLS policies exist post-migrate.  
4. Create/grant `itsm_app`; verify a non-superuser session cannot see cross-tenant rows without tenant context.  
5. Seed (see §6).  
6. Set Vercel `DATABASE_URL` to pooled `itsm_app` and redeploy/restart.

---

## 2. Vercel Hobby + Next.js — Better Auth env (H6 / H7)

Framework: **Next.js** · Root: repo root · Plan: **Hobby / free only** · No paid add-ons.

Build: `npm run build` (Vercel default). Start: `npm run start` (local prod smoke only; Vercel runs its own handler). No `vercel.json` required for root Next.js on Hobby.

### Production runtime auth mode

`NODE_ENV=production` on Vercel **and** not `NEXT_PHASE=phase-production-build` ⇒ **strict** mode in `lib/auth/settings.ts`:

| Requirement | Behavior |
|-------------|----------|
| `BETTER_AUTH_SECRET` | **Required** at module load (`lib/auth/index.ts`). ≥32 chars; never commit. |
| `BETTER_AUTH_URL` | **Required** — canonical public origin (`https://<project>.vercel.app`). Missing ⇒ throw. |
| `BETTER_AUTH_TRUSTED_ORIGINS` **or** `TRUSTED_ORIGINS` | **Required** — comma-separated **full HTTPS URLs**. Missing ⇒ throw. No localhost/preview wildcards merged in prod. |
| `BETTER_AUTH_ALLOWED_HOSTS` | Optional; if unset, defaults to **hostname of `BETTER_AUTH_URL` only**. |
| `BETTER_AUTH_TRUSTED_PROXY_HEADERS` | **H7:** set to literal **`false`** for first smoke unless CoS confirms trust model. Unset ⇒ proxy headers **trusted** (default-on). |

`next build` sets `NEXT_PHASE=phase-production-build`, which uses **dev-like** defaults during module evaluation — that does **not** relax runtime once the server is up.

---

## 3. Origin ↔ Vercel linking (Founder override for this smoke)

### Default studio preference (still true for new work)

| Preference | Action |
|------------|--------|
| **Prefer** | Link Vercel directly to Origin (`ezraanglo/tmp-24caffaea01e301c`). |
| **Do not** | Promote GitHub to a second source of truth or invent mirrors casually. |

### Authorized exception — free smoke only (Founder 2026-09-16)

Founder authorized using an **existing GitHub repo already linked to an existing Vercel Hobby** project as a **one-way deploy mirror**:

| Role | System |
|------|--------|
| **Source of truth** | **Origin** temp repo `ezraanglo/tmp-24caffaea01e301c` (unchanged) |
| **Deploy path** | Origin → (sync/push) → **`ezanglo/blank-itsm` on GitHub** → **existing Vercel Hobby** |
| **Not authorized** | Treating GitHub as the new home · bidirectional “GitHub is canonical” · paid plans · new custom DNS |

Procedure: `ops/GITHUB_DEPLOY_MIRROR.md`.

---

## 4. Serverless connection / idle Neon caveats

| Risk | Mitigation |
|------|------------|
| Connection storms from serverless | Use **pooled** `DATABASE_URL`; avoid opening unbounded pools per invocation (use existing app singleton / Neon serverless driver pattern as implemented). |
| Neon free **idle suspend** | First request after idle may be slow (cold start + DB wake). Founder smoke: retry once on timeout; not a product bug. |
| Compute/time limits | Free tier quotas — keep smoke seed tiny; no load tests. |
| Preview + Production sharing one DB | Acceptable for **smoke only**; isolate later with Neon branch if Founder authorizes. Document which Vercel env points where. |
| Migrate vs pooler | Prefer direct URL for DDL; pooled for runtime (see §1). |

---

## 5. Exact env var names (match `lib/auth/settings.ts` + `.env.example`)

### Required for Vercel Production (and Preview if Preview runs `NODE_ENV=production`)

| Name | Value / notes |
|------|----------------|
| `DATABASE_URL` | Neon **pooled** URL as **`itsm_app`** (H2) |
| `BETTER_AUTH_SECRET` | ≥32 char random; generate once; never commit / never paste in chat |
| `BETTER_AUTH_URL` | `https://<deployment>.vercel.app` (no trailing slash preferred; must be valid absolute URL) |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | **Same** as `BETTER_AUTH_URL` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Same origin, e.g. `https://<deployment>.vercel.app` (comma-separated if multiple) |
| `BETTER_AUTH_TRUSTED_PROXY_HEADERS` | **`false`** for first smoke (**H7**) |
| `NODE_ENV` | `production` (Vercel sets this) |

### Optional / aliases

| Name | Notes |
|------|--------|
| `TRUSTED_ORIGINS` | Alias only if `BETTER_AUTH_TRUSTED_ORIGINS` empty — prefer the Better Auth–prefixed name |
| `BETTER_AUTH_ALLOWED_HOSTS` | Optional; omit to use hostname from `BETTER_AUTH_URL`. Set explicitly if custom host patterns needed |
| `ITSM_APP_DATABASE_URL` | Only if dual-URL wiring exists — otherwise unused |
| `DATABASE_URL_DIRECT` | **Migrate only** — direct Neon URL; do not set on Vercel runtime |
| `NEXT_PHASE` | Set by Next during build only — do not set in Vercel env UI |

### Explicitly omit for this track

- `RESEND_*` / live email credentials — **mock outbox only** (TECH-015 / Founder auth)  
- Custom domain DNS vars  
- Paid Neon/Vercel keys  

---

## 6. Seed strategy for smoke (minimal)

**Goal:** Founder can click through without inventing data. Keep volume tiny for free-tier quotas.

| Seed | Purpose |
|------|------|
| Org A / B | Smoke + isolation sanity |
| Users | `admin@org-a.test`, `agent@…`, `requester@…` (password in `lib/auth/seed-credentials.ts` — CoS handoff for smoke) |
| Data | Minimal tickets/catalog/KB as in `db/seed.ts` |
| Email | Mock/outbox only — assert no Resend calls |

`npm run db:seed` is idempotent for permissions/roles; org/user rows are intended for **first run on a fresh migrated DB**. Re-run on the same DB may fail on unique constraints — acceptable for smoke (one-shot seed).

---

## Related

- `ops/DEPLOY_FREE_NEON_VERCEL.md`  
- `ops/GITHUB_DEPLOY_MIRROR.md`  
- `docs/scripts/NEON_MIGRATE_AND_SEED.md`  
- `decisions/FOUNDER_FREE_DEPLOY_2026-09-16.md`  
- Hardening backlog: **H2**, **H6**, **H7**
