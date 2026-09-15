import { db } from "@/db";
import { organizationMembership, invitation, auditEvent, role, organization } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { nanoid } from "nanoid";
import { withTenantContext } from "@/lib/db/transaction";
import { enqueueEmail } from "@/lib/email/outbox";

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
   * RLS: Transaction sets app.current_org_id for defense-in-depth
   */
  static async inviteUser(ctx: RequestContext, input: InviteUserInput) {
    // Get role by key
    const targetRole = await db.query.role.findFirst({
      where: and(eq(role.key, input.roleKey), isNull(role.organizationId)), // System role
    });

    if (!targetRole) {
      throw new Error(`Role ${input.roleKey} not found`);
    }

    const result = await withTenantContext(ctx, async (tx) => {
      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [newInvitation] = await tx
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

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "user.invited",
        resourceType: "invitation",
        resourceId: newInvitation.id,
        metadata: { email: input.email, role: input.roleKey },
      });

      return { newInvitation, token };
    });

    const org = await db.query.organization.findFirst({
      where: eq(organization.id, ctx.orgId),
    });
    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:43123";
    await enqueueEmail(ctx, {
      to: input.email,
      subject: `Invitation to ${org?.name ?? "your organization"}`,
      templateKey: "invitation",
      payload: {
        organizationName: org?.name ?? "your organization",
        invitedEmail: input.email,
        inviteUrl: `${base}/sign-up?invite=${result.token}`,
      },
    });

    return result.newInvitation;
  }

  /**
   * Change user role
   * SECURITY: Both membership and org validated
   * RLS: Transaction sets app.current_org_id for defense-in-depth
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
      where: and(eq(role.key, newRoleKey), isNull(role.organizationId)),
    });

    if (!newRole) {
      throw new Error(`Role ${newRoleKey} not found`);
    }

    return await withTenantContext(ctx, async (tx) => {
      // Update membership
      const [updated] = await tx
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
      await tx.insert(auditEvent).values({
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
    });
  }
}
