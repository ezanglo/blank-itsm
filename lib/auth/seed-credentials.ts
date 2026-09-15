import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account, user } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SEED_PASSWORD = "password123";

/**
 * Ensure credential accounts exist for seeded users so email/password sign-in works.
 */
export async function ensureCredentialAccountsForUsers(
  userIds: string[],
  plainPassword: string = SEED_PASSWORD
): Promise<void> {
  const passwordHash = await hashPassword(plainPassword);

  for (const userId of userIds) {
    const existing = await db.query.account.findFirst({
      where: (a, { and, eq: eqFn }) =>
        and(eqFn(a.userId, userId), eqFn(a.providerId, "credential")),
    });

    if (existing) {
      if (!existing.password) {
        await db
          .update(account)
          .set({ password: passwordHash, updatedAt: new Date() })
          .where(eq(account.id, existing.id));
      }
      continue;
    }

    await db.insert(account).values({
      userId,
      providerId: "credential",
      accountId: userId,
      password: passwordHash,
    });
  }
}

export async function ensureCredentialAccountForEmail(
  email: string,
  plainPassword: string = SEED_PASSWORD
): Promise<void> {
  const row = await db.query.user.findFirst({
    where: eq(user.email, email.toLowerCase()),
  });
  if (!row) return;
  await ensureCredentialAccountsForUsers([row.id], plainPassword);
}
