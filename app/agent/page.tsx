import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { TicketRepository } from "@/lib/repositories/ticketRepository";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/domain/ticketStatus";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function claimTicket(ticketId: string) {
  "use server";
  
  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:claim");
  
  await TicketRepository.claim(ctx, ticketId, ctx.userId);
  
  revalidatePath("/agent");
}

async function viewTicket(ticketId: string) {
  "use server";
  redirect(`/agent/tickets/${ticketId}`);
}

export default async function AgentQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "unassigned" } = await searchParams;
  const ctx = await buildRequestContext();
  requirePermission(ctx, "agent:access");
  
  // Get tickets based on view
  const tickets =
    view === "mine"
      ? await TicketRepository.listForAssignee(ctx, ctx.userId)
      : await TicketRepository.listUnassigned(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ticket Queue</h1>
      </div>

      <div className="flex gap-2">
        <Link href="/agent?view=unassigned">
          <Button variant={view === "unassigned" ? "default" : "outline"}>
            Unassigned ({view === "unassigned" && tickets.length})
          </Button>
        </Link>
        <Link href="/agent?view=mine">
          <Button variant={view === "mine" ? "default" : "outline"}>
            My Tickets ({view === "mine" && tickets.length})
          </Button>
        </Link>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {view === "mine"
                ? "You don't have any assigned tickets."
                : "No unassigned tickets in the queue."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="p-6">
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
                    <p className="text-sm text-muted-foreground">
                      Requested by {ticket.requester.name || ticket.requester.email}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <form action={viewTicket.bind(null, ticket.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        View
                      </Button>
                    </form>
                    {view === "unassigned" && (
                      <form action={claimTicket.bind(null, ticket.id)}>
                        <Button type="submit" size="sm">
                          Claim
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
