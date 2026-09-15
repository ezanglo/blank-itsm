import { db } from "@/db";
import type { RequestContext } from "@/lib/auth/context";
import { sql } from "drizzle-orm";

/**
 * Execute a database transaction with RLS tenant context set
 * SECURITY: Sets app.current_org_id for Row Level Security policies using parameterized set_config
 */
export async function withTenantContext<T>(
  ctx: RequestContext,
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // Set RLS context variable using set_config with parameterized value (not string interpolation)
    await tx.execute(
      sql`SELECT set_config('app.current_org_id', ${ctx.orgId}, true)`
    );
    
    // Execute callback
    return await callback(tx);
  });
}
