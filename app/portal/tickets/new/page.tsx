import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { TicketRepository } from "@/lib/repositories/ticketRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { redirect } from "next/navigation";
import Link from "next/link";

async function createTicket(formData: FormData) {
  "use server";

  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:create");

  const type = formData.get("type") as "incident" | "service_request";
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as string;

  if (!type || !subject || !description) {
    throw new Error("Missing required fields");
  }

  const ticket = await TicketRepository.create(ctx, {
    type,
    subject,
    description,
    priority,
  });

  redirect(`/portal/tickets/${ticket.id}`);
}

export default async function NewTicketPage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "ticket:create");

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Submit a Ticket</CardTitle>
        </CardHeader>
        <CardContent>
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

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                name="priority"
                defaultValue="medium"
                className="flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                Submit Ticket
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/portal/tickets">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
