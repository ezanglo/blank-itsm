import { redirect } from "next/navigation";
import { buildRequestContext, hasPermission, requirePermission } from "@/lib/auth/context";
import { AutomationRepository } from "@/lib/repositories/automationRepository";
import { ruleInputFromForm } from "@/lib/admin/automationForm";
import { AutomationRuleForm } from "@/components/admin/automation-rule-form";
import { db } from "@/db";
import { organizationMembership, role, user } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

async function createRule(formData: FormData) {
  "use server";
  const ctx = await buildRequestContext();
  requirePermission(ctx, "automation:manage");
  const input = ruleInputFromForm(formData);
  await AutomationRepository.create(ctx, input);
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

export default async function NewAutomationRulePage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "admin:access");
  if (!hasPermission(ctx, "automation:manage")) {
    return <p className="text-muted-foreground">Access denied.</p>;
  }

  const agents = await loadAgents(ctx.orgId);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Create automation rule</h1>
      <AutomationRuleForm action={createRule} agents={agents} />
    </div>
  );
}
