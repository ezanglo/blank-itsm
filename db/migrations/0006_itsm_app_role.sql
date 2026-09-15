-- Non-superuser role for RLS negative tests (optional; safe to re-run)

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'itsm_app') THEN
    CREATE ROLE itsm_app LOGIN PASSWORD 'itsm_app_test';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE blank_itsm TO itsm_app;
GRANT USAGE ON SCHEMA public TO itsm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO itsm_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO itsm_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO itsm_app;
