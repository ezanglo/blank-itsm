import { db } from "@/db";
import { ticket, ticketEvent, auditEvent } from "@/db/schema";
import { eq, and, desc, isNull, notInArray } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/auth/context";
import type { TicketStatus } from "@/lib/domain/ticketStatus";
import {
  assertTransition,
  getAllowedRequesterNextStatuses,
  isValidStatus,
  type TicketStatus as TS,
} from "@/lib/domain/ticketStatus";
import {
  computePriority,
  DEFAULT_IMPACT,
  DEFAULT_URGENCY,
  isImpactLevel,
  isUrgencyLevel,
  type ImpactLevel,
  type UrgencyLevel,
} from "@/lib/domain/ticketPriority";
import { computeSlaDueDates } from "@/lib/domain/sla";
import { withTenantContext } from "@/lib/db/transaction";
import { enqueueEmail } from "@/lib/email/outbox";

const INTERNAL_EVENT_KINDS = ["comment_internal"] as const;

export type CreateTicketInput = {
  type: "incident" | "service_request";
  subject: string;
  description: string;
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

export type TicketEventKind =
  | "comment_public"
  | "comment_internal"
  | "status_change"
  | "assignment"
  | "system";

/**
 * Ticket repository with tenant-scoped queries
 * SECURITY: All queries filter by organizationId from ctx
 */
export class TicketRepository {
  static resolveImpactUrgency(input: { impact?: string; urgency?: string }) {
    const impact: ImpactLevel =
      input.impact && isImpactLevel(input.impact) ? input.impact : DEFAULT_IMPACT;
    const urgency: UrgencyLevel =
      input.urgency && isUrgencyLevel(input.urgency) ? input.urgency : DEFAULT_URGENCY;
    const priority = computePriority(impact, urgency);
    return { impact, urgency, priority };
  }

  /**
   * SECURITY: Requesters may only see own tickets; agents with read_org see all in org.
   */
  static async assertTicketVisible(
    ctx: RequestContext,
    ticketId: string,
    agentView: boolean
  ): Promise<boolean> {
    const row = await db.query.ticket.findFirst({
      where: and(eq(ticket.id, ticketId), eq(ticket.organizationId, ctx.orgId)),
    });
    if (!row) return false;
    if (agentView && hasPermission(ctx, "ticket:read_org")) return true;
    if (hasPermission(ctx, "ticket:read_own") && row.requesterId === ctx.userId) return true;
    return false;
  }

  static async create(ctx: RequestContext, input: CreateTicketInput) {
    const { impact, urgency, priority } = this.resolveImpactUrgency(input);
    const createdAt = new Date();
    const sla = computeSlaDueDates(priority, createdAt);

    return await withTenantContext(ctx, async (tx) => {
      const lastTicket = await tx.query.ticket.findFirst({
        where: eq(ticket.organizationId, ctx.orgId),
        orderBy: [desc(ticket.number)],
      });

      const number = (lastTicket?.number ?? 0) + 1;

      const [newTicket] = await tx
        .insert(ticket)
        .values({
          organizationId: ctx.orgId,
          number,
          type: input.type,
          subject: input.subject,
          description: input.description,
          status: "open",
          priority,
          impact,
          urgency,
          requesterId: ctx.userId,
          responseDueAt: sla.responseDueAt,
          resolutionDueAt: sla.resolutionDueAt,
        })
        .returning();

      await tx.insert(ticketEvent).values({
        organizationId: ctx.orgId,
        ticketId: newTicket.id,
        actorId: ctx.userId,
        kind: "system",
        body: `Ticket created with ${priority} priority (impact: ${impact}, urgency: ${urgency})`,
      });

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "ticket.created",
        resourceType: "ticket",
        resourceId: newTicket.id,
        metadata: { ticketNumber: number, type: input.type, priority },
      });

      return newTicket;
    });
  }

  static async getById(ctx: RequestContext, ticketId: string) {
    const visible = await this.assertTicketVisible(ctx, ticketId, true);
    if (!visible) return null;

    const result = await db.query.ticket.findFirst({
      where: and(eq(ticket.id, ticketId), eq(ticket.organizationId, ctx.orgId)),
      with: {
        requester: true,
        assignee: true,
      },
    });

    return result || null;
  }

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

  static async listUnassigned(ctx: RequestContext) {
    return db.query.ticket.findMany({
      where: and(eq(ticket.organizationId, ctx.orgId), isNull(ticket.assigneeId)),
      orderBy: [desc(ticket.createdAt)],
      with: {
        requester: true,
      },
    });
  }

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

  static async listEvents(ctx: RequestContext, ticketId: string, includeInternal: boolean) {
    const visible = await this.assertTicketVisible(ctx, ticketId, includeInternal);
    if (!visible) return [];

    const where = includeInternal
      ? and(eq(ticketEvent.ticketId, ticketId), eq(ticketEvent.organizationId, ctx.orgId))
      : and(
          eq(ticketEvent.ticketId, ticketId),
          eq(ticketEvent.organizationId, ctx.orgId),
          notInArray(ticketEvent.kind, [...INTERNAL_EVENT_KINDS])
        );

    return db.query.ticketEvent.findMany({
      where,
      orderBy: [desc(ticketEvent.createdAt)],
      with: { actor: true },
    });
  }

  static async addComment(
    ctx: RequestContext,
    ticketId: string,
    body: string,
    visibility: "public" | "internal"
  ) {
    const existing = await this.getById(ctx, ticketId);
    if (!existing) {
      throw new Error("Ticket not found");
    }

    if (visibility === "internal" && !hasPermission(ctx, "ticket:comment_internal")) {
      throw new Error("Forbidden");
    }
    if (visibility === "public" && !hasPermission(ctx, "ticket:comment_public")) {
      throw new Error("Forbidden");
    }

    const kind: TicketEventKind =
      visibility === "internal" ? "comment_internal" : "comment_public";

    const event = await withTenantContext(ctx, async (tx) => {
      const updates: Record<string, Date | null> = { updatedAt: new Date() };
      if (!existing.firstResponseAt && hasPermission(ctx, "ticket:read_org")) {
        updates.firstResponseAt = new Date();
      }

      await tx
        .update(ticket)
        .set(updates)
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, ctx.orgId)));

      const [row] = await tx
        .insert(ticketEvent)
        .values({
          organizationId: ctx.orgId,
          ticketId,
          actorId: ctx.userId,
          kind,
          body,
        })
        .returning();

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: visibility === "internal" ? "ticket.note_added" : "ticket.reply_added",
        resourceType: "ticket",
        resourceId: ticketId,
        metadata: { visibility },
      });

      return row;
    });

    if (
      visibility === "public" &&
      existing.requester?.email &&
      hasPermission(ctx, "ticket:read_org")
    ) {
      const base = process.env.BETTER_AUTH_URL ?? "http://localhost:43123";
      await enqueueEmail(ctx, {
        to: existing.requester.email,
        subject: `Re: [#${existing.number}] ${existing.subject}`,
        templateKey: "ticket_public_reply",
        payload: {
          ticketNumber: existing.number,
          subject: existing.subject,
          replyBody: body,
          ticketUrl: `${base}/portal/tickets/${ticketId}`,
        },
      }).catch((err) => {
        console.error("[email] failed to enqueue ticket reply", err);
      });
    }

    return event;
  }

  static async claim(ctx: RequestContext, ticketId: string, assigneeId: string) {
    const existing = await this.getById(ctx, ticketId);
    if (!existing) {
      throw new Error("Ticket not found");
    }

    return await withTenantContext(ctx, async (tx) => {
      const statusUpdate =
        existing.status === "open" ? ("in_progress" as TicketStatus) : existing.status;

      const [updated] = await tx
        .update(ticket)
        .set({
          assigneeId,
          claimedAt: new Date(),
          status: statusUpdate,
          updatedAt: new Date(),
        })
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, ctx.orgId)))
        .returning();

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "ticket.claimed",
        resourceType: "ticket",
        resourceId: ticketId,
        metadata: { assigneeId },
      });

      await tx.insert(ticketEvent).values({
        organizationId: ctx.orgId,
        ticketId,
        actorId: ctx.userId,
        kind: "assignment",
        body: `Ticket claimed by agent`,
      });

      if (statusUpdate !== existing.status) {
        await tx.insert(ticketEvent).values({
          organizationId: ctx.orgId,
          ticketId,
          actorId: ctx.userId,
          kind: "status_change",
          body: `Status changed from ${existing.status} to ${statusUpdate}`,
        });
      }

      return updated;
    });
  }

  static async updateStatus(
    ctx: RequestContext,
    ticketId: string,
    newStatus: TicketStatus,
    options?: { requesterInitiated?: boolean }
  ) {
    if (!isValidStatus(newStatus)) {
      throw new Error("Invalid status");
    }

    const existing = await this.getById(ctx, ticketId);
    if (!existing) {
      throw new Error("Ticket not found");
    }

    const from = existing.status as TS;

    if (options?.requesterInitiated) {
      if (existing.requesterId !== ctx.userId) {
        throw new Error("Forbidden");
      }
      if (!getAllowedRequesterNextStatuses(from).includes(newStatus)) {
        throw new Error(`Invalid status transition from ${from} to ${newStatus}`);
      }
    } else {
      assertTransition(from, newStatus);
    }

    return await withTenantContext(ctx, async (tx) => {
      const updates: {
        status: TicketStatus;
        updatedAt: Date;
        resolvedAt?: Date | null;
        closedAt?: Date | null;
      } = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === "resolved") {
        updates.resolvedAt = new Date();
      } else if (newStatus === "closed") {
        updates.closedAt = new Date();
        if (!existing.resolvedAt) {
          updates.resolvedAt = new Date();
        }
      } else if (newStatus === "open" && (from === "resolved" || from === "closed")) {
        updates.resolvedAt = null;
        updates.closedAt = null;
      }

      const [updated] = await tx
        .update(ticket)
        .set(updates)
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, ctx.orgId)))
        .returning();

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "ticket.status_changed",
        resourceType: "ticket",
        resourceId: ticketId,
        metadata: { oldStatus: existing.status, newStatus },
      });

      await tx.insert(ticketEvent).values({
        organizationId: ctx.orgId,
        ticketId,
        actorId: ctx.userId,
        kind: "status_change",
        body: `Status changed from ${existing.status} to ${newStatus}`,
      });

      return updated;
    });
  }
}
