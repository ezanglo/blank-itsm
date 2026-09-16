import { db } from "@/db";
import { organizationSlaSettings, auditEvent } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { hasPermission, requirePermission } from "@/lib/auth/context";
import { withTenantContext } from "@/lib/db/transaction";
import {
  DEFAULT_BUSINESS_HOURS,
  normalizeBusinessHours,
  type BusinessHoursCalendar,
} from "@/lib/domain/businessHours";
import { enqueueEmail } from "@/lib/email/outbox";
import { getSlaStatus } from "@/lib/domain/sla";
import type { ticket } from "@/db/schema";
import {
  createAutomationContext,
  evaluateTriggers,
} from "@/lib/domain/automation/engine";
import { processPendingOutbox } from "@/lib/email/outbox";

export type SlaSettingsInput = {
  timezone?: string;
  businessHours?: BusinessHoursCalendar;
  escalationEmail?: string | null;
};

export class SlaRepository {
  static async getForOrg(orgId: string) {
    return db.query.organizationSlaSettings.findFirst({
      where: eq(organizationSlaSettings.organizationId, orgId),
    });
  }

  static async getBusinessHoursForOrg(orgId: string): Promise<BusinessHoursCalendar | undefined> {
    const row = await this.getForOrg(orgId);
    if (!row) return undefined;
    return normalizeBusinessHours(row.businessHours);
  }

  static async upsert(ctx: RequestContext, input: SlaSettingsInput) {
    requirePermission(ctx, "sla:manage");
    const businessHours = normalizeBusinessHours(input.businessHours ?? DEFAULT_BUSINESS_HOURS);
    const existing = await this.getForOrg(ctx.orgId);

    return await withTenantContext(ctx, async (tx) => {
      let result;
      if (existing) {
        [result] = await tx
          .update(organizationSlaSettings)
          .set({
            timezone: input.timezone?.trim() || businessHours.timezone,
            businessHours,
            escalationEmail: input.escalationEmail ?? null,
            updatedBy: ctx.userId,
            updatedAt: new Date(),
          })
          .where(eq(organizationSlaSettings.organizationId, ctx.orgId))
          .returning();
      } else {
        [result] = await tx
          .insert(organizationSlaSettings)
          .values({
            organizationId: ctx.orgId,
            timezone: input.timezone?.trim() || businessHours.timezone,
            businessHours,
            escalationEmail: input.escalationEmail ?? null,
            updatedBy: ctx.userId,
          })
          .returning();
      }

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "sla.settings_updated",
        resourceType: "sla_settings",
        resourceId: result.id,
        metadata: {
          escalationEmail: result.escalationEmail,
          timezone: result.timezone,
        },
      });

      return result;
    });
  }

  static async sendEscalationTest(ctx: RequestContext) {
    requirePermission(ctx, "sla:manage");
    const settings = await this.getForOrg(ctx.orgId);
    const to = settings?.escalationEmail?.trim();
    if (!to) {
      throw new Error("Set an escalation email before sending a test");
    }

    await enqueueEmail(ctx, {
      to,
      subject: "[Test] SLA escalation notification",
      templateKey: "sla_escalation",
      payload: {
        ticketNumber: 0,
        subject: "SLA escalation test",
        slaStatus: "response_due",
        ticketUrl: `${process.env.BETTER_AUTH_URL ?? "http://localhost:43123"}/agent`,
      },
    });

    await withTenantContext(ctx, async (tx) => {
      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "sla.escalation_test_sent",
        resourceType: "sla_settings",
        resourceId: settings?.id ?? null,
        metadata: { to },
      });
    });
  }

  /** Enqueue escalation email once per ticket when SLA is at risk (agent view). */
  static async maybeEscalateTicket(
    ctx: RequestContext,
    ticketRow: typeof ticket.$inferSelect
  ) {
    if (!hasPermission(ctx, "ticket:read_org")) return;
    const settings = await this.getForOrg(ctx.orgId);
    const to = settings?.escalationEmail?.trim();
    if (!to) return;

    const status = getSlaStatus(ticketRow);
    if (status !== "response_due" && status !== "resolution_due" && status !== "breached") {
      return;
    }

    const dedupeAction = `sla.escalated`;
    const existing = await db.query.auditEvent.findFirst({
      where: and(
        eq(auditEvent.organizationId, ctx.orgId),
        eq(auditEvent.action, dedupeAction),
        eq(auditEvent.resourceId, ticketRow.id)
      ),
    });
    if (existing) return;

    const slaTrigger =
      status === "breached" ? "sla_breached" : ("sla_at_risk" as const);

    await withTenantContext(ctx, async (tx) => {
      const autoCtx = createAutomationContext(ctx.orgId, ticketRow.id);
      const pendingEmails: never[] = [];
      await evaluateTriggers(tx, ctx, ticketRow, slaTrigger, autoCtx, pendingEmails);
    });
    await processPendingOutbox(ctx, 50).catch((err) => {
      console.error("[automation] outbox processing failed after SLA trigger", err);
    });

    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:43123";
    await enqueueEmail(ctx, {
      to,
      subject: `SLA escalation: Ticket #${ticketRow.number}`,
      templateKey: "sla_escalation",
      payload: {
        ticketNumber: ticketRow.number,
        subject: ticketRow.subject,
        slaStatus: status,
        ticketUrl: `${base}/agent/tickets/${ticketRow.id}`,
      },
    });

    await withTenantContext(ctx, async (tx) => {
      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: dedupeAction,
        resourceType: "ticket",
        resourceId: ticketRow.id,
        metadata: { slaStatus: status, to },
      });
    });
  }
}
