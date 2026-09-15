import { db } from "@/db";
import { ticket, ticketEvent, auditEvent } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import type { TicketStatus } from "@/lib/domain/ticketStatus";

export type CreateTicketInput = {
  type: "incident" | "service_request";
  subject: string;
  description: string;
  priority?: string;
  impact?: string;
  urgency?: string;
};

export type UpdateTicketInput = {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: string;
  assigneeId?: string | null;
};

/**
 * Ticket repository with tenant-scoped queries
 * SECURITY: All queries filter by organizationId from ctx
 */
export class TicketRepository {
  /**
   * Create a new ticket
   * SECURITY: organizationId stamped from ctx, never from input
   */
  static async create(ctx: RequestContext, input: CreateTicketInput) {
    // Get next ticket number for this org
    const lastTicket = await db.query.ticket.findFirst({
      where: eq(ticket.organizationId, ctx.orgId),
      orderBy: [desc(ticket.number)],
    });

    const number = (lastTicket?.number ?? 0) + 1;

    const [newTicket] = await db
      .insert(ticket)
      .values({
        organizationId: ctx.orgId, // Always from ctx
        number,
        type: input.type,
        subject: input.subject,
        description: input.description,
        status: "open",
        priority: input.priority,
        impact: input.impact,
        urgency: input.urgency,
        requesterId: ctx.userId,
      })
      .returning();

    // Audit event
    await db.insert(auditEvent).values({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      action: "ticket.created",
      resourceType: "ticket",
      resourceId: newTicket.id,
      metadata: { ticketNumber: number, type: input.type },
    });

    return newTicket;
  }

  /**
   * Get ticket by ID (tenant-scoped)
   * SECURITY: Returns null if ticket doesn't belong to ctx.orgId
   */
  static async getById(ctx: RequestContext, ticketId: string) {
    const result = await db.query.ticket.findFirst({
      where: and(eq(ticket.id, ticketId), eq(ticket.organizationId, ctx.orgId)),
      with: {
        requester: true,
        assignee: true,
      },
    });

    return result || null;
  }

  /**
   * List all tickets for organization
   * SECURITY: Filtered by ctx.orgId
   */
  static async listForOrg(ctx: RequestContext) {
    return db.query.ticket.findMany({
      where: eq(ticket.organizationId, ctx.orgId),
      orderBy: [desc(ticket.createdAt)],
      with: {
        requester: true,
        assignee: true,
      },
    });
  }

  /**
   * List tickets for a specific requester (my tickets)
   * SECURITY: Filtered by ctx.orgId AND requesterId
   */
  static async listForRequester(ctx: RequestContext, requesterId: string) {
    return db.query.ticket.findMany({
      where: and(
        eq(ticket.organizationId, ctx.orgId),
        eq(ticket.requesterId, requesterId)
      ),
      orderBy: [desc(ticket.createdAt)],
      with: {
        requester: true,
        assignee: true,
      },
    });
  }

  /**
   * List unassigned tickets (agent queue)
   * SECURITY: Filtered by ctx.orgId
   */
  static async listUnassigned(ctx: RequestContext) {
    return db.query.ticket.findMany({
      where: and(eq(ticket.organizationId, ctx.orgId), isNull(ticket.assigneeId)),
      orderBy: [desc(ticket.createdAt)],
      with: {
        requester: true,
      },
    });
  }

  /**
   * List tickets assigned to a user
   * SECURITY: Filtered by ctx.orgId AND assigneeId
   */
  static async listForAssignee(ctx: RequestContext, assigneeId: string) {
    return db.query.ticket.findMany({
      where: and(
        eq(ticket.organizationId, ctx.orgId),
        eq(ticket.assigneeId, assigneeId)
      ),
      orderBy: [desc(ticket.createdAt)],
      with: {
        requester: true,
        assignee: true,
      },
    });
  }

  /**
   * Claim/assign ticket to user
   * SECURITY: Validates ticket belongs to ctx.orgId before updating
   */
  static async claim(ctx: RequestContext, ticketId: string, assigneeId: string) {
    // Verify ticket exists and belongs to org
    const existing = await this.getById(ctx, ticketId);
    if (!existing) {
      throw new Error("Ticket not found");
    }

    const [updated] = await db
      .update(ticket)
      .set({
        assigneeId,
        claimedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, ctx.orgId)))
      .returning();

    // Audit event
    await db.insert(auditEvent).values({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      action: "ticket.claimed",
      resourceType: "ticket",
      resourceId: ticketId,
      metadata: { assigneeId },
    });

    // Ticket event
    await db.insert(ticketEvent).values({
      organizationId: ctx.orgId,
      ticketId,
      actorId: ctx.userId,
      kind: "assignment",
      body: `Ticket claimed by agent`,
    });

    return updated;
  }

  /**
   * Update ticket status
   * SECURITY: Validates ticket belongs to ctx.orgId before updating
   */
  static async updateStatus(
    ctx: RequestContext,
    ticketId: string,
    newStatus: TicketStatus
  ) {
    // Verify ticket exists and belongs to org
    const existing = await this.getById(ctx, ticketId);
    if (!existing) {
      throw new Error("Ticket not found");
    }

    const updates: any = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // Set timestamp fields based on status
    if (newStatus === "resolved") {
      updates.resolvedAt = new Date();
    } else if (newStatus === "closed") {
      updates.closedAt = new Date();
    }

    const [updated] = await db
      .update(ticket)
      .set(updates)
      .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, ctx.orgId)))
      .returning();

    // Audit event
    await db.insert(auditEvent).values({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      action: "ticket.status_changed",
      resourceType: "ticket",
      resourceId: ticketId,
      metadata: { oldStatus: existing.status, newStatus },
    });

    // Ticket event
    await db.insert(ticketEvent).values({
      organizationId: ctx.orgId,
      ticketId,
      actorId: ctx.userId,
      kind: "status_change",
      body: `Status changed from ${existing.status} to ${newStatus}`,
    });

    return updated;
  }
}
