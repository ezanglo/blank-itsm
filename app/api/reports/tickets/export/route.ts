import { buildRequestContext } from "@/lib/auth/context";
import { ReportingRepository } from "@/lib/repositories/reportingRepository";
import { rowsToCsv } from "@/lib/export/csv";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const ctx = await buildRequestContext();
    ReportingRepository.assertCanReadReports(ctx);

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") === "open" ? "open" : "all";

    const rows = await ReportingRepository.listTicketsForReport(ctx, {
      status: scope === "open" ? "open" : undefined,
    });

    const csv = rowsToCsv(
      [
        "number",
        "subject",
        "status",
        "priority",
        "type",
        "requester_email",
        "assignee_email",
        "created_at",
        "sla_status",
      ],
      rows.map((t) => [
        t.number,
        t.subject,
        t.status,
        t.priority,
        t.type,
        t.requesterEmail,
        t.assigneeEmail,
        t.createdAt.toISOString(),
        t.slaStatus,
      ])
    );

    const filename =
      scope === "open" ? "tickets-open-backlog.csv" : "tickets-all.csv";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    const status =
      error instanceof Error && error.name === "ForbiddenError" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
