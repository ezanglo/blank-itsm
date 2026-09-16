# Free-tier smoke deploy — Neon + Vercel

**Authorized:** Founder 2026-09-16 — free Neon + free Vercel only; **no paid plans**, no custom domain required, **no Resend** (mock email stays).  
**Canonical repo (SoT):** `ezraanglo/tmp-24caffaea01e301c` @ `main` (Origin).  
**Architecture:** `architecture/DEPLOY_FREE_TIER.md`  
**Goal:** Public HTTPS preview for Founder smoke testing, not production launch.

---

## Non-goals
- Paid Neon/Vercel/Resend
- Custom DNS / production branding domain
- Live transactional email (`RESEND_API_KEY`, `EMAIL_FROM`, etc.)
- Origin rename
- Weakening auth/RLS for convenience
- Making GitHub the product source of truth

---

## Founder steps (you only)

### 1. Neon (free)
1. Create a free Neon project (region close to you / Vercel).
2. Create database (default ok).
3. Copy **pooled** connection string for later Vercel `DATABASE_URL` (as `itsm_app` after H2).
4. Copy **direct** (non-pooled) URL for one-shot migrate — use as `DATABASE_URL_DIRECT` in a secure shell only; never commit.

### 2. Vercel (Hobby / free) — Founder path
**Authorized exception:** use an **existing GitHub repo** already connected to Founder’s **existing Vercel free/Hobby** account as a **one-way deploy mirror**. Origin temp remains SoT.

1. GitHub deploy mirror is **`ezanglo/blank-itsm`** (see `ops/GITHUB_DEPLOY_MIRROR.md`).
2. Sync Origin `main` @ tip → `https://github.com/ezanglo/blank-itsm` (`./scripts/sync-github-deploy-mirror.sh`).
3. Ensure Vercel project builds from that GitHub repo (Next.js, repository root).
4. Do **not** enable paid add-ons.
5. Re-sync from Origin for every later deploy — GitHub is not the product home.

### 3. Connect & hand CoS
Reply in chat with:
- Vercel project URL / dashboard link
- Neon project created (yes)
- Whether Origin is linked to Vercel or you need the GitHub mirror path

**Do not paste secrets into chat.** Use Vercel env UI or a secure handoff CoS requests (`vercel env`).

---

## Env vars (Vercel Production + Preview)

Names match `lib/auth/settings.ts` and `.env.example`. Set per deployment URL (Production vs each Preview).

| Name | Required | Notes |
|------|----------|--------|
| `DATABASE_URL` | Yes | Neon **pooled** URL as role **`itsm_app`** (after H2 grants). Not the owner/migrate user. |
| `BETTER_AUTH_SECRET` | Yes | ≥32 character random secret; generate once; never commit |
| `BETTER_AUTH_URL` | Yes (prod runtime) | Canonical public URL, e.g. `https://<project>.vercel.app` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes (prod runtime) | **Same** as `BETTER_AUTH_URL` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Yes (prod runtime) | Full HTTPS URL(s), comma-separated; e.g. same as `BETTER_AUTH_URL` |
| `TRUSTED_ORIGINS` | No | Alias if `BETTER_AUTH_TRUSTED_ORIGINS` unset — prefer the Better Auth name |
| `BETTER_AUTH_ALLOWED_HOSTS` | No | Comma-separated hostnames; omit to default to hostname from `BETTER_AUTH_URL` |
| `BETTER_AUTH_TRUSTED_PROXY_HEADERS` | Strongly recommended | Set literal **`false`** for first smoke (**H7**); unset defaults to trusting proxy headers |
| `NODE_ENV` | Yes on Vercel | `production` (platform default) |
| `ITSM_APP_DATABASE_URL` | No | Optional dual-URL / RLS tests only; Vercel smoke uses pooled `DATABASE_URL` as `itsm_app` |

**Do not set on Vercel:** `DATABASE_URL_DIRECT` (migrate-only), `NEXT_PHASE` (Next build internal).

**Omit entirely (this track):** `RESEND_API_KEY`, `EMAIL_FROM`, and any live email provider keys — mock outbox only.

### Suggested matrix

| Variable | Production | Preview |
|----------|------------|---------|
| `DATABASE_URL` | Pooled `itsm_app` | Same smoke DB or separate Neon branch if created |
| `BETTER_AUTH_SECRET` | Smoke secret | Same or distinct |
| `BETTER_AUTH_URL` | Production `*.vercel.app` URL | **That Preview’s** deployment URL |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Match Production | Match Preview |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Match Production URL | Match Preview URL |
| `BETTER_AUTH_TRUSTED_PROXY_HEADERS` | `false` | `false` |

---

## Vercel build (Hobby, repo root)

| Setting | Value |
|---------|--------|
| Framework | Next.js (auto-detected) |
| Root directory | `.` (repository root) |
| Build command | `npm run build` (default) |
| Install command | `npm install` (default) |
| Output | Next.js default (no custom `vercel.json` required) |

Local production smoke: `npm run build` then `npm run start` (port `43123` per `package.json`).

Database migrate + seed are **not** part of the Vercel build — run once via `docs/scripts/NEON_MIGRATE_AND_SEED.md` before or after first deploy.

---

## Studio steps (after Founder projects exist)

1. **Architect** — `architecture/DEPLOY_FREE_TIER.md` (done).  
2. **Developer** — migrate/seed scripts, `.env.example`, mirror doc (this prep).  
3. **CoS** — wire env (without echoing secrets), trigger deploy, run migrate+seed, Founder smoke checklist.  
4. **Reviewer** — light deploy checklist pass if code changes.  
5. **Tester** — optional smoke on public URL after deploy green.

---

## Founder smoke checklist (after URL live)

- [ ] Sign-in `admin@org-a.test` (seeded) holds on refresh  
- [ ] Portal ticket create  
- [ ] Agent queue / claim  
- [ ] `/admin/automation` opens for admin  
- [ ] `/agent/reports` loads  
- [ ] Org isolation sanity (optional second org)  
- [ ] No accidental live email sends  

---

## Rollback
- Disconnect Vercel project or unset `DATABASE_URL`  
- Neon: delete free project when done  
- Keep Origin temp repo as SoT  

## Status
**IN PROGRESS** — Developer prep on branch `cursor/free-deploy-prep-*`; GitHub mirror `ezanglo/blank-itsm` confirmed; waiting Founder Neon free project + mirror push after Origin merge.
