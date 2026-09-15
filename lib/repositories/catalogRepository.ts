import { db } from "@/db";
import {
  catalogItem,
  catalogOrder,
  serviceRequestApproval,
  ticket,
  ticketEvent,
  auditEvent,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { ForbiddenError, hasPermission, requirePermission } from "@/lib/auth/context";
import { withTenantContext } from "@/lib/db/transaction";
import {
  formatFormResponses,
  parseFormSchema,
  serializeFormSchema,
  validateFormResponses,
  type CatalogFormField,
} from "@/lib/domain/catalogForm";
import { computeSlaDueDates } from "@/lib/domain/sla";
import { DEFAULT_IMPACT, DEFAULT_URGENCY, computePriority } from "@/lib/domain/ticketPriority";

export type CatalogItemInput = {
  name: string;
  description: string;
  formSchema: CatalogFormField[];
  fulfillmentQueue: string;
  requiresApproval: boolean;
  approverUserId?: string | null;
  active?: boolean;
};

export class CatalogRepository {
  static async listActive(ctx: RequestContext) {
    requirePermission(ctx, "catalog:order");
    return db.query.catalogItem.findMany({
      where: and(eq(catalogItem.organizationId, ctx.orgId), eq(catalogItem.active, true)),
      orderBy: [desc(catalogItem.updatedAt)],
    });
  }

  static async listAll(ctx: RequestContext) {
    requirePermission(ctx, "catalog:manage");
    return db.query.catalogItem.findMany({
      where: eq(catalogItem.organizationId, ctx.orgId),
      orderBy: [desc(catalogItem.updatedAt)],
      with: { approver: true },
    });
  }

  static async getById(ctx: RequestContext, id: string) {
    const row = await db.query.catalogItem.findFirst({
      where: and(eq(catalogItem.id, id), eq(catalogItem.organizationId, ctx.orgId)),
      with: { approver: true },
    });
    if (!row) return null;
    if (!row.active && !hasPermission(ctx, "catalog:manage")) {
      return null;
    }
    if (!hasPermission(ctx, "catalog:manage") && !hasPermission(ctx, "catalog:order")) {
      throw new ForbiddenError();
    }
    return row;
  }

  static async create(ctx: RequestContext, input: CatalogItemInput) {
    requirePermission(ctx, "catalog:manage");
    if (input.requiresApproval && !input.approverUserId) {
      throw new Error("Approver is required when approval is enabled");
    }

    return withTenantContext(ctx, async (tx) => {
      const [row] = await tx
        .insert(catalogItem)
        .values({
          organizationId: ctx.orgId,
          name: input.name,
          description: input.description,
          formSchema: serializeFormSchema(input.formSchema),
          fulfillmentQueue: input.fulfillmentQueue || "general",
          requiresApproval: input.requiresApproval,
          approverUserId: input.requiresApproval ? input.approverUserId : null,
          active: input.active ?? true,
        })
        .returning();

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "catalog.item_created",
        resourceType: "catalog_item",
        resourceId: row.id,
        metadata: { name: input.name },
      });

      return row;
    });
  }

  static async update(ctx: RequestContext, id: string, input: Partial<CatalogItemInput>) {
    requirePermission(ctx, "catalog:manage");
    const existing = await this.getById(ctx, id);
    if (!existing) throw new Error("Catalog item not found");

    const requiresApproval = input.requiresApproval ?? existing.requiresApproval;
    const approverUserId =
      input.approverUserId !== undefined ? input.approverUserId : existing.approverUserId;
    if (requiresApproval && !approverUserId) {
      throw new Error("Approver is required when approval is enabled");
    }

    return withTenantContext(ctx, async (tx) => {
      const [row] = await tx
        .update(catalogItem)
        .set({
          name: input.name ?? existing.name,
          description: input.description ?? existing.description,
          formSchema: input.formSchema
            ? serializeFormSchema(input.formSchema)
            : existing.formSchema,
          fulfillmentQueue: input.fulfillmentQueue ?? existing.fulfillmentQueue,
          requiresApproval,
          approverUserId: requiresApproval ? approverUserId : null,
          active: input.active ?? existing.active,
          updatedAt: new Date(),
        })
        .where(and(eq(catalogItem.id, id), eq(catalogItem.organizationId, ctx.orgId)))
        .returning();

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "catalog.item_updated",
        resourceType: "catalog_item",
        resourceId: id,
      });

      return row;
    });
  }

  static async delete(ctx: RequestContext, id: string) {
    requirePermission(ctx, "catalog:manage");
    return withTenantContext(ctx, async (tx) => {
      await tx
        .delete(catalogItem)
        .where(and(eq(catalogItem.id, id), eq(catalogItem.organizationId, ctx.orgId)));
      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "catalog.item_deleted",
        resourceType: "catalog_item",
        resourceId: id,
      });
    });
  }

  static async placeOrder(
    ctx: RequestContext,
    catalogItemId: string,
    responses: Record<string, string>
  ) {
    requirePermission(ctx, "catalog:order");
    const item = await this.getById(ctx, catalogItemId);
    if (!item || !item.active) throw new Error("Catalog item not found");

    const fields = parseFormSchema(item.formSchema);
    const validationError = validateFormResponses(fields, responses);
    if (validationError) throw new Error(validationError);

    const priority = computePriority(DEFAULT_IMPACT, DEFAULT_URGENCY);
    const createdAt = new Date();
    const sla = computeSlaDueDates(priority, createdAt);
    const formBlock = formatFormResponses(fields, responses);
    const description = `${item.description}\n\n--- Order details ---\n${formBlock}`;
    const initialStatus = item.requiresApproval ? "pending_approval" : "open";

    return withTenantContext(ctx, async (tx) => {
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
          type: "service_request",
          subject: `Service catalog: ${item.name}`,
          description,
          status: initialStatus,
          priority,
          impact: DEFAULT_IMPACT,
          urgency: DEFAULT_URGENCY,
          requesterId: ctx.userId,
          fulfillmentQueue: item.fulfillmentQueue,
          responseDueAt: sla.responseDueAt,
          resolutionDueAt: sla.resolutionDueAt,
        })
        .returning();

      await tx.insert(catalogOrder).values({
        organizationId: ctx.orgId,
        catalogItemId: item.id,
        ticketId: newTicket.id,
        formResponses: JSON.stringify(responses),
      });

      await tx.insert(ticketEvent).values({
        organizationId: ctx.orgId,
        ticketId: newTicket.id,
        actorId: ctx.userId,
        kind: "system",
        body: `Service catalog order placed for "${item.name}"`,
        metadata: JSON.stringify({
          catalogItemId: item.id,
          fulfillmentQueue: item.fulfillmentQueue,
        }),
      });

      if (item.requiresApproval && item.approverUserId) {
        await tx.insert(serviceRequestApproval).values({
          organizationId: ctx.orgId,
          ticketId: newTicket.id,
          approverUserId: item.approverUserId,
          status: "pending",
        });
        await tx.insert(ticketEvent).values({
          organizationId: ctx.orgId,
          ticketId: newTicket.id,
          actorId: ctx.userId,
          kind: "system",
          body: "Awaiting approval before fulfillment",
        });
      }

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "catalog.order_placed",
        resourceType: "ticket",
        resourceId: newTicket.id,
        metadata: { catalogItemId: item.id, requiresApproval: item.requiresApproval },
      });

      return newTicket;
    });
  }

  static async getApprovalForTicket(ctx: RequestContext, ticketId: string) {
    return db.query.serviceRequestApproval.findFirst({
      where: and(
        eq(serviceRequestApproval.ticketId, ticketId),
        eq(serviceRequestApproval.organizationId, ctx.orgId)
      ),
    });
  }

  static async decideApproval(
    ctx: RequestContext,
    ticketId: string,
    decision: "approved" | "rejected"
  ) {
    const approval = await this.getApprovalForTicket(ctx, ticketId);
    if (!approval || approval.status !== "pending") {
      throw new Error("No pending approval for this ticket");
    }
    if (approval.approverUserId !== ctx.userId && !hasPermission(ctx, "catalog:manage")) {
      throw new ForbiddenError("Only the designated approver can decide");
    }

    return withTenantContext(ctx, async (tx) => {
      await tx
        .update(serviceRequestApproval)
        .set({
          status: decision,
          decidedAt: new Date(),
          decidedById: ctx.userId,
        })
        .where(eq(serviceRequestApproval.id, approval.id));

      const newStatus = decision === "approved" ? "open" : "closed";
      await tx
        .update(ticket)
        .set({
          status: newStatus,
          updatedAt: new Date(),
          ...(decision === "rejected" ? { closedAt: new Date() } : {}),
        })
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, ctx.orgId)));

      await tx.insert(ticketEvent).values({
        organizationId: ctx.orgId,
        ticketId,
        actorId: ctx.userId,
        kind: "status_change",
        body:
          decision === "approved"
            ? "Service request approved — fulfillment queue opened"
            : "Service request rejected",
      });

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: `catalog.approval_${decision}`,
        resourceType: "ticket",
        resourceId: ticketId,
      });
    });
  }
}
