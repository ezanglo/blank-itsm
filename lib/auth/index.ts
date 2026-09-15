import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  getAuthFallbackUrl,
  getServerAuthBaseURLConfig,
  parseTrustedOriginList,
  shouldTrustProxyHeaders,
} from "./settings";

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
  },
});

export type Session = typeof auth.$Infer.Session;

/** Resolved fallback origin (localhost dev). */
export const authFallbackUrl = getAuthFallbackUrl();
