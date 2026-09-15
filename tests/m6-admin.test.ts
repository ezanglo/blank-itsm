import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import { organization, user, organizationMembership, emailOutbox } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { ForbiddenError } from "@/lib/auth/context";
import { UserRepository } from "@/lib/repositories/userRepository";
import { SlaRepository } from "@/lib/repositories/slaRepository";
import { AuditRepository } from "@/lib/repositories/auditRepository";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/domain/businessHours";

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

describe("M6 admin hardening", () => {
  let orgAId: string;
  let adminA: { id: string };
  let agentA: { id: string };
  let adminMembershipId: string;

  beforeAll(async () => {
    const orgA = await db.query.organization.findFirst({ where: eq(organization.slug, "org-a") });
    const adm = await db.query.user.findFirst({ where: eq(user.email, "admin@org-a.test") });
    const agt = await db.query.user.findFirst({ where: eq(user.email, "agent@org-a.test") });
    if (!orgA || !adm || !agt) throw new Error("Seed data missing");

    orgAId = orgA.id;
    adminA = adm;
    agentA = agt;

    const adminMem = await db.query.organizationMembership.findFirst({
      where: and(
        eq(organizationMembership.organizationId, orgAId),
        eq(organizationMembership.userId, adminA.id)
      ),
    });
    if (!adminMem) throw new Error("Membership missing");
    adminMembershipId = adminMem.id;
  });

  it("denies invite without user:invite", async () => {
    const ctx = ctxFor(adminA.id, orgAId, ["admin:access"]);
    await expect(
      UserRepository.inviteUser(ctx, { email: "blocked@example.com", roleKey: "requester" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("denies self role change", async () => {
    const ctx = ctxFor(adminA.id, orgAId, ["user:role_change", "admin:access"]);
    await expect(
      UserRepository.changeRole(ctx, adminMembershipId, "agent")
    ).rejects.toThrow("cannot change your own role");
  });

  it("tracks active admin count for guardrails", async () => {
    const ctx = ctxFor(adminA.id, orgAId, ["admin:access"]);
    expect(await UserRepository.countActiveAdmins(ctx)).toBeGreaterThanOrEqual(1);
  });

  it("saves SLA settings and sends escalation test to outbox", async () => {
    const ctx = ctxFor(adminA.id, orgAId, ["sla:manage", "admin:access"]);
    await SlaRepository.upsert(ctx, {
      businessHours: DEFAULT_BUSINESS_HOURS,
      escalationEmail: "sla-test@org-a.test",
    });

    await SlaRepository.sendEscalationTest(ctx);

    const rows = await db.query.emailOutbox.findMany({
      where: eq(emailOutbox.organizationId, orgAId),
      orderBy: [desc(emailOutbox.createdAt)],
      limit: 1,
    });
    const row = rows[0];
    expect(row?.toAddress).toBe("sla-test@org-a.test");
    expect(row?.templateKey).toBe("sla_escalation");
  });

  it("lists audit events for org", async () => {
    const ctx = ctxFor(adminA.id, orgAId, ["audit:read", "admin:access"]);
    const events = await AuditRepository.listRecent(ctx, 5);
    expect(events.length).toBeGreaterThan(0);
    events.forEach((e) => expect(e.organizationId).toBe(orgAId));
  });

  it("denies audit list without audit:read", async () => {
    const ctx = ctxFor(agentA.id, orgAId, ["agent:access"]);
    await expect(AuditRepository.listRecent(ctx, 5)).rejects.toThrow(ForbiddenError);
  });
});
