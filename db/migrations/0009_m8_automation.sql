-- M8: Automation rules (assignment + trigger), RLS

CREATE TABLE IF NOT EXISTS "automation_rule" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text,
  "kind" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "trigger" text,
  "trigger_config" jsonb,
  "conditions" jsonb DEFAULT '{"all":[]}'::jsonb NOT NULL,
  "actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "user"("id"),
  "updated_by" uuid REFERENCES "user"("id")
);

CREATE INDEX IF NOT EXISTS "automation_rule_org_kind_enabled_sort_idx"
  ON "automation_rule" ("organization_id", "kind", "enabled", "sort_order");

ALTER TABLE "automation_rule" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_rule_tenant_isolation ON "automation_rule";
CREATE POLICY automation_rule_tenant_isolation ON "automation_rule"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE "automation_rule" FORCE ROW LEVEL SECURITY;
