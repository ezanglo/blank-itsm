/**
 * Better Auth URL/origin settings for localhost and tunneled previews (e.g. Cursor Preview).
 * Development keeps localhost / preview defaults; production requires explicit env (see FOUNDER_PREVIEW.md).
 */

const DEFAULT_FALLBACK = "http://localhost:43123";

/** Dev/preview origins always trusted when NODE_ENV is not production. */
const DEFAULT_TRUSTED_ORIGINS = [
  "http://localhost:43123",
  "http://127.0.0.1:43123",
];

/** Host patterns for dynamic baseURL in development (Better Auth wildcard syntax). */
const DEFAULT_ALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "*.localhost",
  "*.cursor.com",
  "*.cursor.sh",
  "*.cursorpreview.com",
  "*.github.dev",
  "*.vercel.app",
];

export function isDevelopmentAuthMode(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  // `next build` sets NODE_ENV=production while evaluating route modules; deploy env is validated at runtime.
  if (process.env.NEXT_PHASE === "phase-production-build") return true;
  return false;
}

export function getAuthFallbackUrl(): string {
  return (
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim() ||
    DEFAULT_FALLBACK
  );
}

/** Raw trusted-origins env (supports BETTER_AUTH_TRUSTED_ORIGINS or TRUSTED_ORIGINS). */
export function getTrustedOriginsEnv(): string | undefined {
  const fromBetterAuth = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.trim();
  if (fromBetterAuth) return fromBetterAuth;
  return process.env.TRUSTED_ORIGINS?.trim() || undefined;
}

export function parseAllowedHosts(raw?: string): string[] {
  const fromEnv = raw
    ?.split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  if (fromEnv?.length) return fromEnv;

  if (isDevelopmentAuthMode()) {
    return DEFAULT_ALLOWED_HOSTS;
  }

  try {
    return [new URL(getAuthFallbackUrl()).hostname];
  } catch {
    throw new Error(
      "Production auth: set BETTER_AUTH_URL or BETTER_AUTH_ALLOWED_HOSTS (comma-separated hostnames)."
    );
  }
}

export function parseTrustedOriginList(raw?: string): string[] {
  const origins = new Set<string>();
  const explicitRaw = raw ?? getTrustedOriginsEnv();

  if (isDevelopmentAuthMode()) {
    const fallback = getAuthFallbackUrl();
    try {
      origins.add(new URL(fallback).origin);
    } catch {
      /* ignore invalid fallback */
    }

    for (const entry of explicitRaw?.split(",") ?? []) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      try {
        origins.add(new URL(trimmed).origin);
      } catch {
        /* allow bare host patterns handled by allowedHosts */
      }
    }

    const publicUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim();
    if (publicUrl) {
      try {
        origins.add(new URL(publicUrl).origin);
      } catch {
        /* ignore */
      }
    }

    for (const origin of DEFAULT_TRUSTED_ORIGINS) {
      origins.add(origin);
    }

    return [...origins];
  }

  const baseUrl = process.env.BETTER_AUTH_URL?.trim();
  if (!baseUrl) {
    throw new Error("Production auth: BETTER_AUTH_URL is required.");
  }

  try {
    origins.add(new URL(baseUrl).origin);
  } catch {
    throw new Error("Production auth: BETTER_AUTH_URL must be a valid absolute URL.");
  }

  const publicUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim();
  if (publicUrl) {
    try {
      origins.add(new URL(publicUrl).origin);
    } catch {
      throw new Error(
        "Production auth: NEXT_PUBLIC_BETTER_AUTH_URL must be a valid absolute URL when set."
      );
    }
  }

  if (!explicitRaw) {
    throw new Error(
      "Production auth: set BETTER_AUTH_TRUSTED_ORIGINS (or TRUSTED_ORIGINS) to your canonical HTTPS origin(s), comma-separated."
    );
  }

  for (const entry of explicitRaw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      throw new Error(
        `Production auth: invalid trusted origin "${trimmed}" — use full URLs (e.g. https://app.example.com).`
      );
    }
  }

  return [...origins];
}

export function shouldTrustProxyHeaders(): boolean {
  return process.env.BETTER_AUTH_TRUSTED_PROXY_HEADERS !== "false";
}

export function getServerAuthBaseURLConfig() {
  return {
    allowedHosts: parseAllowedHosts(process.env.BETTER_AUTH_ALLOWED_HOSTS),
    fallback: getAuthFallbackUrl(),
    protocol: "auto" as const,
  };
}

/** Client-side auth API base (current origin in browser; env fallback during SSR). */
export function getClientAuthBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getAuthFallbackUrl();
}
