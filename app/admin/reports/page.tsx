import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { ReportingRepository } from "@/lib/repositories/reportingRepository";
import { OpsDashboard } from "@/components/reports/ops-dashboard";

export default async function AdminReportsPage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "admin:access");
  requirePermission(ctx, "report:read");

  const [metrics, tickets] = await Promise.all([
    ReportingRepository.getOpsDashboard(ctx),
    ReportingRepository.listTicketsForReport(ctx),
  ]);

  return (
    <OpsDashboard
      metrics={metrics}
      tickets={tickets}
      exportBasePath="/api/reports/tickets/export"
    />
  );
}
