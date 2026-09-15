import { auth } from "./index";
import { db } from "@/db";
import { organizationMembership } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

export type RequestContext = {
  userId: string;
  orgId: string;
  role: string;
  roleId: string;
  permissions: ReadonlySet<string>;
};

class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

class ForbiddenError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export { UnauthorizedError, ForbiddenError };

/**
 * Build request context from authenticated session.
 * SECURITY: This is the ONLY way to establish tenant context.
 * Never trust client-supplied organizationId.
 */
export async function buildRequestContext(): Promise<RequestContext> {
  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new UnauthorizedError("No valid session");
  }

  const userId = session.user.id;

  // Get active membership for this user
  // For M3, we assume single org per user for simplicity
  // Multi-org support can be added later by checking a session claim or cookie
  const membership = await db.query.organizationMembership.findFirst({
    where: and(
      eq(organizationMembership.userId, userId),
      eq(organizationMembership.status, "active")
    ),
    with: {
      role: {
        with: {
          rolePermissions: {
            with: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    throw new ForbiddenError("No active organization membership");
  }

  // Build permission set
  const permissions = new Set<string>(
    membership.role.rolePermissions.map((rp) => rp.permission.key)
  );

  return {
    userId,
    orgId: membership.organizationId,
    role: membership.role.key,
    roleId: membership.roleId,
    permissions,
  };
}

/**
 * Require a specific permission. Throws ForbiddenError if not present.
 */
export function requirePermission(ctx: RequestContext, permissionKey: string): void {
  if (!ctx.permissions.has(permissionKey)) {
    throw new ForbiddenError(`Missing required permission: ${permissionKey}`);
  }
}

/**
 * Check if user has a permission without throwing
 */
export function hasPermission(ctx: RequestContext, permissionKey: string): boolean {
  return ctx.permissions.has(permissionKey);
}
