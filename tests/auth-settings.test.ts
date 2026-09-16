import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  getAuthFallbackUrl,
  parseAllowedHosts,
  parseTrustedOriginList,
  shouldTrustProxyHeaders,
} from "@/lib/auth/settings";

describe("auth settings", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
    vi.unstubAllEnvs();
  });

  it("defaults fallback to localhost:43123", () => {
    delete process.env.BETTER_AUTH_URL;
    delete process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
    expect(getAuthFallbackUrl()).toBe("http://localhost:43123");
  });

  it("includes cursor preview host patterns by default", () => {
    const hosts = parseAllowedHosts();
    expect(hosts).toContain("localhost");
    expect(hosts.some((h) => h.includes("cursor"))).toBe(true);
  });

  it("parses trusted origins from env in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.BETTER_AUTH_URL = "http://localhost:43123";
    process.env.BETTER_AUTH_TRUSTED_ORIGINS =
      "https://abc.cursor.com,https://localhost:43123";
    const origins = parseTrustedOriginList();
    expect(origins).toContain("https://abc.cursor.com");
    expect(origins).toContain("http://localhost:43123");
  });

  it("requires explicit trusted origins in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PHASE;
    process.env.BETTER_AUTH_URL = "https://app.example.com";
    delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
    delete process.env.TRUSTED_ORIGINS;
    expect(() => parseTrustedOriginList()).toThrow(/BETTER_AUTH_TRUSTED_ORIGINS/);
  });

  it("uses only explicit origins in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PHASE;
    process.env.BETTER_AUTH_URL = "https://app.example.com";
    process.env.BETTER_AUTH_TRUSTED_ORIGINS =
      "https://app.example.com,https://staging.example.com";
    const origins = parseTrustedOriginList();
    expect(origins).toEqual([
      "https://app.example.com",
      "https://staging.example.com",
    ]);
    expect(origins).not.toContain("http://127.0.0.1:43123");
  });

  it("narrows allowed hosts in production without override", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PHASE;
    process.env.BETTER_AUTH_URL = "https://app.example.com";
    const hosts = parseAllowedHosts();
    expect(hosts).toEqual(["app.example.com"]);
    expect(hosts.some((h) => h.includes("cursor"))).toBe(false);
  });

  it("uses dev auth defaults during next production build phase", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    delete process.env.BETTER_AUTH_URL;
    const hosts = parseAllowedHosts();
    expect(hosts.some((h) => h.includes("cursor"))).toBe(true);
  });

  it("trusts proxy headers by default for preview tunnels", () => {
    delete process.env.BETTER_AUTH_TRUSTED_PROXY_HEADERS;
    expect(shouldTrustProxyHeaders()).toBe(true);
  });
});
