-- Neon H2: non-superuser runtime role (template — placeholders only)
-- 1. Replace __NEON_DATABASE_NAME__ with your Neon database name (e.g. neondb).
-- 2. Replace __ITSMA_APP_PASSWORD__ with a strong password (set in Neon / secret store only).
-- 3. Run with owner/direct URL: psql "$DATABASE_URL_DIRECT" -f docs/scripts/neon-itsm-app-role.template.sql
-- 4. Build pooled DATABASE_URL for Vercel using role itsm_app + __ITSMA_APP_PASSWORD__.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'itsm_app') THEN
    CREATE ROLE itsm_app LOGIN PASSWORD '__ITSMA_APP_PASSWORD__';
  ELSE
    RAISE NOTICE 'Role itsm_app already exists — skipping CREATE (update password in Neon console if needed).';
  END IF;
END
$$;

-- psql does not substitute __NEON_DATABASE_NAME__ automatically; use \connect or run GRANTs from a session connected to that database.
-- After replacing the token below, database name must be a valid identifier (e.g. neondb).
GRANT CONNECT ON DATABASE __NEON_DATABASE_NAME__ TO itsm_app;
GRANT USAGE ON SCHEMA public TO itsm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO itsm_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO itsm_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO itsm_app;
