import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OpsDashboardMetrics, ReportTicketRow } from "@/lib/repositories/reportingRepository";
import { STATUS_LABELS, type TicketStatus } from "@/lib/domain/ticketStatus";
import Link from "next/link";

const SLA_LABEL: Record<string, string> = {
  on_track: "On track",
  response_due: "Response overdue",
  resolution_due: "Resolution overdue",
  breached: "Breached",
};

type Props = {
  metrics: OpsDashboardMetrics;
  tickets: ReportTicketRow[];
  exportBasePath: string;
};

export function OpsDashboard({ metrics, tickets, exportBasePath }: Props) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Organization-scoped backlog, volume, SLA health, and agent workload.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${exportBasePath}?scope=all`}>
            <Button variant="outline" type="button">Export all tickets (CSV)</Button>
          </a>
          <a href={`${exportBasePath}?scope=open`}>
            <Button variant="secondary" type="button">Export open backlog (CSV)</Button>
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open backlog</CardDescription>
            <CardTitle className="text-3xl">{metrics.openBacklog}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {metrics.unassignedOpen} unassigned
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Volume (7 days)</CardDescription>
            <CardTitle className="text-3xl">{metrics.createdLast7Days}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {metrics.createdLast30Days} in the last 30 days
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SLA attention</CardDescription>
            <CardTitle className="text-3xl">
              {metrics.slaResponseOverdue + metrics.slaResolutionOverdue}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {metrics.slaResponseOverdue} response · {metrics.slaResolutionOverdue} resolution
            overdue
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SLA breached</CardDescription>
            <CardTitle className="text-3xl">{metrics.slaBreached}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Resolved after deadline or closed in breach
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ticket volume (7 days)</CardTitle>
            <CardDescription>New tickets per day in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.volumeByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets created in the last 7 days.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Tickets</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.volumeByDay.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell className="text-right font-medium">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workload by assignee</CardTitle>
            <CardDescription>Open and in-progress tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignee</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.workloadByAssignee.map((row) => (
                  <TableRow key={row.assigneeId ?? "unassigned"}>
                    <TableCell>{row.assigneeName}</TableCell>
                    <TableCell className="text-right font-medium">{row.openCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket list</CardTitle>
          <CardDescription>All organization tickets (newest first)</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t) => (
                <TableRow key={t.number}>
                  <TableCell className="font-mono text-sm">#{t.number}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{t.subject}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {STATUS_LABELS[t.status as TicketStatus] ?? t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{t.priority ?? "—"}</TableCell>
                  <TableCell className="text-sm">{SLA_LABEL[t.slaStatus] ?? t.slaStatus}</TableCell>
                  <TableCell className="text-sm">{t.assigneeEmail ?? "Unassigned"}</TableCell>
                </TableRow>
              ))}
              {tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No tickets in this organization.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        <Link href="/agent" className="underline underline-offset-4">
          Back to queue
        </Link>
      </p>
    </div>
  );
}
