/**
 * Better Auth URL/origin settings for localhost and tunneled previews (e.g. Cursor Preview).
 * Configure via env; defaults stay local-first with no production secrets.
 */

const DEFAULT_FALLBACK = "http://localhost:43123";

/** Host patterns for dynamic baseURL (Better Auth wildcard syntax). */
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

export function getAuthFallbackUrl(): string {
  return (
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim() ||
    DEFAULT_FALLBACK
  );
}

export function parseAllowedHosts(raw?: string): string[] {
  const fromEnv = raw
    ?.split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_ALLOWED_HOSTS;
}

export function parseTrustedOriginList(raw?: string): string[] {
  const origins = new Set<string>();
  const fallback = getAuthFallbackUrl();
  try {
    origins.add(new URL(fallback).origin);
  } catch {
    /* ignore invalid fallback */
  }

  for (const entry of raw?.split(",") ?? []) {
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
