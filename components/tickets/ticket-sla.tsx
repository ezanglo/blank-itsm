import { Badge } from "@/components/ui/badge";
import { getSlaStatus } from "@/lib/domain/sla";
import type { ticket } from "@/db/schema";

type TicketRow = typeof ticket.$inferSelect;

const SLA_BADGE: Record<string, string> = {
  on_track: "bg-green-100 text-green-800",
  response_due: "bg-amber-100 text-amber-900",
  resolution_due: "bg-orange-100 text-orange-900",
  breached: "bg-red-100 text-red-900",
};

const SLA_LABEL: Record<string, string> = {
  on_track: "On track",
  response_due: "Response overdue",
  resolution_due: "Resolution overdue",
  breached: "SLA breached",
};

export function TicketSlaPanel({ ticket }: { ticket: TicketRow }) {
  const status = getSlaStatus(ticket);

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">SLA</h3>
        <Badge className={SLA_BADGE[status]}>{SLA_LABEL[status]}</Badge>
      </div>
      <dl className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">First response due</dt>
          <dd className="font-medium">
            {ticket.responseDueAt
              ? new Date(ticket.responseDueAt).toLocaleString()
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Resolution due</dt>
          <dd className="font-medium">
            {ticket.resolutionDueAt
              ? new Date(ticket.resolutionDueAt).toLocaleString()
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">First response</dt>
          <dd className="font-medium">
            {ticket.firstResponseAt
              ? new Date(ticket.firstResponseAt).toLocaleString()
              : "Pending"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
