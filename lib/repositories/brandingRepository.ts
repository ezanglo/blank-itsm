import { db } from "@/db";
import { organizationBranding, auditEvent } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/context";
import { withTenantContext } from "@/lib/db/transaction";

export type BrandingTokens = {
  primary?: string;
  primaryForeground?: string;
};

export type UpdateBrandingInput = {
  logoUrl?: string | null;
  tokens?: BrandingTokens | null;
};

/**
 * Branding repository with tenant-scoped queries
 */
export class BrandingRepository {
  /**
   * Get branding for organization
   * Returns null if no custom branding set
   */
  static async getForOrg(orgId: string) {
    return db.query.organizationBranding.findFirst({
      where: eq(organizationBranding.organizationId, orgId),
    });
  }

  /**
   * Upsert organization branding
   * SECURITY: organizationId from ctx only
   * RLS: Transaction sets app.current_org_id for defense-in-depth
   */
  static async upsert(ctx: RequestContext, input: UpdateBrandingInput) {
    requirePermission(ctx, "branding:write");
    const existing = await this.getForOrg(ctx.orgId);

    return await withTenantContext(ctx, async (tx) => {
      let result;
      if (existing) {
        [result] = await tx
          .update(organizationBranding)
          .set({
            logoUrl: input.logoUrl,
            tokens: input.tokens,
            updatedBy: ctx.userId,
            updatedAt: new Date(),
          })
          .where(eq(organizationBranding.organizationId, ctx.orgId))
          .returning();
      } else {
        [result] = await tx
          .insert(organizationBranding)
          .values({
            organizationId: ctx.orgId,
            logoUrl: input.logoUrl,
            tokens: input.tokens,
            updatedBy: ctx.userId,
          })
          .returning();
      }

      // Audit event
      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "branding.updated",
        resourceType: "branding",
        resourceId: result.id,
        metadata: { hasLogo: !!input.logoUrl, hasTokens: !!input.tokens },
      });

      return result;
    });
  }
}
