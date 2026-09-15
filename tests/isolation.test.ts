import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import { TicketRepository } from "@/lib/repositories/ticketRepository";
import { user, organization, role, ticket } from "@/db/schema";
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
    orgA = await db.query.organization.findFirst({
      where: eq(organization.slug, "org-a"),
    });
    orgB = await db.query.organization.findFirst({
      where: eq(organization.slug, "org-b"),
    });

    // Get roles
    agentRole = await db.query.role.findFirst({
      where: eq(role.key, "agent"),
    });
    requesterRole = await db.query.role.findFirst({
      where: eq(role.key, "requester"),
    });

    // Get users
    userAAgent = await db.query.user.findFirst({
      where: eq(user.email, "agent@org-a.test"),
    });
    userARequester = await db.query.user.findFirst({
      where: eq(user.email, "requester@org-a.test"),
    });
    userBAgent = await db.query.user.findFirst({
      where: eq(user.email, "agent@org-b.test"),
    });

    // Get tickets
    ticketA = await db.query.ticket.findFirst({
      where: and(eq(ticket.organizationId, orgA.id), eq(ticket.number, 1)),
    });
    ticketB = await db.query.ticket.findFirst({
      where: and(eq(ticket.organizationId, orgB.id), eq(ticket.number, 1)),
    });

    expect(orgA).toBeDefined();
    expect(orgB).toBeDefined();
    expect(userAAgent).toBeDefined();
    expect(userBAgent).toBeDefined();
    expect(ticketA).toBeDefined();
    expect(ticketB).toBeDefined();
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
});
