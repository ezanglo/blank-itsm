import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import {
  organization,
  user,
  catalogItem,
  knowledgeArticle,
  ticket,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { ForbiddenError } from "@/lib/auth/context";
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
  let agentB: { id: string };
  let catalogNoApprovalId: string;
  let publishedArticleAId: string;
  let draftArticleAId: string;

  beforeAll(async () => {
    const orgA = await db.query.organization.findFirst({ where: eq(organization.slug, "org-a") });
    const orgB = await db.query.organization.findFirst({ where: eq(organization.slug, "org-b") });
    const req = await db.query.user.findFirst({ where: eq(user.email, "requester@org-a.test") });
    const adm = await db.query.user.findFirst({ where: eq(user.email, "admin@org-a.test") });
    const agt = await db.query.user.findFirst({ where: eq(user.email, "agent@org-a.test") });
    const agtB = await db.query.user.findFirst({ where: eq(user.email, "agent@org-b.test") });

    if (!orgA || !orgB || !req || !adm || !agt || !agtB) {
      throw new Error("Seed data missing");
    }

    orgAId = orgA.id;
    orgBId = orgB.id;
    requesterA = req;
    adminA = adm;
    agentA = agt;
    agentB = agtB;

    const existing = await db.query.catalogItem.findFirst({
      where: and(eq(catalogItem.organizationId, orgAId), eq(catalogItem.name, "Software access")),
    });
    if (!existing) throw new Error("Seed catalog item missing");
    catalogNoApprovalId = existing.id;

    const published = await db.query.knowledgeArticle.findFirst({
      where: and(
        eq(knowledgeArticle.organizationId, orgAId),
        eq(knowledgeArticle.status, "published")
      ),
    });
    const draft = await db.query.knowledgeArticle.findFirst({
      where: and(eq(knowledgeArticle.organizationId, orgAId), eq(knowledgeArticle.status, "draft")),
    });
    if (!published || !draft) throw new Error("Seed KB articles missing");
    publishedArticleAId = published.id;
    draftArticleAId = draft.id;
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

  it("agent can link published article on public reply (FR-062, same txn as ticket_event)", async () => {
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
      knowledgeArticleId: publishedArticleAId,
    });

    const links = await KnowledgeRepository.listLinksForTicket(ctx, ticketRow!.id);
    const link = links.find((l) => l.articleId === publishedArticleAId && l.linkType === "reply");
    expect(link).toBeTruthy();
    expect(link!.ticketEventId).toBeTruthy();
  });

  describe("M5 negative isolation", () => {
    it("denies cross-org catalog placeOrder", async () => {
      const ctxB = ctxFor(requesterA.id, orgBId, ["catalog:order", "ticket:create"]);
      await expect(
        CatalogRepository.placeOrder(ctxB, catalogNoApprovalId, { application: "Evil" })
      ).rejects.toThrow();
    });

    it("denies requester catalog create", async () => {
      const ctx = ctxFor(requesterA.id, orgAId, ["catalog:order"]);
      await expect(
        CatalogRepository.create(ctx, {
          name: "Blocked",
          description: "nope",
          fulfillmentQueue: "general",
          requiresApproval: false,
          formSchema: [],
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("denies cross-org decideApproval", async () => {
      const pendingTicket = await db.query.ticket.findFirst({
        where: and(eq(ticket.organizationId, orgAId), eq(ticket.status, "pending_approval")),
      });
      if (!pendingTicket) {
        const laptop = await db.query.catalogItem.findFirst({
          where: and(eq(catalogItem.organizationId, orgAId), eq(catalogItem.name, "New laptop")),
        });
        expect(laptop).toBeTruthy();
        const ctxA = ctxFor(requesterA.id, orgAId, ["catalog:order", "ticket:create"]);
        await CatalogRepository.placeOrder(ctxA, laptop!.id, {
          justification: "Need device",
          department: "Eng",
        });
      }

      const approvalTicket = await db.query.ticket.findFirst({
        where: and(eq(ticket.organizationId, orgAId), eq(ticket.status, "pending_approval")),
      });
      expect(approvalTicket).toBeTruthy();

      const ctxB = ctxFor(agentB.id, orgBId, ["catalog:manage", "ticket:read_org"]);
      await expect(
        CatalogRepository.decideApproval(ctxB, approvalTicket!.id, "approved")
      ).rejects.toThrow();
    });

    it("denies cross-org KnowledgeRepository.getById for published article", async () => {
      const ctxB = ctxFor(requesterA.id, orgBId, ["kb:read"]);
      const row = await KnowledgeRepository.getById(ctxB, publishedArticleAId);
      expect(row).toBeNull();
    });

    it("denies requester read of draft article via getById", async () => {
      const ctx = ctxFor(requesterA.id, orgAId, ["kb:read"]);
      const row = await KnowledgeRepository.getById(ctx, draftArticleAId);
      expect(row).toBeNull();
    });

    it("denies foreign-org linkToTicket", async () => {
      const ticketA = await db.query.ticket.findFirst({
        where: eq(ticket.organizationId, orgAId),
      });
      expect(ticketA).toBeTruthy();

      const ctxB = ctxFor(agentB.id, orgBId, [
        "kb:link",
        "ticket:read_org",
        "agent:access",
      ]);

      await expect(
        KnowledgeRepository.linkToTicket(ctxB, ticketA!.id, publishedArticleAId, "reply")
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
