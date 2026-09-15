import { buildRequestContext } from "@/lib/auth/context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TicketRepository } from "@/lib/repositories/ticketRepository";

export default async function PortalHomePage() {
  const ctx = await buildRequestContext();
  
  // Get recent tickets for this user
  const myTickets = await TicketRepository.listForRequester(ctx, ctx.userId);
  const recentTickets = myTickets.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome to the Service Portal</h1>
        <p className="text-muted-foreground mt-2">
          Submit requests and track your tickets
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Submit a Ticket</CardTitle>
            <CardDescription>
              Report an issue or request service
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/portal/tickets/new">
              <Button className="w-full">Submit New Ticket</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Tickets</CardTitle>
            <CardDescription>
              View and manage your tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/portal/tickets">
              <Button variant="outline" className="w-full">
                View All Tickets ({myTickets.length})
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {recentTickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/portal/tickets/${ticket.id}`}
                  className="block p-3 border rounded hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.type} • {ticket.status}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      #{ticket.number}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
