import { db } from "@/db";
import { role, permission, rolePermission } from "@/db/schema";
import { isNull, asc } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/context";

export class RbacRepository {
  /** System roles and their permission keys (read-only admin view). */
  static async listSystemRolesWithPermissions(ctx: RequestContext) {
    requirePermission(ctx, "admin:access");

    const roles = await db.query.role.findMany({
      where: isNull(role.organizationId),
      orderBy: [asc(role.key)],
      with: {
        rolePermissions: {
          with: { permission: true },
        },
      },
    });

    const allPermissions = await db.query.permission.findMany({
      orderBy: [asc(permission.key)],
    });

    return { roles, allPermissions };
  }
}
