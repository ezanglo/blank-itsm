import { describe, expect, it } from "vitest";
import { lookupSeedRoster } from "@/lib/auth/seed-roster";
import { isExistingAccountAuthError } from "@/lib/auth/client-auth-flow";

describe("seed roster", () => {
  it("maps admin@org-a.test to org-a admin", () => {
    const entry = lookupSeedRoster("admin@org-a.test");
    expect(entry?.orgSlug).toBe("org-a");
    expect(entry?.roleKey).toBe("admin");
  });
});

describe("client-auth-flow", () => {
  it("detects existing-account errors", () => {
    expect(isExistingAccountAuthError({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" })).toBe(
      true
    );
    expect(isExistingAccountAuthError({ code: "INVALID_EMAIL" })).toBe(false);
  });
});
