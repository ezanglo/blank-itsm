-- M5: Service catalog, knowledge base, approvals

ALTER TABLE "ticket" ADD COLUMN IF NOT EXISTS "fulfillment_queue" text;

CREATE TABLE IF NOT EXISTS "catalog_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "form_schema" text DEFAULT '[]' NOT NULL,
  "fulfillment_queue" text DEFAULT 'general' NOT NULL,
  "requires_approval" boolean DEFAULT false NOT NULL,
  "approver_user_id" uuid REFERENCES "user"("id"),
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "catalog_item_org_id_idx" ON "catalog_item" ("organization_id");
CREATE INDEX IF NOT EXISTS "catalog_item_org_active_idx" ON "catalog_item" ("organization_id", "active");

CREATE TABLE IF NOT EXISTS "catalog_order" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "catalog_item_id" uuid NOT NULL REFERENCES "catalog_item"("id") ON DELETE restrict,
  "ticket_id" uuid NOT NULL REFERENCES "ticket"("id") ON DELETE cascade,
  "form_responses" text DEFAULT '{}' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "catalog_order_ticket_id_idx" ON "catalog_order" ("ticket_id");
CREATE INDEX IF NOT EXISTS "catalog_order_org_id_idx" ON "catalog_order" ("organization_id");

CREATE TABLE IF NOT EXISTS "service_request_approval" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "ticket_id" uuid NOT NULL REFERENCES "ticket"("id") ON DELETE cascade,
  "approver_user_id" uuid NOT NULL REFERENCES "user"("id"),
  "status" text DEFAULT 'pending' NOT NULL,
  "decided_at" timestamptz,
  "decided_by_id" uuid REFERENCES "user"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "service_request_approval_ticket_id_idx" ON "service_request_approval" ("ticket_id");
CREATE INDEX IF NOT EXISTS "service_request_approval_org_status_idx" ON "service_request_approval" ("organization_id", "status");

CREATE TABLE IF NOT EXISTS "knowledge_article" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "summary" text,
  "body" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "author_id" uuid NOT NULL REFERENCES "user"("id"),
  "published_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "knowledge_article_org_id_idx" ON "knowledge_article" ("organization_id");
CREATE INDEX IF NOT EXISTS "knowledge_article_org_status_idx" ON "knowledge_article" ("organization_id", "status");

CREATE TABLE IF NOT EXISTS "ticket_knowledge_link" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "ticket_id" uuid NOT NULL REFERENCES "ticket"("id") ON DELETE cascade,
  "article_id" uuid NOT NULL REFERENCES "knowledge_article"("id") ON DELETE cascade,
  "linked_by_id" uuid NOT NULL REFERENCES "user"("id"),
  "link_type" text NOT NULL,
  "ticket_event_id" uuid REFERENCES "ticket_event"("id") ON DELETE set null,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ticket_knowledge_link_ticket_id_idx" ON "ticket_knowledge_link" ("ticket_id");
CREATE INDEX IF NOT EXISTS "ticket_knowledge_link_org_id_idx" ON "ticket_knowledge_link" ("organization_id");

ALTER TABLE "catalog_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "catalog_order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_request_approval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_article" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ticket_knowledge_link" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_item_tenant_isolation ON "catalog_item";
CREATE POLICY catalog_item_tenant_isolation ON "catalog_item"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

DROP POLICY IF EXISTS catalog_order_tenant_isolation ON "catalog_order";
CREATE POLICY catalog_order_tenant_isolation ON "catalog_order"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

DROP POLICY IF EXISTS service_request_approval_tenant_isolation ON "service_request_approval";
CREATE POLICY service_request_approval_tenant_isolation ON "service_request_approval"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

DROP POLICY IF EXISTS knowledge_article_tenant_isolation ON "knowledge_article";
CREATE POLICY knowledge_article_tenant_isolation ON "knowledge_article"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

DROP POLICY IF EXISTS ticket_knowledge_link_tenant_isolation ON "ticket_knowledge_link";
CREATE POLICY ticket_knowledge_link_tenant_isolation ON "ticket_knowledge_link"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE "catalog_item" FORCE ROW LEVEL SECURITY;
ALTER TABLE "catalog_order" FORCE ROW LEVEL SECURITY;
ALTER TABLE "service_request_approval" FORCE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_article" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ticket_knowledge_link" FORCE ROW LEVEL SECURITY;
