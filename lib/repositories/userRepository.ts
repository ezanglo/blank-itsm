import { db } from "@/db";
import { user, organizationMembership, invitation, auditEvent, role } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { nanoid } from "nanoid";

export type InviteUserInput = {
  email: string;
  roleKey: "requester" | "agent" | "admin";
};

/**
 * User repository with tenant-scoped operations
 */
export class UserRepository {
  /**
   * List members of organization
   */
  static async listMembers(ctx: RequestContext) {
    return db.query.organizationMembership.findMany({
      where: eq(organizationMembership.organizationId, ctx.orgId),
      with: {
        user: true,
        role: true,
      },
    });
  }

  /**
   * Invite a user to the organization
   * SECURITY: organizationId from ctx only
   */
  static async inviteUser(ctx: RequestContext, input: InviteUserInput) {
    // Get role by key
    const targetRole = await db.query.role.findFirst({
      where: and(eq(role.key, input.roleKey), eq(role.organizationId, null)), // System role
    });

    if (!targetRole) {
      throw new Error(`Role ${input.roleKey} not found`);
    }

    // Create invitation token
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const [newInvitation] = await db
      .insert(invitation)
      .values({
        organizationId: ctx.orgId,
        email: input.email,
        roleId: targetRole.id,
        token,
        expiresAt,
        invitedBy: ctx.userId,
      })
      .returning();

    // Audit event
    await db.insert(auditEvent).values({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      action: "user.invited",
      resourceType: "invitation",
      resourceId: newInvitation.id,
      metadata: { email: input.email, role: input.roleKey },
    });

    // TODO M4: Send invitation email via outbox
    console.log(`Invitation created for ${input.email} with token: ${token}`);

    return newInvitation;
  }

  /**
   * Change user role
   * SECURITY: Both membership and org validated
   */
  static async changeRole(
    ctx: RequestContext,
    membershipId: string,
    newRoleKey: "requester" | "agent" | "admin"
  ) {
    // Verify membership exists in this org
    const membership = await db.query.organizationMembership.findFirst({
      where: and(
        eq(organizationMembership.id, membershipId),
        eq(organizationMembership.organizationId, ctx.orgId)
      ),
      with: {
        role: true,
      },
    });

    if (!membership) {
      throw new Error("Membership not found");
    }

    // Get new role
    const newRole = await db.query.role.findFirst({
      where: and(eq(role.key, newRoleKey), eq(role.organizationId, null)),
    });

    if (!newRole) {
      throw new Error(`Role ${newRoleKey} not found`);
    }

    // Update membership
    const [updated] = await db
      .update(organizationMembership)
      .set({
        roleId: newRole.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationMembership.id, membershipId),
          eq(organizationMembership.organizationId, ctx.orgId)
        )
      )
      .returning();

    // Audit event
    await db.insert(auditEvent).values({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      action: "user.role_changed",
      resourceType: "membership",
      resourceId: membershipId,
      metadata: {
        oldRole: membership.role.key,
        newRole: newRoleKey,
        userId: membership.userId,
      },
    });

    return updated;
  }
}
