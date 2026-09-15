import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { TicketRepository } from "@/lib/repositories/ticketRepository";
import { AttachmentRepository } from "@/lib/repositories/attachmentRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  getAllowedRequesterNextStatuses,
  type TicketStatus,
} from "@/lib/domain/ticketStatus";
import { PRIORITY_COLORS, PRIORITY_LABELS, type PriorityLevel } from "@/lib/domain/ticketPriority";
import { TicketTimeline } from "@/components/tickets/ticket-timeline";
import { TicketAttachmentsList } from "@/components/tickets/ticket-attachments";
import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function addReply(ticketId: string, formData: FormData) {
  "use server";

  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:comment_public");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await TicketRepository.addComment(ctx, ticketId, body, "public");
  revalidatePath(`/portal/tickets/${ticketId}`);
}

async function reopenTicket(ticketId: string) {
  "use server";

  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:read_own");

  await TicketRepository.updateStatus(ctx, ticketId, "open", {
    requesterInitiated: true,
  });
  revalidatePath(`/portal/tickets/${ticketId}`);
}

async function uploadAttachment(ticketId: string, formData: FormData) {
  "use server";

  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:read_own");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const bytes = Buffer.from(await file.arrayBuffer());
  await AttachmentRepository.addToTicket(ctx, ticketId, {
    name: file.name,
    mimeType: file.type,
    bytes,
  });
  revalidatePath(`/portal/tickets/${ticketId}`);
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await buildRequestContext();
  requirePermission(ctx, "portal:access");

  const ticket = await TicketRepository.getById(ctx, id);

  if (!ticket) {
    notFound();
  }

  const events = await TicketRepository.listEvents(ctx, id, false);
  const attachments = await AttachmentRepository.listForTicket(ctx, id);
  const priority = (ticket.priority ?? "medium") as PriorityLevel;
  const canReopen = getAllowedRequesterNextStatuses(ticket.status as TicketStatus).includes("open");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/portal/tickets">
          <Button variant="outline">← Back to My Tickets</Button>
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {ticket.type.replace("_", " ")}
                </Badge>
                <Badge className={STATUS_COLORS[ticket.status as TicketStatus]}>
                  {STATUS_LABELS[ticket.status as TicketStatus]}
                </Badge>
                <Badge className={PRIORITY_COLORS[priority]}>
                  {PRIORITY_LABELS[priority]}
                </Badge>
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
          </div>

          {canReopen && (
            <form action={reopenTicket.bind(null, id)}>
              <Button type="submit" variant="outline">Reopen ticket</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TicketTimeline events={events} />
          <form action={addReply.bind(null, id)} className="space-y-2 pt-4 border-t">
            <Label htmlFor="body">Your reply</Label>
            <Textarea id="body" name="body" rows={4} required placeholder="Add a message…" />
            <Button type="submit">Send reply</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TicketAttachmentsList items={attachments} />
          <form action={uploadAttachment.bind(null, id)} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="file">Upload file (max 5MB)</Label>
              <input id="file" name="file" type="file" required className="text-sm" />
            </div>
            <Button type="submit">Attach</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
