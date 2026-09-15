import { describe, expect, it, beforeEach, afterEach } from "vitest";
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

  it("parses trusted origins from env", () => {
    process.env.BETTER_AUTH_URL = "http://localhost:43123";
    process.env.BETTER_AUTH_TRUSTED_ORIGINS =
      "https://abc.cursor.com,https://localhost:43123";
    const origins = parseTrustedOriginList(process.env.BETTER_AUTH_TRUSTED_ORIGINS);
    expect(origins).toContain("https://abc.cursor.com");
    expect(origins).toContain("http://localhost:43123");
  });

  it("trusts proxy headers by default for preview tunnels", () => {
    delete process.env.BETTER_AUTH_TRUSTED_PROXY_HEADERS;
    expect(shouldTrustProxyHeaders()).toBe(true);
  });
});
