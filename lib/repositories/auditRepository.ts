import { db } from "@/db";
import { auditEvent } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/context";

export class AuditRepository {
  static async listRecent(ctx: RequestContext, limit = 75) {
    requirePermission(ctx, "audit:read");
    return db.query.auditEvent.findMany({
      where: eq(auditEvent.organizationId, ctx.orgId),
      orderBy: [desc(auditEvent.createdAt)],
      limit,
      with: {
        actor: true,
      },
    });
  }
}
