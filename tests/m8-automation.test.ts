import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import {
  organization,
  user,
  ticket,
  emailOutbox,
  auditEvent,
  automationRule,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { ForbiddenError } from "@/lib/auth/context";
import { AutomationRepository, AutomationValidationError } from "@/lib/repositories/automationRepository";
import { TicketRepository } from "@/lib/repositories/ticketRepository";
import {
  parseConditions,
  parseActions,
  assertAutomationTrigger,
} from "@/lib/domain/automation/validators";
import { MAX_ACTIONS_PER_PASS } from "@/lib/domain/automation/types";
import { ticketEvent } from "@/db/schema";
import { conditionsMatch } from "@/lib/domain/automation/matching";
import { createAutomationContext, evaluateTriggers } from "@/lib/domain/automation/engine";
import { withTenantContext } from "@/lib/db/transaction";

function ctxFor(
  userId: string,
  orgId: string,
  permissions: string[],
  roleKey = "admin"
): RequestContext {
  return {
    userId,
    orgId,
    role: roleKey,
    roleId: "test",
    permissions: new Set(permissions),
  };
}

describe("M8 automation rules", () => {
  let orgAId: string;
  let orgBId: string;
  let adminA: { id: string };
  let agentA: { id: string };
  let requesterA: { id: string };

  beforeAll(async () => {
    const orgA = await db.query.organization.findFirst({ where: eq(organization.slug, "org-a") });
    const orgB = await db.query.organization.findFirst({ where: eq(organization.slug, "org-b") });
    const adm = await db.query.user.findFirst({ where: eq(user.email, "admin@org-a.test") });
    const agt = await db.query.user.findFirst({ where: eq(user.email, "agent@org-a.test") });
    const req = await db.query.user.findFirst({ where: eq(user.email, "requester@org-a.test") });
    if (!orgA || !orgB || !adm || !agt || !req) throw new Error("Seed data missing");
    orgAId = orgA.id;
    orgBId = orgB.id;
    adminA = adm;
    agentA = agt;
    requesterA = req;
  });

  it("rejects unknown trigger on save", () => {
    expect(() => assertAutomationTrigger("not_a_real_trigger")).toThrow(AutomationValidationError);
  });

  it("rejects requester as assignee on save", async () => {
    const ctx = ctxFor(adminA.id, orgAId, ["automation:manage", "admin:access"]);
    await expect(
      AutomationRepository.create(ctx, {
        name: `M8 bad assignee ${Date.now()}`,
        kind: "assignment",
        conditions: { all: [] },
        actions: [{ type: "assign", assigneeUserId: requesterA.id }],
      })
    ).rejects.toThrow(AutomationValidationError);
  });

  it("rejects unknown condition fields on save", () => {
    expect(() =>
      parseConditions({ all: [{ field: "department", op: "eq", value: "hr" }] })
    ).toThrow(AutomationValidationError);
  });

  it("rejects assignmentGroupId on assign action", () => {
    expect(() =>
      parseActions([{ type: "assign", assignmentGroupId: "x", assigneeUserId: "y" }])
    ).toThrow(AutomationValidationError);
  });

  it("denies agent automation CRUD", async () => {
    const ctx = ctxFor(agentA.id, orgAId, ["agent:access"], "agent");
    await expect(AutomationRepository.list(ctx)).rejects.toThrow(ForbiddenError);
  });

  it("creates assignment rule scoped to org A", async () => {
    const ctx = ctxFor(adminA.id, orgAId, ["automation:manage", "admin:access"]);
    const rule = await AutomationRepository.create(ctx, {
      name: `M8 assign incident ${Date.now()}`,
      kind: "assignment",
      sortOrder: 0,
      conditions: { all: [{ field: "type", op: "eq", value: "incident" }] },
      actions: [{ type: "assign", assigneeUserId: agentA.id }],
    });
    expect(rule.organizationId).toBe(orgAId);

    const audit = await db.query.auditEvent.findFirst({
      where: and(
        eq(auditEvent.organizationId, orgAId),
        eq(auditEvent.resourceId, rule.id),
        eq(auditEvent.action, "automation_rule.created")
      ),
    });
    expect(audit).toBeTruthy();
  });

  it("first-match assignment on ticket create", async () => {
    const ctx = ctxFor(adminA.id, orgAId, [
      "automation:manage",
      "admin:access",
      "ticket:create",
      "ticket:read_org",
    ]);

    await AutomationRepository.create(ctx, {
      name: `M8 first match A ${Date.now()}`,
      kind: "assignment",
      sortOrder: 0,
      conditions: { all: [{ field: "type", op: "eq", value: "incident" }] },
      actions: [{ type: "assign", assigneeUserId: agentA.id }],
    });
    await AutomationRepository.create(ctx, {
      name: `M8 second incident rule ${Date.now()}`,
      kind: "assignment",
      sortOrder: 10,
      conditions: { all: [{ field: "type", op: "eq", value: "service_request" }] },
      actions: [{ type: "assign", assigneeUserId: adminA.id }],
    });

    const requesterCtx = ctxFor(requesterA.id, orgAId, ["ticket:create", "ticket:read_own", "portal:access"], "requester");
    const created = await TicketRepository.create(requesterCtx, {
      type: "incident",
      subject: "M8 assignment test",
      description: "body",
    });
    expect(created.assigneeId).toBe(agentA.id);

    const events = await TicketRepository.listEvents(
      ctxFor(adminA.id, orgAId, ["ticket:read_org", "admin:access"]),
      created.id,
      true
    );
    const assignmentEvent = events.find((e) => e.kind === "assignment");
    expect(assignmentEvent?.metadata).toContain("automation");
  });

  it("disabled rule does not assign", async () => {
    const adminB = await db.query.user.findFirst({ where: eq(user.email, "admin@org-b.test") });
    const requesterB = await db.query.user.findFirst({
      where: eq(user.email, "requester@org-b.test"),
    });
    const agentB = await db.query.user.findFirst({ where: eq(user.email, "agent@org-b.test") });
    if (!adminB || !requesterB || !agentB) throw new Error("Org B seed missing");

    const ctx = ctxFor(adminB.id, orgBId, ["automation:manage", "admin:access", "ticket:create"]);
    const tag = `M8-disable-${Date.now()}`;
    const rule = await AutomationRepository.create(ctx, {
      name: tag,
      kind: "assignment",
      enabled: true,
      sortOrder: 0,
      conditions: { all: [{ field: "type", op: "eq", value: "incident" }] },
      actions: [{ type: "assign", assigneeUserId: agentB.id }],
    });

    const requesterCtx = ctxFor(requesterB.id, orgBId, ["ticket:create", "portal:access"], "requester");
    const assigned = await TicketRepository.create(requesterCtx, {
      type: "incident",
      subject: tag,
      description: "body",
    });
    expect(assigned.assigneeId).toBe(agentB.id);

    await AutomationRepository.setEnabled(ctx, rule.id, false);

    const unassigned = await TicketRepository.create(requesterCtx, {
      type: "incident",
      subject: `${tag}-2`,
      description: "body",
    });
    expect(unassigned.assigneeId).toBeNull();
  });

  it("org B ticket never runs org A rules", async () => {
    const adminB = await db.query.user.findFirst({ where: eq(user.email, "admin@org-b.test") });
    const requesterB = await db.query.user.findFirst({ where: eq(user.email, "requester@org-b.test") });
    if (!adminB || !requesterB) throw new Error("Org B seed missing");

    const ctxA = ctxFor(adminA.id, orgAId, ["automation:manage", "admin:access"]);
    const uniqueName = `OrgA only rule ${Date.now()}`;
    await AutomationRepository.create(ctxA, {
      name: uniqueName,
      kind: "assignment",
      sortOrder: 0,
      conditions: { all: [] },
      actions: [{ type: "assign", assigneeUserId: agentA.id }],
    });

    const requesterBCtx = ctxFor(requesterB.id, orgBId, ["ticket:create", "portal:access"], "requester");
    const ticketB = await TicketRepository.create(requesterBCtx, {
      type: "incident",
      subject: "Org B",
      description: "x",
    });
    expect(ticketB.assigneeId).toBeNull();

    const listB = await db.query.automationRule.findMany({
      where: eq(automationRule.organizationId, orgBId),
    });
    expect(listB.some((r) => r.name === uniqueName)).toBe(false);
  });

  it("status change trigger enqueues email to outbox", async () => {
    const ctx = ctxFor(adminA.id, orgAId, [
      "automation:manage",
      "admin:access",
      "ticket:read_org",
      "ticket:update_status",
      "ticket:create",
    ]);

    await AutomationRepository.create(ctx, {
      name: `M8 resolve notify ${Date.now()}`,
      kind: "trigger",
      trigger: "status_changed",
      triggerConfig: { toStatus: "resolved" },
      sortOrder: 0,
      conditions: { all: [] },
      actions: [
        {
          type: "enqueue_email",
          templateKey: "automation_notify",
          recipient: "requester",
        },
      ],
    });

    const requesterCtx = ctxFor(requesterA.id, orgAId, ["ticket:create", "portal:access"], "requester");
    const created = await TicketRepository.create(requesterCtx, {
      type: "incident",
      subject: "Notify on resolve",
      description: "d",
    });

    await TicketRepository.updateStatus(ctx, created.id, "in_progress");
    await TicketRepository.updateStatus(ctx, created.id, "resolved");

    const outbox = await db.query.emailOutbox.findMany({
      where: and(eq(emailOutbox.organizationId, orgAId)),
      orderBy: [desc(emailOutbox.createdAt)],
      limit: 5,
    });
    expect(outbox.some((r) => r.templateKey === "automation_notify")).toBe(true);
  });

  it("internal note from automation is hidden from requester", async () => {
    const ctx = ctxFor(adminA.id, orgAId, ["automation:manage", "admin:access", "ticket:create"]);
    await AutomationRepository.create(ctx, {
      name: `M8 internal note ${Date.now()}`,
      kind: "trigger",
      trigger: "ticket_created",
      sortOrder: 0,
      conditions: { all: [{ field: "type", op: "eq", value: "incident" }] },
      actions: [{ type: "add_internal_note", body: "Automation secret" }],
    });

    const requesterCtx = ctxFor(requesterA.id, orgAId, ["ticket:create", "portal:access"], "requester");
    const created = await TicketRepository.create(requesterCtx, {
      type: "incident",
      subject: "Internal note test",
      description: "d",
    });

    const requesterEvents = await TicketRepository.listEvents(requesterCtx, created.id, false);
    expect(requesterEvents.some((e) => e.body === "Automation secret")).toBe(false);

    const agentEvents = await TicketRepository.listEvents(
      ctxFor(agentA.id, orgAId, ["ticket:read_org", "agent:access"]),
      created.id,
      true
    );
    expect(agentEvents.some((e) => e.kind === "comment_internal")).toBe(true);
  });

  it("AC-M8-023: status ping-pong rules stay bounded in one user pass", async () => {
    const adminB = await db.query.user.findFirst({ where: eq(user.email, "admin@org-b.test") });
    const requesterB = await db.query.user.findFirst({
      where: eq(user.email, "requester@org-b.test"),
    });
    if (!adminB || !requesterB) throw new Error("Org B seed missing");

    const adminCtx = ctxFor(adminB.id, orgBId, [
      "automation:manage",
      "admin:access",
      "ticket:create",
      "ticket:read_org",
      "ticket:update_status",
    ]);
    const tag = `M8-pingpong-${Date.now()}`;

    await AutomationRepository.create(adminCtx, {
      name: `${tag}-to-resolved`,
      kind: "trigger",
      trigger: "status_changed",
      triggerConfig: { toStatus: "resolved" },
      sortOrder: 0,
      conditions: { all: [] },
      actions: [{ type: "set_status", toStatus: "open" }],
    });
    await AutomationRepository.create(adminCtx, {
      name: `${tag}-to-open`,
      kind: "trigger",
      trigger: "status_changed",
      triggerConfig: { toStatus: "open" },
      sortOrder: 1,
      conditions: { all: [] },
      actions: [{ type: "set_status", toStatus: "resolved" }],
    });

    const requesterCtx = ctxFor(requesterB.id, orgBId, ["ticket:create", "portal:access"], "requester");
    const created = await TicketRepository.create(requesterCtx, {
      type: "incident",
      subject: tag,
      description: "loop guard",
    });
    expect(created.status).toBe("open");

    await TicketRepository.updateStatus(adminCtx, created.id, "in_progress");
    const afterResolve = await TicketRepository.updateStatus(adminCtx, created.id, "resolved");
    expect(afterResolve.status).toBe("open");

    const autoStatusEvents = await db.query.ticketEvent.findMany({
      where: and(eq(ticketEvent.ticketId, created.id), eq(ticketEvent.kind, "status_change")),
    });
    const automationStatusChanges = autoStatusEvents.filter(
      (e) => e.metadata?.includes('"source":"automation"') && e.metadata?.includes("set_status")
    );
    expect(automationStatusChanges.length).toBe(1);
    expect(automationStatusChanges.length).toBeLessThanOrEqual(MAX_ACTIONS_PER_PASS);

    const autoCtx = createAutomationContext(orgBId, created.id);
    autoCtx.depth = 1;
    await withTenantContext(adminCtx, async (tx) => {
      const row = await tx.query.ticket.findFirst({ where: eq(ticket.id, created.id) });
      if (!row) throw new Error("ticket missing");
      const before = autoCtx.actionExecutions;
      await evaluateTriggers(
        tx,
        adminCtx,
        row,
        "status_changed",
        autoCtx,
        [],
        { fromStatus: "open", toStatus: "resolved" }
      );
      expect(autoCtx.actionExecutions).toBe(before);
    });
  });

  it("skips trigger evaluation when depth > 0", async () => {
    const ticketRow = await db.query.ticket.findFirst({
      where: eq(ticket.organizationId, orgAId),
    });
    if (!ticketRow) throw new Error("No ticket");

    const ctx = ctxFor(adminA.id, orgAId, ["admin:access"]);
    const autoCtx = createAutomationContext(orgAId, ticketRow.id);
    autoCtx.depth = 1;

    await withTenantContext(ctx, async (tx) => {
      const before = autoCtx.actionExecutions;
      await evaluateTriggers(
        tx,
        ctx,
        ticketRow,
        "status_changed",
        autoCtx,
        [],
        { fromStatus: "open", toStatus: "resolved" }
      );
      expect(autoCtx.actionExecutions).toBe(before);
    });
  });

  it("conditionsMatch respects AND logic", async () => {
    const row = await db.query.ticket.findFirst({ where: eq(ticket.organizationId, orgAId) });
    if (!row) throw new Error("No ticket");
    expect(
      conditionsMatch(row, {
        all: [
          { field: "type", op: "eq", value: row.type },
          { field: "status", op: "eq", value: row.status },
        ],
      })
    ).toBe(true);
    expect(
      conditionsMatch(row, {
        all: [{ field: "type", op: "eq", value: "service_request" }],
      })
    ).toBe(row.type === "service_request");
  });

  it("forged cross-org rule id returns forbidden on update", async () => {
    const ctxA = ctxFor(adminA.id, orgAId, ["automation:manage", "admin:access"]);
    const rule = await AutomationRepository.create(ctxA, {
      name: "Cross org probe",
      kind: "assignment",
      conditions: { all: [] },
      actions: [{ type: "assign", assigneeUserId: agentA.id }],
    });

    const adminB = await db.query.user.findFirst({ where: eq(user.email, "admin@org-b.test") });
    if (!adminB) throw new Error("admin b missing");
    const ctxB = ctxFor(adminB.id, orgBId, ["automation:manage", "admin:access"]);

    await expect(
      AutomationRepository.update(ctxB, rule.id, {
        name: "Hijack",
        kind: "assignment",
        conditions: { all: [] },
        actions: [{ type: "assign", assigneeUserId: agentA.id }],
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("action cap is defined at 20", () => {
    expect(MAX_ACTIONS_PER_PASS).toBe(20);
  });
});
