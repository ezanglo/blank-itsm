import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getAuthFallbackUrl,
  getServerAuthBaseURLConfig,
  parseTrustedOriginList,
  shouldTrustProxyHeaders,
} from "./settings";
import { provisionMembershipForSeededEmail } from "./provision-membership";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is not set");
}

const trustedOrigins = parseTrustedOriginList(process.env.BETTER_AUTH_TRUSTED_ORIGINS);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: getServerAuthBaseURLConfig(),
  trustedOrigins,
  advanced: {
    trustedProxyHeaders: shouldTrustProxyHeaders(),
    database: {
      generateId: "uuid",
    },
    defaultCookieAttributes: {
      sameSite: "lax",
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          if (createdUser.email) {
            await provisionMembershipForSeededEmail(createdUser.id, createdUser.email);
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          const row = await db.query.user.findFirst({
            where: eq(user.id, session.userId),
          });
          if (row?.email) {
            await provisionMembershipForSeededEmail(session.userId, row.email);
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

/** Resolved fallback origin (localhost dev). */
export const authFallbackUrl = getAuthFallbackUrl();
