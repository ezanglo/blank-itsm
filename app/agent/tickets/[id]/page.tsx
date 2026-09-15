import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { TicketRepository } from "@/lib/repositories/ticketRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, STATUS_COLORS, getAllowedNextStatuses, type TicketStatus } from "@/lib/domain/ticketStatus";
import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function claimTicket(ticketId: string) {
  "use server";
  
  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:claim");
  
  await TicketRepository.claim(ctx, ticketId, ctx.userId);
  revalidatePath(`/agent/tickets/${ticketId}`);
}

async function updateStatus(ticketId: string, formData: FormData) {
  "use server";
  
  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:update_status");
  
  const newStatus = formData.get("status") as TicketStatus;
  if (!newStatus) return;
  
  await TicketRepository.updateStatus(ctx, ticketId, newStatus);
  revalidatePath(`/agent/tickets/${ticketId}`);
}

export default async function AgentTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await buildRequestContext();
  requirePermission(ctx, "agent:access");
  requirePermission(ctx, "ticket:read_org");
  
  const ticket = await TicketRepository.getById(ctx, id);
  
  if (!ticket) {
    notFound();
  }

  const allowedStatuses = getAllowedNextStatuses(ticket.status as TicketStatus);
  const canClaim = !ticket.assigneeId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/agent">
          <Button variant="outline">← Back to Queue</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  #{ticket.number}
                </span>
                <CardTitle>{ticket.subject}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {ticket.type.replace("_", " ")}
                </Badge>
                <Badge className={STATUS_COLORS[ticket.status as TicketStatus]}>
                  {STATUS_LABELS[ticket.status as TicketStatus]}
                </Badge>
                {ticket.priority && (
                  <Badge variant="secondary" className="capitalize">
                    {ticket.priority}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Requester</p>
              <p className="font-medium">{ticket.requester.name || ticket.requester.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assigned To</p>
              <p className="font-medium">
                {ticket.assignee ? (ticket.assignee.name || ticket.assignee.email) : "Unassigned"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </div>
            {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t space-y-4">
            {canClaim && (
              <div>
                <form action={claimTicket.bind(null, id)}>
                  <Button type="submit">Claim Ticket</Button>
                </form>
              </div>
            )}

            {allowedStatuses.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Update Status</h3>
                <form action={updateStatus.bind(null, id)} className="flex gap-2">
                  <select
                    name="status"
                    required
                    className="flex h-8 w-[200px] rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm"
                    defaultValue={allowedStatuses[0]}
                  >
                    {allowedStatuses.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <Button type="submit">Update</Button>
                </form>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
