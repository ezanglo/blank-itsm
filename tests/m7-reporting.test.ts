import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import { organization, role, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { ReportingRepository } from "@/lib/repositories/reportingRepository";
import { rowsToCsv, escapeCsvCell } from "@/lib/export/csv";
import { ForbiddenError } from "@/lib/auth/context";

describe("M7 Reporting", () => {
  let orgA: { id: string };
  let orgB: { id: string };
  let agentRole: { id: string };
  let userAAgent: { id: string };
  let userBAgent: { id: string };

  beforeAll(async () => {
    const foundOrgA = await db.query.organization.findFirst({
      where: eq(organization.slug, "org-a"),
    });
    const foundOrgB = await db.query.organization.findFirst({
      where: eq(organization.slug, "org-b"),
    });
    const foundAgentRole = await db.query.role.findFirst({
      where: eq(role.key, "agent"),
    });
    const foundUserAAgent = await db.query.user.findFirst({
      where: eq(user.email, "agent@org-a.test"),
    });
    const foundUserBAgent = await db.query.user.findFirst({
      where: eq(user.email, "agent@org-b.test"),
    });

    if (
      !foundOrgA ||
      !foundOrgB ||
      !foundAgentRole ||
      !foundUserAAgent ||
      !foundUserBAgent
    ) {
      throw new Error("Seed data incomplete. Run npm run db:seed");
    }

    orgA = foundOrgA;
    orgB = foundOrgB;
    agentRole = foundAgentRole;
    userAAgent = foundUserAAgent;
    userBAgent = foundUserBAgent;
  });

  function agentCtx(orgId: string, userId: string): RequestContext {
    return {
      userId,
      orgId,
      role: "agent",
      roleId: agentRole.id,
      permissions: new Set([
        "ticket:read_org",
        "agent:access",
        "report:read",
      ]),
    };
  }

  describe("RPT-010: Dashboard org isolation", () => {
    it("metrics only reflect the agent organization", async () => {
      const ctxA = agentCtx(orgA.id, userAAgent.id);
      const ctxB = agentCtx(orgB.id, userBAgent.id);

      const metricsA = await ReportingRepository.getOpsDashboard(ctxA);
      const metricsB = await ReportingRepository.getOpsDashboard(ctxB);
      const countA = await ReportingRepository.countTicketsInOrg(ctxA);
      const countB = await ReportingRepository.countTicketsInOrg(ctxB);

      expect(countA).toBeGreaterThan(0);
      expect(countB).toBeGreaterThan(0);

      const listA = await ReportingRepository.listTicketsForReport(ctxA);
      const listB = await ReportingRepository.listTicketsForReport(ctxB);

      expect(listA.length).toBe(countA);
      expect(listB.length).toBe(countB);
      expect(metricsA.openBacklog).toBeLessThanOrEqual(countA);
      expect(metricsB.openBacklog).toBeLessThanOrEqual(countB);

      const subjectsA = listA.map((t) => t.subject);
      const subjectsB = listB.map((t) => t.subject);

      expect(subjectsA).toContain("Cannot access email");
      expect(subjectsA).not.toContain("Network issue");
      expect(subjectsB).toContain("Network issue");
      expect(subjectsB).not.toContain("Cannot access email");
    });
  });

  describe("RPT-011: Permission gate", () => {
    it("denies report access without report:read", async () => {
      const ctx: RequestContext = {
        userId: userAAgent.id,
        orgId: orgA.id,
        role: "agent",
        roleId: agentRole.id,
        permissions: new Set(["ticket:read_org", "agent:access"]),
      };

      await expect(ReportingRepository.getOpsDashboard(ctx)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe("RPT-012: CSV helpers", () => {
    it("escapes commas and quotes", () => {
      expect(escapeCsvCell('say "hello", world')).toBe('"say ""hello"", world"');
      const csv = rowsToCsv(["a"], [["line1\nline2"]]);
      expect(csv).toContain('"line1\nline2"');
    });
  });
});
