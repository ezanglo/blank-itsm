-- M4: SLA columns, attachments, email outbox, RLS

ALTER TABLE "ticket" ADD COLUMN IF NOT EXISTS "first_response_at" timestamptz;
ALTER TABLE "ticket" ADD COLUMN IF NOT EXISTS "response_due_at" timestamptz;
ALTER TABLE "ticket" ADD COLUMN IF NOT EXISTS "resolution_due_at" timestamptz;

CREATE TABLE IF NOT EXISTS "ticket_attachment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "ticket_id" uuid NOT NULL REFERENCES "ticket"("id") ON DELETE cascade,
  "uploaded_by_id" uuid NOT NULL REFERENCES "user"("id"),
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "storage_key" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ticket_attachment_ticket_id_idx" ON "ticket_attachment" ("ticket_id");
CREATE INDEX IF NOT EXISTS "ticket_attachment_org_id_idx" ON "ticket_attachment" ("organization_id");

CREATE TABLE IF NOT EXISTS "email_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "to_address" text NOT NULL,
  "subject" text NOT NULL,
  "template_key" text NOT NULL,
  "payload" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "last_error" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "sent_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "email_outbox_status_idx" ON "email_outbox" ("status");
CREATE INDEX IF NOT EXISTS "email_outbox_org_id_idx" ON "email_outbox" ("organization_id");

ALTER TABLE "ticket_attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_outbox" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_attachment_tenant_isolation ON "ticket_attachment";
CREATE POLICY ticket_attachment_tenant_isolation ON "ticket_attachment"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

DROP POLICY IF EXISTS email_outbox_tenant_isolation ON "email_outbox";
CREATE POLICY email_outbox_tenant_isolation ON "email_outbox"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE "ticket_attachment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "email_outbox" FORCE ROW LEVEL SECURITY;
