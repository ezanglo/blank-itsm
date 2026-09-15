import { Badge } from "@/components/ui/badge";
import type { ticketEvent } from "@/db/schema";
import type { user } from "@/db/schema";

type EventRow = typeof ticketEvent.$inferSelect & {
  actor: typeof user.$inferSelect | null;
};

const KIND_LABELS: Record<string, string> = {
  comment_public: "Public reply",
  comment_internal: "Internal note",
  status_change: "Status",
  assignment: "Assignment",
  system: "System",
};

export function TicketTimeline({ events }: { events: EventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity yet.</p>
    );
  }

  return (
    <ul className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="border rounded-xl p-4 bg-card">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline">{KIND_LABELS[event.kind] ?? event.kind}</Badge>
            {event.kind === "comment_internal" && (
              <Badge className="bg-amber-100 text-amber-900">Agents only</Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(event.createdAt).toLocaleString()}
            </span>
          </div>
          {event.actor && (
            <p className="text-sm font-medium mb-1">
              {event.actor.name || event.actor.email}
            </p>
          )}
          {event.body && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.body}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
