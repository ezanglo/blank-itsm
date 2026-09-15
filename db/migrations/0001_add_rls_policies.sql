-- Enable RLS on tenant-scoped tables
ALTER TABLE "organization_membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_branding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ticket_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_event" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using app.current_org_id
-- organization_membership
CREATE POLICY organization_membership_tenant_isolation ON "organization_membership"
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- invitation  
CREATE POLICY invitation_tenant_isolation ON "invitation"
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- organization_branding
CREATE POLICY organization_branding_tenant_isolation ON "organization_branding"
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- ticket
CREATE POLICY ticket_tenant_isolation ON "ticket"
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- ticket_event
CREATE POLICY ticket_event_tenant_isolation ON "ticket_event"
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- audit_event
CREATE POLICY audit_event_tenant_isolation ON "audit_event"
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);
