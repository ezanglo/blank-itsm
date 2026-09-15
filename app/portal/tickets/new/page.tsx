import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { TicketRepository } from "@/lib/repositories/ticketRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NewTicketKbHelper } from "@/components/knowledge/new-ticket-kb-helper";
import {
  computePriority,
  DEFAULT_IMPACT,
  DEFAULT_URGENCY,
  isImpactLevel,
  isUrgencyLevel,
  PRIORITY_LABELS,
} from "@/lib/domain/ticketPriority";

async function createTicket(formData: FormData) {
  "use server";

  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:create");

  const type = formData.get("type") as "incident" | "service_request";
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
  const impactRaw = String(formData.get("impact") ?? DEFAULT_IMPACT);
  const urgencyRaw = String(formData.get("urgency") ?? DEFAULT_URGENCY);

  if (!type || !subject || !description) {
    throw new Error("Missing required fields");
  }

  const impact = isImpactLevel(impactRaw) ? impactRaw : DEFAULT_IMPACT;
  const urgency = isUrgencyLevel(urgencyRaw) ? urgencyRaw : DEFAULT_URGENCY;

  const ticket = await TicketRepository.create(ctx, {
    type,
    subject,
    description,
    impact,
    urgency,
  });

  redirect(`/portal/tickets/${ticket.id}`);
}

export default async function NewTicketPage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:create");

  const previewPriority = PRIORITY_LABELS[computePriority(DEFAULT_IMPACT, DEFAULT_URGENCY)];

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Submit a Ticket</CardTitle>
          <p className="text-sm text-muted-foreground">
            Priority is calculated from impact and urgency (default preview: {previewPriority}).
          </p>
        </CardHeader>
        <CardContent>
          <NewTicketKbHelper />
          <form action={createTicket} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                name="type"
                required
                defaultValue="incident"
                className="flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm"
              >
                <option value="incident">Incident</option>
                <option value="service_request">Service Request</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="Brief description of the issue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Provide details about your request..."
                rows={6}
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="impact">Impact</Label>
                <select
                  id="impact"
                  name="impact"
                  defaultValue={DEFAULT_IMPACT}
                  className="flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency</Label>
                <select
                  id="urgency"
                  name="urgency"
                  defaultValue={DEFAULT_URGENCY}
                  className="flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                Submit Ticket
              </Button>
              <Link
                href="/portal/tickets"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
