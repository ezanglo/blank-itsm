import { db } from "@/db";
import { organization, organizationMembership, role } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { lookupSeedRoster } from "./seed-roster";

/**
 * Ensure demo roster emails get an active org membership (portal/admin/agent gates).
 * Safe to call on every session creation; no-ops when membership already exists.
 */
export async function provisionMembershipForSeededEmail(
  userId: string,
  email: string
): Promise<boolean> {
  const roster = lookupSeedRoster(email);
  if (!roster) return false;

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, roster.orgSlug),
  });
  const roleRecord = await db.query.role.findFirst({
    where: eq(role.key, roster.roleKey),
  });
  if (!org || !roleRecord) return false;

  const existing = await db.query.organizationMembership.findFirst({
    where: and(
      eq(organizationMembership.userId, userId),
      eq(organizationMembership.organizationId, org.id),
      eq(organizationMembership.status, "active")
    ),
  });
  if (existing) return true;

  await db
    .insert(organizationMembership)
    .values({
      organizationId: org.id,
      userId,
      roleId: roleRecord.id,
      status: "active",
    })
    .onConflictDoNothing();

  return true;
}
