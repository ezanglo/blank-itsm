import Link from "next/link";
import { buildRequestContext, hasPermission, requirePermission } from "@/lib/auth/context";
import { AutomationRepository } from "@/lib/repositories/automationRepository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { revalidatePath } from "next/cache";

async function toggleRule(formData: FormData) {
  "use server";
  const ctx = await buildRequestContext();
  requirePermission(ctx, "automation:manage");
  const id = String(formData.get("id"));
  const enabled = formData.get("enabled") === "true";
  await AutomationRepository.setEnabled(ctx, id, enabled);
  revalidatePath("/admin/automation");
}

async function deleteRule(formData: FormData) {
  "use server";
  const ctx = await buildRequestContext();
  requirePermission(ctx, "automation:manage");
  const id = String(formData.get("id"));
  await AutomationRepository.delete(ctx, id);
  revalidatePath("/admin/automation");
}

function summarizeConditions(conditions: { all: { field: string; op: string; value: unknown }[] }) {
  if (!conditions.all.length) return "Always match";
  return conditions.all
    .map((c) => `${c.field} ${c.op} ${Array.isArray(c.value) ? c.value.join(",") : c.value}`)
    .join(" AND ");
}

function summarizeActions(actions: { type: string }[]) {
  return actions.map((a) => a.type).join(", ");
}

export default async function AutomationAdminPage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "admin:access");
  if (!hasPermission(ctx, "automation:manage")) {
    return (
      <p className="text-muted-foreground">You do not have permission to manage automation rules.</p>
    );
  }

  const rules = await AutomationRepository.list(ctx);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Automation rules</h1>
          <p className="text-muted-foreground mt-1">
            Ordered assignment rules (first match on create) and trigger rules for ticket events.
          </p>
        </div>
        <Link href="/admin/automation/new">
          <Button>Create rule</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
          <CardDescription>Lower sort order runs first. Disabled rules are skipped.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No automation rules yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {rules.map((rule) => (
                <li key={rule.id} className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {rule.kind}
                      {rule.kind === "trigger" && rule.trigger ? ` · ${rule.trigger}` : ""}
                      {" · "}
                      order {rule.sortOrder}
                      {" · "}
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      If {summarizeConditions(rule.conditions)} → {summarizeActions(rule.actions)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/automation/${rule.id}`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <form action={toggleRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <input type="hidden" name="enabled" value={rule.enabled ? "false" : "true"} />
                      <Button type="submit" variant="secondary" size="sm">
                        {rule.enabled ? "Disable" : "Enable"}
                      </Button>
                    </form>
                    <form action={deleteRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <Button type="submit" variant="destructive" size="sm">Delete</Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
