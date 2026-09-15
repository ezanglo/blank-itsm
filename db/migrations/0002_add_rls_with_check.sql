-- Drop existing policies to recreate with WITH CHECK
DROP POLICY IF EXISTS organization_membership_tenant_isolation ON "organization_membership";
DROP POLICY IF EXISTS invitation_tenant_isolation ON "invitation";
DROP POLICY IF EXISTS organization_branding_tenant_isolation ON "organization_branding";
DROP POLICY IF EXISTS ticket_tenant_isolation ON "ticket";
DROP POLICY IF EXISTS ticket_event_tenant_isolation ON "ticket_event";
DROP POLICY IF EXISTS audit_event_tenant_isolation ON "audit_event";

-- Recreate policies with both USING and WITH CHECK
-- organization_membership
CREATE POLICY organization_membership_tenant_isolation ON "organization_membership"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

-- invitation  
CREATE POLICY invitation_tenant_isolation ON "invitation"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

-- organization_branding
CREATE POLICY organization_branding_tenant_isolation ON "organization_branding"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

-- ticket
CREATE POLICY ticket_tenant_isolation ON "ticket"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

-- ticket_event
CREATE POLICY ticket_event_tenant_isolation ON "ticket_event"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);

-- audit_event
CREATE POLICY audit_event_tenant_isolation ON "audit_event"
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);
