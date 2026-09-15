import { describe, expect, it, beforeAll } from "vitest";
import { auth } from "@/lib/auth";
import { ensureCredentialAccountForEmail, SEED_PASSWORD } from "@/lib/auth/seed-credentials";
import { db } from "@/db";
import { organizationMembership, user } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("auth smoke", () => {
  beforeAll(async () => {
    await ensureCredentialAccountForEmail("admin@org-a.test", SEED_PASSWORD);
  });

  it("sign-in succeeds for seeded admin@org-a.test with password123", async () => {
    const response = await auth.api.signInEmail({
      body: {
        email: "admin@org-a.test",
        password: SEED_PASSWORD,
      },
      asResponse: true,
      headers: new Headers({
        host: "localhost:43123",
        origin: "http://localhost:43123",
        "x-forwarded-host": "localhost:43123",
        "x-forwarded-proto": "http",
      }),
    });

    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie!.toLowerCase()).toMatch(/session/);

    const adminUser = await db.query.user.findFirst({
      where: eq(user.email, "admin@org-a.test"),
    });
    expect(adminUser).toBeTruthy();
    const membership = await db.query.organizationMembership.findFirst({
      where: eq(organizationMembership.userId, adminUser!.id),
    });
    expect(membership?.status).toBe("active");
  });

  it("rejects wrong password with error response", async () => {
    const response = await auth.api.signInEmail({
      body: {
        email: "admin@org-a.test",
        password: "wrong-password-xyz",
      },
      asResponse: true,
      headers: new Headers({
        host: "localhost:43123",
        origin: "http://localhost:43123",
      }),
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
