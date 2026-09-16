import { describe, it, expect, beforeAll, vi, afterEach } from "vitest";
import { db } from "@/db";
import { organization, role, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import * as authContext from "@/lib/auth/context";
import { ReportingRepository } from "@/lib/repositories/reportingRepository";
import { rowsToCsv, escapeCsvCell } from "@/lib/export/csv";
import { ForbiddenError } from "@/lib/auth/context";
import { auth } from "@/lib/auth";
import {
  ensureCredentialAccountForEmail,
  SEED_PASSWORD,
} from "@/lib/auth/seed-credentials";
import { GET } from "@/app/api/reports/tickets/export/route";

const testHeaders = { current: new Headers() };

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(testHeaders.current),
}));

describe("M7 Reporting", () => {
  let orgA: { id: string };
  let orgB: { id: string };
  let agentRole: { id: string };
  let requesterRole: { id: string };
  let userAAgent: { id: string };
  let userBAgent: { id: string };
  let userARequester: { id: string };

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
    const foundRequesterRole = await db.query.role.findFirst({
      where: eq(role.key, "requester"),
    });
    const foundUserAAgent = await db.query.user.findFirst({
      where: eq(user.email, "agent@org-a.test"),
    });
    const foundUserBAgent = await db.query.user.findFirst({
      where: eq(user.email, "agent@org-b.test"),
    });
    const foundUserARequester = await db.query.user.findFirst({
      where: eq(user.email, "requester@org-a.test"),
    });

    if (
      !foundOrgA ||
      !foundOrgB ||
      !foundAgentRole ||
      !foundRequesterRole ||
      !foundUserAAgent ||
      !foundUserBAgent ||
      !foundUserARequester
    ) {
      throw new Error("Seed data incomplete. Run npm run db:seed");
    }

    orgA = foundOrgA;
    orgB = foundOrgB;
    agentRole = foundAgentRole;
    requesterRole = foundRequesterRole;
    userAAgent = foundUserAAgent;
    userBAgent = foundUserBAgent;
    userARequester = foundUserARequester;

    await ensureCredentialAccountForEmail("agent@org-a.test", SEED_PASSWORD);
    await ensureCredentialAccountForEmail("agent@org-b.test", SEED_PASSWORD);
    await ensureCredentialAccountForEmail("requester@org-a.test", SEED_PASSWORD);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    testHeaders.current = new Headers();
  });

  function agentCtx(orgId: string, userId: string, permissions?: Set<string>): RequestContext {
    return {
      userId,
      orgId,
      role: "agent",
      roleId: agentRole.id,
      permissions:
        permissions ??
        new Set(["ticket:read_org", "agent:access", "report:read"]),
    };
  }

  function requesterCtx(userId: string): RequestContext {
    return {
      userId,
      orgId: orgA.id,
      role: "requester",
      roleId: requesterRole.id,
      permissions: new Set([
        "ticket:read_own",
        "ticket:create",
        "portal:access",
      ]),
    };
  }

  function agentMissingReportRead(): RequestContext {
    return {
      userId: userAAgent.id,
      orgId: orgA.id,
      role: "agent",
      roleId: agentRole.id,
      permissions: new Set(["ticket:read_org", "agent:access"]),
    };
  }

  async function signInCookie(email: string): Promise<string> {
    const response = await auth.api.signInEmail({
      body: { email, password: SEED_PASSWORD },
      asResponse: true,
      headers: new Headers({
        host: "localhost:43123",
        origin: "http://localhost:43123",
        "x-forwarded-host": "localhost:43123",
        "x-forwarded-proto": "http",
      }),
    });
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie");
    if (!setCookie) throw new Error("missing session cookie");
    return setCookie.split(";")[0]!;
  }

  async function callExport(cookie?: string, scope: "all" | "open" = "all") {
    const headers = new Headers();
    if (cookie) headers.set("cookie", cookie);
    testHeaders.current = headers;
    return GET(
      new Request(
        `http://localhost:43123/api/reports/tickets/export?scope=${scope}`,
        { headers }
      )
    );
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

  describe("RPT-011: Permission gate (all report query paths)", () => {
    it("denies dashboard, list, count, and assert without report:read", async () => {
      const ctx = agentMissingReportRead();

      expect(() => ReportingRepository.assertCanReadReports(ctx)).toThrow(
        ForbiddenError
      );
      await expect(ReportingRepository.getOpsDashboard(ctx)).rejects.toThrow(
        ForbiddenError
      );
      await expect(
        ReportingRepository.listTicketsForReport(ctx)
      ).rejects.toThrow(ForbiddenError);
      await expect(
        ReportingRepository.listTicketsForReport(ctx, { status: "open" })
      ).rejects.toThrow(ForbiddenError);
      await expect(ReportingRepository.countTicketsInOrg(ctx)).rejects.toThrow(
        ForbiddenError
      );
    });

    it("denies requester (no report:read / ticket:read_org) on all report paths", async () => {
      const ctx = requesterCtx(userARequester.id);

      expect(() => ReportingRepository.assertCanReadReports(ctx)).toThrow(
        ForbiddenError
      );
      await expect(ReportingRepository.getOpsDashboard(ctx)).rejects.toThrow(
        ForbiddenError
      );
      await expect(
        ReportingRepository.listTicketsForReport(ctx)
      ).rejects.toThrow(ForbiddenError);
      await expect(ReportingRepository.countTicketsInOrg(ctx)).rejects.toThrow(
        ForbiddenError
      );
    });

    it("denies when report:read present but ticket:read_org missing", async () => {
      const ctx: RequestContext = {
        userId: userAAgent.id,
        orgId: orgA.id,
        role: "agent",
        roleId: agentRole.id,
        permissions: new Set(["report:read", "agent:access"]),
      };

      expect(() => ReportingRepository.assertCanReadReports(ctx)).toThrow(
        ForbiddenError
      );
      await expect(
        ReportingRepository.listTicketsForReport(ctx)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("RPT-012: CSV helpers", () => {
    it("escapes commas and quotes", () => {
      expect(escapeCsvCell('say "hello", world')).toBe('"say ""hello"", world"');
      const csv = rowsToCsv(["a"], [["line1\nline2"]]);
      expect(csv).toContain('"line1\nline2"');
    });
  });

  describe("RPT-013: Export HTTP authz and tenant isolation", () => {
    it("returns 401 without a session", async () => {
      const res = await callExport();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });

    it("returns 403 for requester session (no report:read)", async () => {
      const cookie = await signInCookie("requester@org-a.test");
      const res = await callExport(cookie);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(String(body.error)).toMatch(/report:read/i);
    });

    it("returns 403 when session resolves to agent without report:read", async () => {
      vi.spyOn(authContext, "buildRequestContext").mockResolvedValue(
        agentMissingReportRead()
      );
      const res = await callExport("better-auth.session_token=fake");
      expect(res.status).toBe(403);
    });

    it("returns 200 for authorized agent and scopes CSV to their org", async () => {
      const cookie = await signInCookie("agent@org-a.test");
      const res = await callExport(cookie);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/text\/csv/);
      const csv = await res.text();
      expect(csv).toContain("Cannot access email");
      expect(csv).not.toContain("Network issue");
    });

    it("org B agent export excludes org A ticket subjects", async () => {
      const cookie = await signInCookie("agent@org-b.test");
      const res = await callExport(cookie);
      expect(res.status).toBe(200);
      const csv = await res.text();
      expect(csv).toContain("Network issue");
      expect(csv).not.toContain("Cannot access email");
    });

    it("open scope export omits resolved/closed rows for authorized agent", async () => {
      const cookie = await signInCookie("agent@org-a.test");
      const res = await callExport(cookie, "open");
      expect(res.status).toBe(200);
      const csv = await res.text();
      const lines = csv.trim().split(/\r?\n/);
      expect(lines.length).toBeGreaterThan(1);
      const dataLines = lines.slice(1);
      for (const line of dataLines) {
        expect(line).not.toMatch(/,resolved,/);
        expect(line).not.toMatch(/,closed,/);
      }
    });
  });
});
