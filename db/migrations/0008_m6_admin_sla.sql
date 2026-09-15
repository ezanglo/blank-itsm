-- M6: SLA settings (business hours + escalation email), RLS

CREATE TABLE IF NOT EXISTS "organization_sla_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "timezone" text DEFAULT 'UTC' NOT NULL,
  "business_hours" jsonb NOT NULL,
  "escalation_email" text,
  "updated_by" uuid REFERENCES "user"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "organization_sla_settings_organization_id_unique" UNIQUE("organization_id")
);

ALTER TABLE "organization_sla_settings" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_sla_settings_tenant_isolation ON "organization_sla_settings";
CREATE POLICY organization_sla_settings_tenant_isolation ON "organization_sla_settings"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE "organization_sla_settings" FORCE ROW LEVEL SECURITY;
