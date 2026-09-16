import { describe, it, expect, beforeAll } from "vitest";
import postgres from "postgres";
import { db } from "@/db";
import {
  organization,
  user,
  ticket,
  catalogItem,
  knowledgeArticle,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import path from "path";

function resolveAppUrl(): string {
  if (process.env.ITSM_APP_DATABASE_URL) return process.env.ITSM_APP_DATABASE_URL;
  const base = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/blank_itsm";
  const parsed = new URL(base.replace(/^postgresql:\/\//, "http://"));
  parsed.username = "itsm_app";
  parsed.password = "itsm_app_test";
  return `postgresql://${parsed.username}:${parsed.password}@${parsed.host}${parsed.pathname}`;
}

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

  it("rejects ticket insert with organization_id outside current tenant GUC", async () => {
    const sql = postgres(resolveAppUrl(), { max: 1 });
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

  it("rejects email_outbox insert for wrong organization", async () => {
    const sql = postgres(resolveAppUrl(), { max: 1 });
    try {
      await sql`SELECT set_config('app.current_org_id', ${orgAId}, true)`;

      await expect(
        sql`
          INSERT INTO email_outbox (
            organization_id, to_address, subject, template_key, payload, status
          ) VALUES (
            ${orgBId}, 'probe@example.com', 'RLS', 'invitation', '{}', 'pending'
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });

  it("rejects catalog_item insert for wrong organization", async () => {
    const sql = postgres(resolveAppUrl(), { max: 1 });
    try {
      await sql`SELECT set_config('app.current_org_id', ${orgAId}, true)`;
      await expect(
        sql`
          INSERT INTO catalog_item (
            organization_id, name, description, form_schema, fulfillment_queue
          ) VALUES (
            ${orgBId}, 'RLS probe', 'should fail', '[]', 'general'
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });

  it("rejects knowledge_article insert for wrong organization", async () => {
    const sql = postgres(resolveAppUrl(), { max: 1 });
    try {
      await sql`SELECT set_config('app.current_org_id', ${orgAId}, true)`;
      await expect(
        sql`
          INSERT INTO knowledge_article (
            organization_id, title, body, status, author_id
          ) VALUES (
            ${orgBId}, 'RLS probe', 'body', 'draft', ${requesterAId}
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });

  it("rejects catalog_order insert for wrong organization", async () => {
    const ticketRow = await db.query.ticket.findFirst({
      where: eq(ticket.organizationId, orgAId),
    });
    const itemRow = await db.query.catalogItem.findFirst({
      where: eq(catalogItem.organizationId, orgAId),
    });
    if (!ticketRow || !itemRow) throw new Error("seed catalog/ticket missing");

    const sql = postgres(resolveAppUrl(), { max: 1 });
    try {
      await sql`SELECT set_config('app.current_org_id', ${orgAId}, true)`;
      await expect(
        sql`
          INSERT INTO catalog_order (
            organization_id, catalog_item_id, ticket_id, form_responses
          ) VALUES (
            ${orgBId}, ${itemRow.id}, ${ticketRow.id}, '{}'
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });

  it("rejects service_request_approval insert for wrong organization", async () => {
    const ticketRow = await db.query.ticket.findFirst({
      where: eq(ticket.organizationId, orgAId),
    });
    const adminA = await db.query.user.findFirst({
      where: eq(user.email, "admin@org-a.test"),
    });
    if (!ticketRow || !adminA) throw new Error("seed missing");

    const sql = postgres(resolveAppUrl(), { max: 1 });
    try {
      await sql`SELECT set_config('app.current_org_id', ${orgAId}, true)`;
      await expect(
        sql`
          INSERT INTO service_request_approval (
            organization_id, ticket_id, approver_user_id, status
          ) VALUES (
            ${orgBId}, ${ticketRow.id}, ${adminA.id}, 'pending'
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });

  it("rejects ticket_knowledge_link insert for wrong organization", async () => {
    const ticketRow = await db.query.ticket.findFirst({
      where: eq(ticket.organizationId, orgAId),
    });
    const article = await db.query.knowledgeArticle.findFirst({
      where: eq(knowledgeArticle.organizationId, orgAId),
    });
    const agentA = await db.query.user.findFirst({
      where: eq(user.email, "agent@org-a.test"),
    });
    if (!ticketRow || !article || !agentA) throw new Error("seed missing");

    const sql = postgres(resolveAppUrl(), { max: 1 });
    try {
      await sql`SELECT set_config('app.current_org_id', ${orgAId}, true)`;
      await expect(
        sql`
          INSERT INTO ticket_knowledge_link (
            organization_id, ticket_id, article_id, linked_by_id, link_type
          ) VALUES (
            ${orgBId}, ${ticketRow.id}, ${article.id}, ${agentA.id}, 'reply'
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });

  it("rejects organization_sla_settings insert for wrong organization", async () => {
    const sql = postgres(resolveAppUrl(), { max: 1 });
    try {
      await sql`SELECT set_config('app.current_org_id', ${orgAId}, true)`;
      await expect(
        sql`
          INSERT INTO organization_sla_settings (
            organization_id, timezone, business_hours
          ) VALUES (
            ${orgBId}, 'UTC', '{"timezone":"UTC","days":[]}'::jsonb
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });

  it("rejects audit_event insert for wrong organization", async () => {
    const sql = postgres(resolveAppUrl(), { max: 1 });
    try {
      await sql`SELECT set_config('app.current_org_id', ${orgAId}, true)`;
      await expect(
        sql`
          INSERT INTO audit_event (
            organization_id, action
          ) VALUES (
            ${orgBId}, 'probe.cross_tenant'
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });

  it("rejects automation_rule insert for wrong organization", async () => {
    const sql = postgres(resolveAppUrl(), { max: 1 });
    try {
      await sql`SELECT set_config('app.current_org_id', ${orgAId}, true)`;
      await expect(
        sql`
          INSERT INTO automation_rule (
            organization_id, name, kind, enabled, sort_order, conditions, actions
          ) VALUES (
            ${orgBId},
            'RLS probe',
            'assignment',
            true,
            0,
            '{"all":[]}'::jsonb,
            '[]'::jsonb
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });

  it("rejects ticket_attachment insert for wrong organization", async () => {
    const ticketRow = await db.query.ticket.findFirst({
      where: eq(ticket.organizationId, orgAId),
    });
    if (!ticketRow) throw new Error("seed ticket missing");

    const sql = postgres(resolveAppUrl(), { max: 1 });
    try {
      await sql`SELECT set_config('app.current_org_id', ${orgAId}, true)`;

      await expect(
        sql`
          INSERT INTO ticket_attachment (
            organization_id, ticket_id, uploaded_by_id, file_name, mime_type, size_bytes, storage_key
          ) VALUES (
            ${orgBId}, ${ticketRow.id}, ${requesterAId}, 'x.txt', 'text/plain', 1, 'probe/key'
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql.end();
    }
  });
});
