import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import { organization, user, catalogItem, knowledgeArticle, ticket } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { CatalogRepository } from "@/lib/repositories/catalogRepository";
import { KnowledgeRepository } from "@/lib/repositories/knowledgeRepository";
import { TicketRepository } from "@/lib/repositories/ticketRepository";

function ctxFor(
  userId: string,
  orgId: string,
  permissions: string[]
): RequestContext {
  return {
    userId,
    orgId,
    role: "test",
    roleId: "test",
    permissions: new Set(permissions),
  };
}

describe("M5 catalog and knowledge", () => {
  let orgAId: string;
  let orgBId: string;
  let requesterA: { id: string };
  let adminA: { id: string };
  let agentA: { id: string };
  let catalogNoApprovalId: string;

  beforeAll(async () => {
    const orgA = await db.query.organization.findFirst({ where: eq(organization.slug, "org-a") });
    const orgB = await db.query.organization.findFirst({ where: eq(organization.slug, "org-b") });
    const req = await db.query.user.findFirst({ where: eq(user.email, "requester@org-a.test") });
    const adm = await db.query.user.findFirst({ where: eq(user.email, "admin@org-a.test") });
    const agt = await db.query.user.findFirst({ where: eq(user.email, "agent@org-a.test") });

    if (!orgA || !orgB || !req || !adm || !agt) {
      throw new Error("Seed data missing");
    }

    orgAId = orgA.id;
    orgBId = orgB.id;
    requesterA = req;
    adminA = adm;
    agentA = agt;

    const existing = await db.query.catalogItem.findFirst({
      where: and(eq(catalogItem.organizationId, orgAId), eq(catalogItem.name, "Software access")),
    });
    if (!existing) throw new Error("Seed catalog item missing");
    catalogNoApprovalId = existing.id;
  });

  it("places catalog order as service_request ticket", async () => {
    const ctx = ctxFor(requesterA.id, orgAId, ["catalog:order", "ticket:create"]);
    const created = await CatalogRepository.placeOrder(ctx, catalogNoApprovalId, {
      application: "Slack",
    });
    expect(created.type).toBe("service_request");
    expect(created.fulfillmentQueue).toBe("general");
    expect(created.status).toBe("open");
  });

  it("isolates knowledge search by organization", async () => {
    const ctxA = ctxFor(requesterA.id, orgAId, ["kb:read"]);
    const ctxB = ctxFor(requesterA.id, orgBId, ["kb:read"]);

    const hitsA = await KnowledgeRepository.searchPublished(ctxA, "password", 5);
    const hitsB = await KnowledgeRepository.searchPublished(ctxB, "password", 5);

    expect(hitsA.some((a) => a.title.includes("Reset"))).toBe(true);
    expect(hitsB.length).toBe(0);
  });

  it("admin can manage catalog items", async () => {
    const ctx = ctxFor(adminA.id, orgAId, ["catalog:manage"]);
    const item = await CatalogRepository.create(ctx, {
      name: "Test catalog item",
      description: "Temporary item for unit test",
      fulfillmentQueue: "general",
      requiresApproval: false,
      formSchema: [{ key: "note", label: "Note", type: "text" }],
    });
    expect(item.organizationId).toBe(orgAId);
    await CatalogRepository.delete(ctx, item.id);
  });

  it("agent can link published article on public reply", async () => {
    const article = await db.query.knowledgeArticle.findFirst({
      where: and(
        eq(knowledgeArticle.organizationId, orgAId),
        eq(knowledgeArticle.status, "published")
      ),
    });
    expect(article).toBeTruthy();

    const ticketRow = await db.query.ticket.findFirst({
      where: eq(ticket.organizationId, orgAId),
    });
    expect(ticketRow).toBeTruthy();

    const ctx = ctxFor(agentA.id, orgAId, [
      "kb:link",
      "ticket:read_org",
      "ticket:comment_public",
      "agent:access",
    ]);

    await TicketRepository.addComment(ctx, ticketRow!.id, "See attached article", "public", {
      knowledgeArticleId: article!.id,
    });

    const links = await KnowledgeRepository.listLinksForTicket(ctx, ticketRow!.id);
    expect(links.some((l) => l.articleId === article!.id && l.linkType === "reply")).toBe(true);
  });
});
