import { redirect, notFound } from "next/navigation";
import { buildRequestContext, hasPermission, requirePermission } from "@/lib/auth/context";
import { AutomationRepository } from "@/lib/repositories/automationRepository";
import { ruleInputFromForm } from "@/lib/admin/automationForm";
import { AutomationRuleForm } from "@/components/admin/automation-rule-form";
import { db } from "@/db";
import { automationRule, organizationMembership, role, user } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

async function updateRule(formData: FormData) {
  "use server";
  const ctx = await buildRequestContext();
  requirePermission(ctx, "automation:manage");
  const id = String(formData.get("id"));
  const input = ruleInputFromForm(formData);
  await AutomationRepository.update(ctx, id, input);
  redirect("/admin/automation");
}

async function loadAgents(orgId: string) {
  const agentRoles = await db.query.role.findMany({
    where: inArray(role.key, ["agent", "admin"]),
  });
  const roleIds = agentRoles.map((r) => r.id);
  const memberships = await db.query.organizationMembership.findMany({
    where: and(
      eq(organizationMembership.organizationId, orgId),
      eq(organizationMembership.status, "active")
    ),
    with: { user: true, role: true },
  });
  return memberships
    .filter((m) => roleIds.includes(m.roleId))
    .map((m) => m.user)
    .filter(Boolean) as (typeof user.$inferSelect)[];
}

export default async function EditAutomationRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await buildRequestContext();
  requirePermission(ctx, "admin:access");
  if (!hasPermission(ctx, "automation:manage")) {
    return <p className="text-muted-foreground">Access denied.</p>;
  }

  const row = await db.query.automationRule.findFirst({
    where: and(eq(automationRule.id, id), eq(automationRule.organizationId, ctx.orgId)),
  });
  if (!row) notFound();

  const agents = await loadAgents(ctx.orgId);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Edit automation rule</h1>
      <AutomationRuleForm action={updateRule} agents={agents} initial={row} />
    </div>
  );
}
