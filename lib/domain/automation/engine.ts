import { and, asc, eq, inArray } from "drizzle-orm";
import {
  automationRule,
  organizationMembership,
  role,
  ticket,
  ticketEvent,
  user,
  emailOutbox,
} from "@/db/schema";
import type { ticket as ticketTable } from "@/db/schema";
import type { RequestContext } from "@/lib/auth/context";
import { assertTransition, type TicketStatus } from "@/lib/domain/ticketStatus";
import { conditionsMatch, triggerConfigMatches } from "./matching";
import type {
  AutomationAction,
  AutomationContext,
  AutomationTrigger,
  PendingAutomationEmail,
  StatusChangedMeta,
} from "./types";
import { MAX_ACTIONS_PER_PASS as ACTION_CAP } from "./types";
import { db } from "@/db";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function createAutomationContext(orgId: string, ticketId: string): AutomationContext {
  return {
    orgId,
    ticketId,
    depth: 0,
    firedRuleIds: new Set(),
    actionExecutions: 0,
  };
}

async function loadEnabledRules(
  tx: DbTx,
  orgId: string,
  kind: "assignment" | "trigger",
  trigger?: AutomationTrigger
) {
  const rows = await tx.query.automationRule.findMany({
    where: and(
      eq(automationRule.organizationId, orgId),
      eq(automationRule.kind, kind),
      eq(automationRule.enabled, true)
    ),
    orderBy: [asc(automationRule.sortOrder)],
  });
  if (kind === "trigger" && trigger) {
    return rows.filter((r) => r.trigger === trigger);
  }
  return rows;
}

async function assertAgentInOrg(tx: DbTx, orgId: string, userId: string): Promise<boolean> {
  const membership = await tx.query.organizationMembership.findFirst({
    where: and(
      eq(organizationMembership.organizationId, orgId),
      eq(organizationMembership.userId, userId),
      eq(organizationMembership.status, "active")
    ),
    with: { role: true },
  });
  if (!membership?.role) return false;
  return membership.role.key === "agent" || membership.role.key === "admin";
}

function automationMeta(ruleId: string, ruleName: string, action: string) {
  return JSON.stringify({ source: "automation", ruleId, ruleName, action });
}

async function applyAction(
  tx: DbTx,
  ctx: RequestContext,
  ticketRow: typeof ticketTable.$inferSelect,
  rule: { id: string; name: string },
  action: AutomationAction,
  autoCtx: AutomationContext,
  pendingEmails: PendingAutomationEmail[]
): Promise<typeof ticketTable.$inferSelect> {
  if (autoCtx.actionExecutions >= ACTION_CAP) {
    return ticketRow;
  }
  autoCtx.actionExecutions += 1;

  if (action.type === "assign") {
    const ok = await assertAgentInOrg(tx, ctx.orgId, action.assigneeUserId!);
    if (!ok) return ticketRow;

    const [updated] = await tx
      .update(ticket)
      .set({ assigneeId: action.assigneeUserId, updatedAt: new Date() })
      .where(and(eq(ticket.id, ticketRow.id), eq(ticket.organizationId, ctx.orgId)))
      .returning();

    await tx.insert(ticketEvent).values({
      organizationId: ctx.orgId,
      ticketId: ticketRow.id,
      actorId: null,
      kind: "assignment",
      body: `Automation assigned ticket via rule "${rule.name}"`,
      metadata: automationMeta(rule.id, rule.name, "assign"),
    });
    return updated ?? ticketRow;
  }

  if (action.type === "add_internal_note") {
    await tx.insert(ticketEvent).values({
      organizationId: ctx.orgId,
      ticketId: ticketRow.id,
      actorId: null,
      kind: "comment_internal",
      body: action.body,
      metadata: automationMeta(rule.id, rule.name, "add_internal_note"),
    });
    return ticketRow;
  }

  if (action.type === "set_status") {
    const from = ticketRow.status as TicketStatus;
    const to = action.toStatus as TicketStatus;
    try {
      assertTransition(from, to);
    } catch {
      return ticketRow;
    }
    const updates: Record<string, unknown> = { status: to, updatedAt: new Date() };
    if (to === "resolved") updates.resolvedAt = new Date();
    if (to === "closed") {
      updates.closedAt = new Date();
      if (!ticketRow.resolvedAt) updates.resolvedAt = new Date();
    }

    const [updated] = await tx
      .update(ticket)
      .set(updates)
      .where(and(eq(ticket.id, ticketRow.id), eq(ticket.organizationId, ctx.orgId)))
      .returning();

    await tx.insert(ticketEvent).values({
      organizationId: ctx.orgId,
      ticketId: ticketRow.id,
      actorId: null,
      kind: "status_change",
      body: `Automation changed status from ${from} to ${to} via rule "${rule.name}"`,
      metadata: automationMeta(rule.id, rule.name, "set_status"),
    });
    return updated ?? ticketRow;
  }

  if (action.type === "enqueue_email") {
    const recipients = await resolveEmailRecipients(tx, ctx.orgId, ticketRow, action);
    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:43123";
    for (const to of recipients) {
      pendingEmails.push({
        to,
        subject: `Automation: Ticket #${ticketRow.number}`,
        templateKey: "automation_notify",
        payload: {
          ticketNumber: ticketRow.number,
          subject: ticketRow.subject,
          ruleName: rule.name,
          ticketUrl: `${base}/agent/tickets/${ticketRow.id}`,
        },
      });
      await tx.insert(emailOutbox).values({
        organizationId: ctx.orgId,
        toAddress: to,
        subject: `Automation: Ticket #${ticketRow.number}`,
        templateKey: action.templateKey,
        payload: JSON.stringify({
          ticketNumber: ticketRow.number,
          subject: ticketRow.subject,
          ruleName: rule.name,
          ticketUrl: `${base}/agent/tickets/${ticketRow.id}`,
        }),
        status: "pending",
      });
    }
    return ticketRow;
  }

  return ticketRow;
}

