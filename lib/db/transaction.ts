import { db } from "@/db";
import type { RequestContext } from "@/lib/auth/context";

/**
 * Execute a database transaction with RLS tenant context set
 * SECURITY: Sets app.current_org_id for Row Level Security policies
 */
export async function withTenantContext<T>(
  ctx: RequestContext,
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // Set RLS context variable
    await tx.execute(`SET LOCAL app.current_org_id = '${ctx.orgId}'`);
    
    // Execute callback
    return await callback(tx);
  });
}
