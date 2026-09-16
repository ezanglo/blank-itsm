import { ticket } from "@/db/schema";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/context";
import { withTenantContext } from "@/lib/db/transaction";
import { getSlaStatus } from "@/lib/domain/sla";

const OPEN_STATUSES = ["open", "in_progress"] as const;

export type OpsDashboardMetrics = {
  openBacklog: number;
  unassignedOpen: number;
  createdLast7Days: number;
  createdLast30Days: number;
  volumeByDay: { date: string; count: number }[];
  slaResponseOverdue: number;
  slaResolutionOverdue: number;
  slaBreached: number;
  workloadByAssignee: {
    assigneeId: string | null;
    assigneeName: string;
    openCount: number;
  }[];
};

export type ReportTicketRow = {
  number: number;
  subject: string;
  status: string;
  priority: string | null;
  type: string;
  requesterEmail: string;
  assigneeEmail: string | null;
  createdAt: Date;
  slaStatus: string;
};

export class ReportingRepository {
  static assertCanReadReports(ctx: RequestContext) {
    requirePermission(ctx, "report:read");
    requirePermission(ctx, "ticket:read_org");
  }

  static async getOpsDashboard(ctx: RequestContext): Promise<OpsDashboardMetrics> {
    this.assertCanReadReports(ctx);

    return withTenantContext(ctx, async (tx) => {
      const orgTickets = await tx.query.ticket.findMany({
        where: eq(ticket.organizationId, ctx.orgId),
        with: {
          requester: true,
          assignee: true,
        },
      });

      const openTickets = orgTickets.filter((t) =>
        OPEN_STATUSES.includes(t.status as (typeof OPEN_STATUSES)[number])
      );

      const now = Date.now();
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

      const createdLast7 = orgTickets.filter((t) => t.createdAt >= sevenDaysAgo);
      const createdLast30 = orgTickets.filter((t) => t.createdAt >= thirtyDaysAgo);

      const dayCounts = new Map<string, number>();
      for (const t of createdLast7) {
        const key = t.createdAt.toISOString().slice(0, 10);
        dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
      }
      const volumeByDay = [...dayCounts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      let slaResponseOverdue = 0;
      let slaResolutionOverdue = 0;
      let slaBreached = 0;

      for (const t of orgTickets) {
        const sla = getSlaStatus(t);
        if (sla === "response_due") slaResponseOverdue += 1;
        else if (sla === "resolution_due") slaResolutionOverdue += 1;
        else if (sla === "breached") slaBreached += 1;
      }

      const workloadMap = new Map<
        string,
        { assigneeId: string | null; assigneeName: string; openCount: number }
      >();

      const unassignedKey = "__unassigned__";
      workloadMap.set(unassignedKey, {
        assigneeId: null,
        assigneeName: "Unassigned",
        openCount: 0,
      });

      for (const t of openTickets) {
        const key = t.assigneeId ?? unassignedKey;
        if (!workloadMap.has(key)) {
          workloadMap.set(key, {
            assigneeId: t.assigneeId,
            assigneeName: t.assignee?.name || t.assignee?.email || "Unknown",
            openCount: 0,
          });
        }
        workloadMap.get(key)!.openCount += 1;
      }

      const workloadByAssignee = [...workloadMap.values()].sort(
        (a, b) => b.openCount - a.openCount
      );

      return {
        openBacklog: openTickets.length,
        unassignedOpen: openTickets.filter((t) => !t.assigneeId).length,
        createdLast7Days: createdLast7.length,
        createdLast30Days: createdLast30.length,
        volumeByDay,
        slaResponseOverdue,
        slaResolutionOverdue,
        slaBreached,
        workloadByAssignee,
      };
    });
  }

  static async listTicketsForReport(
    ctx: RequestContext,
    options?: { status?: "open" | "all" }
  ): Promise<ReportTicketRow[]> {
    this.assertCanReadReports(ctx);

    return withTenantContext(ctx, async (tx) => {
      const where =
        options?.status === "open"
          ? and(
              eq(ticket.organizationId, ctx.orgId),
              inArray(ticket.status, [...OPEN_STATUSES])
            )
          : eq(ticket.organizationId, ctx.orgId);

      const rows = await tx.query.ticket.findMany({
        where,
        orderBy: [desc(ticket.createdAt)],
        with: {
          requester: true,
          assignee: true,
        },
      });

      return rows.map((t) => ({
        number: t.number,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        type: t.type,
        requesterEmail: t.requester?.email ?? "",
        assigneeEmail: t.assignee?.email ?? null,
        createdAt: t.createdAt,
        slaStatus: getSlaStatus(t),
      }));
    });
  }

  /** Count tickets for another org — used only in tests to prove isolation. */
  static async countTicketsInOrg(ctx: RequestContext): Promise<number> {
    this.assertCanReadReports(ctx);
    return withTenantContext(ctx, async (tx) => {
      const [row] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(ticket)
        .where(eq(ticket.organizationId, ctx.orgId));
      return row?.count ?? 0;
    });
  }
}
