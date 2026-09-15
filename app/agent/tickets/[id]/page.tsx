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
  getAllowedNextStatuses,
  type TicketStatus,
} from "@/lib/domain/ticketStatus";
import { PRIORITY_COLORS, PRIORITY_LABELS, type PriorityLevel } from "@/lib/domain/ticketPriority";
import { TicketTimeline } from "@/components/tickets/ticket-timeline";
import { TicketSlaPanel } from "@/components/tickets/ticket-sla";
import { TicketAttachmentsList } from "@/components/tickets/ticket-attachments";
import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { KnowledgeRepository } from "@/lib/repositories/knowledgeRepository";
import { SlaRepository } from "@/lib/repositories/slaRepository";

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

  const articleId = String(formData.get("knowledgeArticleId") ?? "").trim() || undefined;
  await TicketRepository.updateStatus(ctx, ticketId, newStatus, { knowledgeArticleId: articleId });
  revalidatePath(`/agent/tickets/${ticketId}`);
}

async function addPublicReply(ticketId: string, formData: FormData) {
  "use server";

  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:comment_public");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const articleId = String(formData.get("knowledgeArticleId") ?? "").trim() || undefined;
  await TicketRepository.addComment(ctx, ticketId, body, "public", {
    knowledgeArticleId: articleId,
  });
  revalidatePath(`/agent/tickets/${ticketId}`);
}

async function addInternalNote(ticketId: string, formData: FormData) {
  "use server";

  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:comment_internal");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await TicketRepository.addComment(ctx, ticketId, body, "internal");
  revalidatePath(`/agent/tickets/${ticketId}`);
}

async function uploadAttachment(ticketId: string, formData: FormData) {
  "use server";

  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:read_org");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const bytes = Buffer.from(await file.arrayBuffer());
  await AttachmentRepository.addToTicket(ctx, ticketId, {
    name: file.name,
    mimeType: file.type,
    bytes,
  });
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

  await SlaRepository.maybeEscalateTicket(ctx, ticket);

  const events = await TicketRepository.listEvents(ctx, id, true);
  const attachments = await AttachmentRepository.listForTicket(ctx, id);

  const allowedStatuses = getAllowedNextStatuses(ticket.status as TicketStatus);
  const canClaim = !ticket.assigneeId && ticket.status !== "pending_approval";
  const kbArticles = await KnowledgeRepository.listPublished(ctx, 50);
  const kbLinks = await KnowledgeRepository.listLinksForTicket(ctx, id);
  const priority = (ticket.priority ?? "medium") as PriorityLevel;

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
                {ticket.fulfillmentQueue && (
                  <Badge variant="outline">Queue: {ticket.fulfillmentQueue}</Badge>
                )}
                {ticket.impact && ticket.urgency && (
                  <span className="text-xs text-muted-foreground">
                    Impact {ticket.impact} · Urgency {ticket.urgency}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <TicketSlaPanel ticket={ticket} />

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
          </div>

          <div className="pt-4 border-t space-y-4">
            {canClaim && (
              <form action={claimTicket.bind(null, id)}>
                <Button type="submit">Claim Ticket</Button>
              </form>
            )}

            {allowedStatuses.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Update Status</h3>
                <form action={updateStatus.bind(null, id)} className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
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
                    <select
                      name="knowledgeArticleId"
                      className="flex h-8 min-w-[200px] flex-1 rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm"
                      defaultValue=""
                    >
                      <option value="">Link KB article on resolve (optional)</option>
                      {kbArticles.map((a) => (
                        <option key={a.id} value={a.id}>{a.title}</option>
                      ))}
                    </select>
                    <Button type="submit">Update</Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TicketTimeline events={events} />

          <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
            <form action={addPublicReply.bind(null, id)} className="space-y-2">
              <Label htmlFor="public-body">Public reply</Label>
              <Textarea id="public-body" name="body" rows={4} required placeholder="Visible to requester…" />
              <select
                name="knowledgeArticleId"
                className="flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm"
                defaultValue=""
              >
                <option value="">Link KB article (optional)</option>
                {kbArticles.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
              <Button type="submit">Send public reply</Button>
            </form>
            <form action={addInternalNote.bind(null, id)} className="space-y-2">
              <Label htmlFor="internal-body">Internal note</Label>
              <Textarea id="internal-body" name="body" rows={4} required placeholder="Agents only…" />
              <Button type="submit" variant="secondary">Add internal note</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {kbLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked knowledge articles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {kbLinks.map((link) => (
              <div key={link.id} className="flex justify-between gap-2 border-b pb-2">
                <span>{link.article.title}</span>
                <span className="text-muted-foreground capitalize">{link.linkType}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
