import { buildRequestContext } from "@/lib/auth/context";
import { TicketRepository } from "@/lib/repositories/ticketRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/domain/ticketStatus";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function MyTicketsPage() {
  const ctx = await buildRequestContext();
  const tickets = await TicketRepository.listForRequester(ctx, ctx.userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <Link href="/portal/tickets/new">
          <Button>Submit New Ticket</Button>
        </Link>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You don&apos;t have any tickets yet.
            </p>
            <Link href="/portal/tickets/new" className="mt-4 inline-block">
              <Button>Submit Your First Ticket</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <Link href={`/portal/tickets/${ticket.id}`}>
                <CardContent className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground">
                          #{ticket.number}
                        </span>
                        <h3 className="font-semibold">{ticket.subject}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="capitalize">
                          {ticket.type.replace("_", " ")}
                        </Badge>
                        <Badge className={STATUS_COLORS[ticket.status]}>
                          {STATUS_LABELS[ticket.status]}
                        </Badge>
                        {ticket.priority && (
                          <Badge variant="secondary" className="capitalize">
                            {ticket.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      <p>{new Date(ticket.createdAt).toLocaleDateString()}</p>
                      {ticket.assignee && (
                        <p className="text-xs mt-1">
                          Assigned to {ticket.assignee.name}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