async function resolveEmailRecipients(
  tx: DbTx,
  orgId: string,
  ticketRow: typeof ticketTable.$inferSelect,
  action: Extract<AutomationAction, { type: "enqueue_email" }>
): Promise<string[]> {
  const emails: string[] = [];

  if (action.recipient === "requester") {
    const requester = await tx.query.user.findFirst({
      where: eq(user.id, ticketRow.requesterId),
    });
    if (requester?.email) emails.push(requester.email);
  } else if (action.recipient === "assignee" && ticketRow.assigneeId) {
    const assignee = await tx.query.user.findFirst({
      where: eq(user.id, ticketRow.assigneeId),
    });
    if (assignee?.email) emails.push(assignee.email);
  } else if (action.recipient === "user_ids" && action.userIds?.length) {
    const members = await tx.query.organizationMembership.findMany({
      where: and(
        eq(organizationMembership.organizationId, orgId),
        inArray(organizationMembership.userId, action.userIds),
        eq(organizationMembership.status, "active")
      ),
      with: { user: true },
    });
    for (const m of members) {
      if (m.user?.email) emails.push(m.user.email);
    }
  }

  return [...new Set(emails)];
}

async function runRuleActions(
  tx: DbTx,
  ctx: RequestContext,
  ticketRow: typeof ticketTable.$inferSelect,
  rule: { id: string; name: string; actions: AutomationAction[] },
  autoCtx: AutomationContext,
  pendingEmails: PendingAutomationEmail[]
) {
  let current = ticketRow;
  for (const action of rule.actions) {
    if (autoCtx.actionExecutions >= ACTION_CAP) break;
    current = await applyAction(tx, ctx, current, rule, action, autoCtx, pendingEmails);
  }
  return current;
}

export async function evaluateAssignmentOnCreate(
  tx: DbTx,
  ctx: RequestContext,
  ticketRow: typeof ticketTable.$inferSelect,
  autoCtx: AutomationContext,
  pendingEmails: PendingAutomationEmail[]
): Promise<typeof ticketTable.$inferSelect> {
  if (autoCtx.depth > 0) return ticketRow;

  const rules = await loadEnabledRules(tx, ctx.orgId, "assignment");
  for (const rule of rules) {
    if (!conditionsMatch(ticketRow, rule.conditions)) continue;
    autoCtx.firedRuleIds.add(rule.id);
    return await runRuleActions(tx, ctx, ticketRow, rule, autoCtx, pendingEmails);
  }
  return ticketRow;
}

export async function evaluateTriggers(
  tx: DbTx,
  ctx: RequestContext,
  ticketRow: typeof ticketTable.$inferSelect,
  trigger: AutomationTrigger,
  autoCtx: AutomationContext,
  pendingEmails: PendingAutomationEmail[],
  meta?: StatusChangedMeta
): Promise<typeof ticketTable.$inferSelect> {
  if (autoCtx.depth > 0) return ticketRow;

  const rules = await loadEnabledRules(tx, ctx.orgId, "trigger", trigger);
  let current = ticketRow;

  for (const rule of rules) {
    if (autoCtx.firedRuleIds.has(rule.id)) continue;
    if (!triggerConfigMatches(rule.triggerConfig, trigger, meta)) continue;
    if (!conditionsMatch(current, rule.conditions)) continue;

    autoCtx.firedRuleIds.add(rule.id);
    current = await runRuleActions(tx, ctx, current, rule, autoCtx, pendingEmails);
  }

  return current;
}

export async function runTicketCreatedAutomation(
  tx: DbTx,
  ctx: RequestContext,
  ticketRow: typeof ticketTable.$inferSelect
): Promise<typeof ticketTable.$inferSelect> {
  const autoCtx = createAutomationContext(ctx.orgId, ticketRow.id);
  const pendingEmails: PendingAutomationEmail[] = [];
  let current = await evaluateAssignmentOnCreate(tx, ctx, ticketRow, autoCtx, pendingEmails);
  current = await evaluateTriggers(
    tx,
    ctx,
    current,
    "ticket_created",
    autoCtx,
    pendingEmails
  );
  return current;
}
