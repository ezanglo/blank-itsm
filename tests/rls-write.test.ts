import { describe, it, expect, beforeAll } from "vitest";
import postgres from "postgres";
import { db } from "@/db";
import { organization, user, ticket } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import path from "path";

const APP_URL =
  process.env.ITSM_APP_DATABASE_URL ??
  "postgresql://itsm_app:itsm_app_test@localhost:5432/blank_itsm";

describe("RLS wrong-org write (non-superuser)", () => {
  let orgAId: string;
  let orgBId: string;
  let requesterAId: string;

  beforeAll(async () => {
    const admin = postgres(process.env.DATABASE_URL!);
    try {
      const roleSql = readFileSync(
        path.join(process.cwd(), "db/migrations/0006_itsm_app_role.sql"),
        "utf8"
      );
      await admin.unsafe(roleSql);
    } finally {
      await admin.end();
    }

    const orgA = await db.query.organization.findFirst({
      where: eq(organization.slug, "org-a"),
    });
    const orgB = await db.query.organization.findFirst({
      where: eq(organization.slug, "org-b"),
    });
    const requester = await db.query.user.findFirst({
      where: eq(user.email, "requester@org-a.test"),
    });
    if (!orgA || !orgB || !requester) throw new Error("seed data missing");
    orgAId = orgA.id;
    orgBId = orgB.id;
    requesterAId = requester.id;
  });

  it("rejects insert with organization_id outside current tenant GUC", async () => {
    const sql = postgres(APP_URL, { max: 1 });
    try {
      await sql`SELECT set_config('app.current_org_id', ${orgAId}, true)`;

      await expect(
        sql`
          INSERT INTO ticket (
            organization_id, number, type, subject, description, status, requester_id
          ) VALUES (
            ${orgBId}, 99999, 'incident', 'RLS probe', 'should fail', 'open', ${requesterAId}
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });
});
