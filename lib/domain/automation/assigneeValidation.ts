import { db } from "@/db";
import { organizationMembership } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { AutomationAction } from "./types";
import { AutomationValidationError } from "./validators";

export async function assertActiveAgentOrAdminInOrg(orgId: string, userId: string) {
  const membership = await db.query.organizationMembership.findFirst({
    where: and(
      eq(organizationMembership.organizationId, orgId),
      eq(organizationMembership.userId, userId),
      eq(organizationMembership.status, "active")
    ),
    with: { role: true },
  });
  if (!membership?.role || (membership.role.key !== "agent" && membership.role.key !== "admin")) {
    throw new AutomationValidationError("assigneeUserId must be an active agent or admin in this organization");
  }
}

export async function validateAssigneeTargets(orgId: string, actions: AutomationAction[]) {
  for (const action of actions) {
    if (action.type === "assign" && action.assigneeUserId) {
      await assertActiveAgentOrAdminInOrg(orgId, action.assigneeUserId);
    }
  }
}
