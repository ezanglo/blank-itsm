import type { automationRule, user } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { TICKET_STATUSES } from "@/lib/domain/ticketStatus";

type RuleRow = typeof automationRule.$inferSelect;
type AgentRow = typeof user.$inferSelect;

const TRIGGERS = [
  "ticket_created",
  "status_changed",
  "public_reply_added",
  "sla_at_risk",
  "sla_breached",
] as const;

export function AutomationRuleForm({
  action,
  agents,
  initial,
}: {
  action: (formData: FormData) => Promise<void>;
  agents: AgentRow[];
  initial?: RuleRow;
}) {
  const firstCond = initial?.conditions.all[0];
  const firstAction = initial?.actions[0];

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={action} className="space-y-6">
          {initial && <input type="hidden" name="id" value={initial.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={initial?.name ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={initial?.description ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kind">Kind</Label>
              <select
                id="kind"
                name="kind"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                defaultValue={initial?.kind ?? "assignment"}
              >
                <option value="assignment">Assignment (create only)</option>
                <option value="trigger">Trigger</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort order</Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                defaultValue={initial?.sortOrder ?? 0}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={initial?.enabled ?? true} />
            Enabled
          </label>

          <div className="space-y-2 border rounded-md p-4">
            <p className="text-sm font-medium">Trigger (trigger rules only)</p>
            <select
              name="trigger"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={initial?.trigger ?? "ticket_created"}
            >
              {TRIGGERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input
                name="trigger_from_status"
                placeholder="From status (optional)"
                defaultValue={initial?.triggerConfig?.fromStatus ?? ""}
              />
              <Input
                name="trigger_to_status"
                placeholder="To status (optional)"
                defaultValue={initial?.triggerConfig?.toStatus ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2 border rounded-md p-4">
            <p className="text-sm font-medium">Condition (AND)</p>
            <div className="grid grid-cols-3 gap-2">
              <select
                name="cond_field"
                className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                defaultValue={firstCond?.field ?? "type"}
              >
                <option value="">Any (no filter)</option>
                <option value="type">type</option>
                <option value="priority">priority</option>
                <option value="status">status</option>
              </select>
              <select
                name="cond_op"
                className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                defaultValue={firstCond?.op ?? "eq"}
              >
                <option value="eq">eq</option>
                <option value="neq">neq</option>
                <option value="in">in</option>
              </select>
              <Input
                name="cond_value"
                placeholder="value"
                defaultValue={
                  firstCond
                    ? Array.isArray(firstCond.value)
                      ? firstCond.value.join(",")
                      : String(firstCond.value)
                    : ""
                }
              />
            </div>
          </div>

          <div className="space-y-2 border rounded-md p-4">
            <p className="text-sm font-medium">Action</p>
            <select
              name="action_type"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={firstAction?.type ?? "assign"}
            >
              <option value="assign">assign</option>
              <option value="add_internal_note">add_internal_note</option>
              <option value="enqueue_email">enqueue_email</option>
              <option value="set_status">set_status</option>
            </select>

            <div className="space-y-2 mt-2">
              <Label htmlFor="assignee_user_id">Assignee (assign action)</Label>
              <select
                id="assignee_user_id"
                name="assignee_user_id"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                defaultValue={
                  firstAction?.type === "assign" ? firstAction.assigneeUserId ?? "" : ""
                }
              >
                <option value="">Select agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note_body">Internal note body</Label>
              <Input
                id="note_body"
                name="note_body"
                defaultValue={
                  firstAction?.type === "add_internal_note" ? firstAction.body : ""
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                name="email_recipient"
                className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                defaultValue={
                  firstAction?.type === "enqueue_email" ? firstAction.recipient : "requester"
                }
              >
                <option value="requester">requester</option>
                <option value="assignee">assignee</option>
                <option value="user_ids">user_ids</option>
              </select>
              <Input
                name="email_template"
                defaultValue={
                  firstAction?.type === "enqueue_email"
                    ? firstAction.templateKey
                    : "automation_notify"
                }
              />
            </div>
            <Input
              name="email_user_ids"
              placeholder="Comma-separated user IDs (user_ids recipient)"
              defaultValue={
                firstAction?.type === "enqueue_email" && firstAction.userIds
                  ? firstAction.userIds.join(",")
                  : ""
              }
            />

            <div className="space-y-2">
              <Label htmlFor="to_status">Set status to</Label>
              <select
                id="to_status"
                name="to_status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                defaultValue={
                  firstAction?.type === "set_status" ? firstAction.toStatus : "resolved"
                }
              >
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit">{initial ? "Save changes" : "Create rule"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
