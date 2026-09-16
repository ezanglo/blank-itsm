import { db } from "@/db";
import { automationRule, auditEvent } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { ForbiddenError, requirePermission } from "@/lib/auth/context";
import { withTenantContext } from "@/lib/db/transaction";
import {
  AutomationValidationError,
  validateRuleShape,
} from "@/lib/domain/automation/validators";
import { validateAssigneeTargets } from "@/lib/domain/automation/assigneeValidation";
import type { AutomationRuleKind, AutomationTrigger } from "@/lib/domain/automation/types";

export type AutomationRuleInput = {
  name: string;
  description?: string | null;
  kind: AutomationRuleKind;
  enabled?: boolean;
  sortOrder?: number;
  trigger?: AutomationTrigger | null;
  triggerConfig?: Record<string, unknown> | null;
  conditions: unknown;
  actions: unknown;
};

export class AutomationRepository {
  static async list(ctx: RequestContext) {
    requirePermission(ctx, "automation:manage");
    return withTenantContext(ctx, async (tx) =>
      tx.query.automationRule.findMany({
        where: eq(automationRule.organizationId, ctx.orgId),
        orderBy: [asc(automationRule.sortOrder), asc(automationRule.name)],
      })
    );
  }

  static async getById(ctx: RequestContext, id: string) {
    requirePermission(ctx, "automation:manage");
    const row = await withTenantContext(ctx, async (tx) =>
      tx.query.automationRule.findFirst({
        where: and(eq(automationRule.id, id), eq(automationRule.organizationId, ctx.orgId)),
      })
    );
    if (!row) throw new ForbiddenError("Rule not found");
    return row;
  }

  static async create(ctx: RequestContext, input: AutomationRuleInput) {
    requirePermission(ctx, "automation:manage");
    const { conditions, actions, trigger } = validateRuleShape({
      kind: input.kind,
      trigger: input.trigger,
      conditions: input.conditions,
      actions: input.actions,
    });
    await validateAssigneeTargets(ctx.orgId, actions);

    return withTenantContext(ctx, async (tx) => {
      const [row] = await tx
        .insert(automationRule)
        .values({
          organizationId: ctx.orgId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          kind: input.kind,
          enabled: input.enabled ?? true,
          sortOrder: input.sortOrder ?? 0,
          trigger: input.kind === "trigger" ? trigger : null,
          triggerConfig: input.triggerConfig ?? null,
          conditions,
          actions,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "automation_rule.created",
        resourceType: "automation_rule",
        resourceId: row.id,
        metadata: { name: row.name, kind: row.kind },
      });

      return row;
    });
  }

  static async update(ctx: RequestContext, id: string, input: AutomationRuleInput) {
    requirePermission(ctx, "automation:manage");
    const existing = await this.getById(ctx, id);
    const { conditions, actions, trigger } = validateRuleShape({
      kind: input.kind,
      trigger: input.trigger,
      conditions: input.conditions,
      actions: input.actions,
    });
    await validateAssigneeTargets(ctx.orgId, actions);

    return withTenantContext(ctx, async (tx) => {
      const [row] = await tx
        .update(automationRule)
        .set({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          kind: input.kind,
          enabled: input.enabled ?? existing.enabled,
          sortOrder: input.sortOrder ?? existing.sortOrder,
          trigger: input.kind === "trigger" ? trigger : null,
          triggerConfig: input.triggerConfig ?? null,
          conditions,
          actions,
          updatedBy: ctx.userId,
          updatedAt: new Date(),
        })
        .where(and(eq(automationRule.id, id), eq(automationRule.organizationId, ctx.orgId)))
        .returning();

      if (!row) throw new ForbiddenError("Rule not found");

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "automation_rule.updated",
        resourceType: "automation_rule",
        resourceId: row.id,
        metadata: { name: row.name, enabled: row.enabled },
      });

      return row;
    });
  }

  static async setEnabled(ctx: RequestContext, id: string, enabled: boolean) {
    requirePermission(ctx, "automation:manage");
    await this.getById(ctx, id);

    return withTenantContext(ctx, async (tx) => {
      const [row] = await tx
        .update(automationRule)
        .set({ enabled, updatedBy: ctx.userId, updatedAt: new Date() })
        .where(and(eq(automationRule.id, id), eq(automationRule.organizationId, ctx.orgId)))
        .returning();

      if (!row) throw new ForbiddenError("Rule not found");

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "automation_rule.updated",
        resourceType: "automation_rule",
        resourceId: row.id,
        metadata: { enabled },
      });

      return row;
    });
  }

  static async delete(ctx: RequestContext, id: string) {
    requirePermission(ctx, "automation:manage");
    await this.getById(ctx, id);

    return withTenantContext(ctx, async (tx) => {
      const [row] = await tx
        .delete(automationRule)
        .where(and(eq(automationRule.id, id), eq(automationRule.organizationId, ctx.orgId)))
        .returning();

      if (!row) throw new ForbiddenError("Rule not found");

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "automation_rule.deleted",
        resourceType: "automation_rule",
        resourceId: row.id,
        metadata: { name: row.name },
      });

      return row;
    });
  }
}

export { AutomationValidationError };
