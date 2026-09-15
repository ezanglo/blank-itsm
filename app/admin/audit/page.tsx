import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { AuditRepository } from "@/lib/repositories/auditRepository";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata || Object.keys(metadata).length === 0) return "—";
  try {
    return JSON.stringify(metadata);
  } catch {
    return "—";
  }
}

export default async function AuditPage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "admin:access");
  requirePermission(ctx, "audit:read");

  const events = await AuditRepository.listRecent(ctx, 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit log</h1>
        <p className="text-muted-foreground mt-1">
          Recent security and configuration events for your organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <CardDescription>Newest first, scoped to your tenant via RLS.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {event.createdAt.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {event.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {event.actor?.email ?? "system"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {event.resourceType ?? "—"}
                    {event.resourceId ? ` · ${event.resourceId.slice(0, 8)}…` : ""}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                    {formatMetadata(event.metadata as Record<string, unknown>)}
                  </TableCell>
                </TableRow>
              ))}
              {events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No audit events yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
