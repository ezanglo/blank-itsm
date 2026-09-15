import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import { organization, role, ticket, ticketEvent, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { TicketRepository } from "@/lib/repositories/ticketRepository";
import type { RequestContext } from "@/lib/auth/context";

describe("ticket timeline visibility", () => {
  let orgId: string;
  let requesterId: string;
  let agentId: string;
  let ticketId: string;
  let agentRoleId: string;

  beforeAll(async () => {
    const org = await db.query.organization.findFirst({
      where: eq(organization.slug, "org-a"),
    });
    if (!org) throw new Error("seed org-a missing");
    orgId = org.id;

    const requester = await db.query.user.findFirst({
      where: eq(user.email, "requester@org-a.test"),
    });
    const agent = await db.query.user.findFirst({
      where: eq(user.email, "agent@org-a.test"),
    });
    if (!requester || !agent) throw new Error("seed users missing");
    requesterId = requester.id;
    agentId = agent.id;

    const agentRole = await db.query.role.findFirst({
      where: eq(role.key, "agent"),
    });
    if (!agentRole) throw new Error("agent role missing");
    agentRoleId = agentRole.id;

    const existing = await db.query.ticket.findFirst({
      where: and(eq(ticket.organizationId, orgId), eq(ticket.requesterId, requesterId)),
    });
    ticketId = existing?.id ?? (
      await TicketRepository.create(
        {
          userId: requesterId,
          orgId,
          role: "requester",
          roleId: agentRoleId,
          permissions: new Set(["ticket:create", "ticket:read_own", "ticket:comment_public"]),
        },
        {
          type: "incident",
          subject: "Timeline test",
          description: "M4 timeline isolation",
        }
      )
    ).id;
  });

  it("hides internal notes from requester timeline", async () => {
    const agentCtx: RequestContext = {
      userId: agentId,
      orgId,
      role: "agent",
      roleId: agentRoleId,
      permissions: new Set([
        "ticket:read_org",
        "ticket:comment_public",
        "ticket:comment_internal",
      ]),
    };

    const requesterCtx: RequestContext = {
      userId: requesterId,
      orgId,
      role: "requester",
      roleId: agentRoleId,
      permissions: new Set(["ticket:read_own", "ticket:comment_public"]),
    };

    await TicketRepository.addComment(agentCtx, ticketId, "Public update for customer", "public");
    await TicketRepository.addComment(agentCtx, ticketId, "Secret internal triage note", "internal");

    const agentEvents = await TicketRepository.listEvents(agentCtx, ticketId, true);
    const requesterEvents = await TicketRepository.listEvents(requesterCtx, ticketId, false);

    expect(agentEvents.some((e) => e.kind === "comment_internal")).toBe(true);
    expect(requesterEvents.some((e) => e.kind === "comment_internal")).toBe(false);
    expect(requesterEvents.some((e) => e.body?.includes("Public update"))).toBe(true);

    await db.delete(ticketEvent).where(
      and(eq(ticketEvent.ticketId, ticketId), eq(ticketEvent.organizationId, orgId))
    );
  });
});
