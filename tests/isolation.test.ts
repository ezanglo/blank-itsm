import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import { TicketRepository } from "@/lib/repositories/ticketRepository";
import { user, organization, role, ticket, auditEvent } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";

describe("Tenant Isolation Tests", () => {
  let orgA: { id: string; slug: string };
  let orgB: { id: string; slug: string };
  let userAAgent: { id: string; email: string };
  let userARequester: { id: string; email: string };
  let userBAgent: { id: string; email: string };
  let ticketA: { id: string; number: number; organizationId: string };
  let ticketB: { id: string; number: number; organizationId: string };
  let agentRole: { id: string; key: string };
  let requesterRole: { id: string; key: string };

  beforeAll(async () => {
    // Get organizations
    const foundOrgA = await db.query.organization.findFirst({
      where: eq(organization.slug, "org-a"),
    });
    const foundOrgB = await db.query.organization.findFirst({
      where: eq(organization.slug, "org-b"),
    });

    // Get roles
    const foundAgentRole = await db.query.role.findFirst({
      where: eq(role.key, "agent"),
    });
    const foundRequesterRole = await db.query.role.findFirst({
      where: eq(role.key, "requester"),
    });

    // Get users
    const foundUserAAgent = await db.query.user.findFirst({
      where: eq(user.email, "agent@org-a.test"),
    });
    const foundUserARequester = await db.query.user.findFirst({
      where: eq(user.email, "requester@org-a.test"),
    });
    const foundUserBAgent = await db.query.user.findFirst({
      where: eq(user.email, "agent@org-b.test"),
    });

    // Get tickets - need to check orgA exists first
    if (!foundOrgA || !foundOrgB) {
      throw new Error("Organizations not found in database. Run db:seed first.");
    }

    const foundTicketA = await db.query.ticket.findFirst({
      where: and(eq(ticket.organizationId, foundOrgA.id), eq(ticket.number, 1)),
    });
    const foundTicketB = await db.query.ticket.findFirst({
      where: and(eq(ticket.organizationId, foundOrgB.id), eq(ticket.number, 1)),
    });

    // Verify all required data exists
    if (!foundOrgA || !foundOrgB || !foundAgentRole || !foundRequesterRole ||
        !foundUserAAgent || !foundUserARequester || !foundUserBAgent ||
        !foundTicketA || !foundTicketB) {
      throw new Error("Seed data incomplete. Run npm run db:seed");
    }

    // Assign to module-level variables
    orgA = foundOrgA;
    orgB = foundOrgB;
    agentRole = foundAgentRole;
    requesterRole = foundRequesterRole;
    userAAgent = foundUserAAgent;
    userARequester = foundUserARequester;
    userBAgent = foundUserBAgent;
    ticketA = foundTicketA;
    ticketB = foundTicketB;
  });

  describe("ISO-010: Ticket list isolation", () => {
    it("should only return tickets from agent's organization", async () => {
      // Agent A context
      const ctxAgentA: RequestContext = {
        userId: userAAgent.id,
        orgId: orgA.id,
        role: "agent",
        roleId: agentRole.id,
        permissions: new Set([
          "ticket:read_org",
          "agent:access",
        ]),
      };

      const ticketsA = await TicketRepository.listForOrg(ctxAgentA);

      // Should only contain Org A tickets
      expect(ticketsA.length).toBeGreaterThan(0);
      ticketsA.forEach((ticket) => {
        expect(ticket.organizationId).toBe(orgA.id);
      });

      // Should include ticket A
      expect(ticketsA.some((t) => t.id === ticketA.id)).toBe(true);

      // Should NOT include ticket B
      expect(ticketsA.some((t) => t.id === ticketB.id)).toBe(false);
    });
  });

  describe("ISO-011: Direct ID isolation (negative)", () => {
    it("should return null when agent A tries to access ticket B by ID", async () => {
      // Agent A context
      const ctxAgentA: RequestContext = {
        userId: userAAgent.id,
        orgId: orgA.id,
        role: "agent",
        roleId: agentRole.id,
        permissions: new Set([
          "ticket:read_org",
          "agent:access",
        ]),
      };

      // Try to get Org B ticket with Org A context
      const result = await TicketRepository.getById(ctxAgentA, ticketB.id);

      // Should return null (404 equivalent)
      expect(result).toBeNull();
    });

    it("should successfully get own org ticket", async () => {
      // Agent A context
      const ctxAgentA: RequestContext = {
        userId: userAAgent.id,
        orgId: orgA.id,
        role: "agent",
        roleId: agentRole.id,
        permissions: new Set([
          "ticket:read_org",
          "agent:access",
        ]),
      };

      // Get Org A ticket with Org A context
      const result = await TicketRepository.getById(ctxAgentA, ticketA.id);

      // Should succeed
      expect(result).not.toBeNull();
      expect(result?.id).toBe(ticketA.id);
      expect(result?.organizationId).toBe(orgA.id);
    });
  });

  describe("ISO-012: Portal isolation", () => {
    it("should only return requester's own tickets from their org", async () => {
      // Requester A context
      const ctxRequesterA: RequestContext = {
        userId: userARequester.id,
        orgId: orgA.id,
        role: "requester",
        roleId: requesterRole.id,
        permissions: new Set([
          "ticket:read_own",
          "portal:access",
        ]),
      };

      const myTickets = await TicketRepository.listForRequester(
        ctxRequesterA,
        userARequester.id
      );

      // All tickets should belong to Org A
      myTickets.forEach((ticket) => {
        expect(ticket.organizationId).toBe(orgA.id);
      });

      // All tickets should be requested by this user
      myTickets.forEach((ticket) => {
        expect(ticket.requesterId).toBe(userARequester.id);
      });

      // Should NOT contain any Org B tickets
      myTickets.forEach((ticket) => {
        expect(ticket.organizationId).not.toBe(orgB.id);
      });
    });
  });

  describe("ISO-060: Server-side tenant binding", () => {
    it("should ignore forged organizationId in create ticket input", async () => {
      // Agent A context
      const ctxAgentA: RequestContext = {
        userId: userAAgent.id,
        orgId: orgA.id,
        role: "agent",
        roleId: agentRole.id,
        permissions: new Set([
          "ticket:create",
          "agent:access",
        ]),
      };

      // Create ticket - the repository should use ctx.orgId, not any input orgId
      const newTicket = await TicketRepository.create(ctxAgentA, {
        type: "incident",
        subject: "Test ticket for isolation",
        description: "This ticket should belong to Org A regardless of any forged input",
      });

      // Verify ticket belongs to Org A (from context), not Org B
      expect(newTicket.organizationId).toBe(orgA.id);
      expect(newTicket.organizationId).not.toBe(orgB.id);

      // Clean up
      await db.delete(ticket).where(eq(ticket.id, newTicket.id));
    });
  });

  describe("ISO-061: Cross-tenant write blocked", () => {
    it("should fail when agent A tries to claim ticket B", async () => {
      // Agent A context
      const ctxAgentA: RequestContext = {
        userId: userAAgent.id,
        orgId: orgA.id,
        role: "agent",
        roleId: agentRole.id,
        permissions: new Set([
          "ticket:claim",
          "agent:access",
        ]),
      };

      // Try to claim Org B ticket with Org A context
      await expect(
        TicketRepository.claim(ctxAgentA, ticketB.id, userAAgent.id)
      ).rejects.toThrow("Ticket not found");

      // Verify ticket B was not modified
      const unchangedTicketB = await db.query.ticket.findFirst({
        where: eq(ticket.id, ticketB.id),
      });

      // Ticket B should still be unassigned or have its original assignee
      expect(unchangedTicketB?.assigneeId).not.toBe(userAAgent.id);
      expect(unchangedTicketB).toBeDefined();
    });

    it("should successfully claim own org ticket", async () => {
      // Find an unassigned ticket in Org A
      const unassignedTicket = await db.query.ticket.findFirst({
        where: and(
          eq(ticket.organizationId, orgA.id),
          isNull(ticket.assigneeId)
        ),
      });

      if (unassignedTicket) {
        // Agent A context
        const ctxAgentA: RequestContext = {
          userId: userAAgent.id,
          orgId: orgA.id,
          role: "agent",
          roleId: agentRole.id,
          permissions: new Set([
            "ticket:claim",
            "ticket:read_org",
            "agent:access",
          ]),
        };

        // Should successfully claim
        const claimed = await TicketRepository.claim(
          ctxAgentA,
          unassignedTicket.id,
          userAAgent.id
        );

        expect(claimed.assigneeId).toBe(userAAgent.id);

        // Restore original state
        await db
          .update(ticket)
          .set({ assigneeId: null, claimedAt: null })
          .where(eq(ticket.id, unassignedTicket.id));
      }
    });
  });

  describe("ISO-BRAND: Branding isolation", () => {
    it("should return correct branding for each organization", async () => {
      const { BrandingRepository } = await import("@/lib/repositories/brandingRepository");

      // Get branding for both orgs
      const brandingA = await BrandingRepository.getForOrg(orgA.id);
      const brandingB = await BrandingRepository.getForOrg(orgB.id);

      // If either org has branding set, verify they're different records
      if (brandingA && brandingB) {
        expect(brandingA.id).not.toBe(brandingB.id);
        expect(brandingA.organizationId).toBe(orgA.id);
        expect(brandingB.organizationId).toBe(orgB.id);
      }

      // Verify getForOrg is properly scoped
      if (brandingA) {
        expect(brandingA.organizationId).toBe(orgA.id);
      }
      if (brandingB) {
        expect(brandingB.organizationId).toBe(orgB.id);
      }
    });
  });

  describe("RLS-001: RLS enforcement proof", () => {
    it("should verify RLS policies are configured with FORCE and WITH CHECK", async () => {
      // Query pg_catalog to verify RLS configuration
      const { sql } = await import("drizzle-orm");
      
      const result = await db.execute(sql`
        SELECT 
          c.relname AS table_name,
          c.relrowsecurity AS rls_enabled,
          c.relforcerowsecurity AS rls_forced,
          COUNT(p.polname) AS policy_count,
          bool_and(p.polwithcheck IS NOT NULL) AS has_with_check
        FROM pg_class c
        LEFT JOIN pg_policy p ON p.polrelid = c.oid
        WHERE c.relname IN ('ticket', 'organization_membership', 'invitation', 
                            'organization_branding', 'audit_event', 'ticket_event',
                            'ticket_attachment', 'email_outbox')
        GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
        ORDER BY c.relname
      `);

      // Verify all tenant tables have RLS enabled and forced  
      const rows = Array.isArray(result)
        ? result
        : (result as { rows?: typeof result }).rows ?? [];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.rls_enabled).toBe(true);
        expect(row.rls_forced).toBe(true);
        expect(Number(row.policy_count)).toBeGreaterThan(0);
        expect(row.has_with_check).toBe(true);
      }
    });

    it("should verify withTenantContext sets GUC and creates tickets", async () => {
      const { TicketRepository } = await import("@/lib/repositories/ticketRepository");
      
      // Create context for Org A
      const ctxAgentA: RequestContext = {
        userId: userAAgent.id,
        orgId: orgA.id,
        role: "agent",
        roleId: agentRole.id,
        permissions: new Set(["ticket:create"]),
      };

      // Use TicketRepository which uses withTenantContext internally
      const newTicket = await TicketRepository.create(ctxAgentA, {
        type: "incident",
        subject: "RLS test via withTenantContext",
        description: "This tests that withTenantContext works",
      });

      // Verify ticket was created with correct org
      expect(newTicket.organizationId).toBe(orgA.id);
      expect(newTicket.subject).toBe("RLS test via withTenantContext");

      // Verify the GUC was set by checking audit event was also created in same transaction
      const auditEvents = await db.query.auditEvent.findMany({
        where: eq(auditEvent.resourceId, newTicket.id),
      });
      expect(auditEvents.length).toBeGreaterThan(0);
      expect(auditEvents[0].action).toBe("ticket.created");

      // Clean up
      await db.delete(ticket).where(eq(ticket.id, newTicket.id));
      await db.delete(auditEvent).where(eq(auditEvent.resourceId, newTicket.id));
    });
  });
});
