# Neon free — migrate and seed (one-shot)

**No secrets in repo.** Run from a secure local shell, Cloud Agent, or CI job with env injected from Neon / Vercel handoff.

**SoT:** Origin `ezraanglo/tmp-24caffaea01e301c`.  
**Architecture:** `architecture/DEPLOY_FREE_TIER.md`.

---

## URLs

| Env var | Use |
|---------|-----|
| `DATABASE_URL_DIRECT` | **Preferred for migrate** — Neon direct (non-pooled) connection string as **owner/neon superuser** (or migrate-capable role). |
| `DATABASE_URL` | Fallback for migrate if direct is unavailable; also used for **seed** and local dev. For Vercel **runtime**, set to **pooled** `itsm_app` only. |

Neon console often labels these “Direct” vs “Pooled”. Pooler hostnames typically include `-pooler`.

---

## Apply order

1. **Provision** Neon free project and database (Founder).  
2. **Export** `DATABASE_URL_DIRECT` (direct, owner) and optionally `DATABASE_URL` (same user for seed before H2).  
3. **Migrate:**  
   ```bash
   export DATABASE_URL_DIRECT='postgresql://...'   # from Neon — do not commit
   npm run db:migrate:neon
   ```  
   Or: `./scripts/db-migrate-neon.sh`  
4. **Verify RLS** — migrations `0001`–`0003` apply policies; optional sanity query as owner.  
5. **H2 role** — edit placeholders, then run against direct connection:  
   ```bash
   # Replace __NEON_DATABASE_NAME__ and __ITSMA_APP_PASSWORD__ in the template first
   psql "$DATABASE_URL_DIRECT" -f docs/scripts/neon-itsm-app-role.template.sql
   ```  
   Re-run grants after future migrations if new tables were added (`GRANT ... ON ALL TABLES` in template).  
6. **Seed** (fresh DB, one-shot smoke):  
   ```bash
   export DATABASE_URL='postgresql://itsm_app:...@...-pooler.../neondb?sslmode=require'
   npm run db:seed
   ```  
   Use owner URL for seed only if `itsm_app` is not ready yet; prefer seeding as the role Vercel will use.  
   Seed is idempotent for permissions/roles; org/user inserts expect a **fresh** database — re-run may hit unique constraints.  
7. **Vercel** — set pooled `DATABASE_URL` to `itsm_app`, auth env per `ops/DEPLOY_FREE_NEON_VERCEL.md`, deploy.  
8. **Discard** migrate owner URL from shell history / CI secrets when done.

---

## Scripts in tree

| Artifact | Role |
|----------|------|
| `scripts/db-migrate-neon.sh` | Runs Drizzle migrate with `DATABASE_URL_DIRECT` preferred |
| `drizzle.config.ts` | Uses `DATABASE_URL_DIRECT \|\| DATABASE_URL` for kit |
| `docs/scripts/neon-itsm-app-role.template.sql` | H2 grants template (placeholders) |
| `db/migrations/0006_itsm_app_role.sql` | Local `blank_itsm` dev/test role (fixed password for CI) |
| `npm run db:seed` | Minimal smoke data |

---

## Do not

- Commit connection strings or passwords  
- Run DDL through pooled URL when Neon warns against it  
- Put owner/migrate URL in Vercel Production env  
- Enable Resend or live email for this track
