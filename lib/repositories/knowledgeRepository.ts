import { db } from "@/db";
import { knowledgeArticle, ticketKnowledgeLink, ticketEvent, auditEvent } from "@/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { requirePermission, hasPermission, ForbiddenError } from "@/lib/auth/context";
import { withTenantContext } from "@/lib/db/transaction";
import { TicketRepository } from "@/lib/repositories/ticketRepository";

export type ArticleInput = {
  title: string;
  summary?: string;
  body: string;
  status: "draft" | "published";
};

export class KnowledgeRepository {
  static async listForAdmin(ctx: RequestContext) {
    requirePermission(ctx, "kb:manage");
    return db.query.knowledgeArticle.findMany({
      where: eq(knowledgeArticle.organizationId, ctx.orgId),
      orderBy: [desc(knowledgeArticle.updatedAt)],
      with: { author: true },
    });
  }

  static async getById(ctx: RequestContext, id: string) {
    const row = await db.query.knowledgeArticle.findFirst({
      where: and(eq(knowledgeArticle.id, id), eq(knowledgeArticle.organizationId, ctx.orgId)),
      with: { author: true },
    });
    if (!row) return null;
    if (row.status !== "published" && !hasPermission(ctx, "kb:manage")) {
      return null;
    }
    return row;
  }

  static async listPublished(ctx: RequestContext, limit = 20) {
    requirePermission(ctx, "kb:read");
    return db.query.knowledgeArticle.findMany({
      where: and(
        eq(knowledgeArticle.organizationId, ctx.orgId),
        eq(knowledgeArticle.status, "published")
      ),
      orderBy: [desc(knowledgeArticle.publishedAt)],
      limit,
    });
  }

  static async searchPublished(ctx: RequestContext, query: string, limit = 8) {
    requirePermission(ctx, "kb:read");
    const q = query.trim();
    if (!q) return [];

    const pattern = `%${q.replace(/%/g, "")}%`;
    return db.query.knowledgeArticle.findMany({
      where: and(
        eq(knowledgeArticle.organizationId, ctx.orgId),
        eq(knowledgeArticle.status, "published"),
        or(
          ilike(knowledgeArticle.title, pattern),
          ilike(knowledgeArticle.summary, pattern),
          ilike(knowledgeArticle.body, pattern)
        )
      ),
      orderBy: [desc(knowledgeArticle.publishedAt)],
      limit,
    });
  }

  static async create(ctx: RequestContext, input: ArticleInput) {
    requirePermission(ctx, "kb:manage");
    const now = new Date();
    return withTenantContext(ctx, async (tx) => {
      const [row] = await tx
        .insert(knowledgeArticle)
        .values({
          organizationId: ctx.orgId,
          title: input.title,
          summary: input.summary ?? null,
          body: input.body,
          status: input.status,
          authorId: ctx.userId,
          publishedAt: input.status === "published" ? now : null,
        })
        .returning();

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "kb.article_created",
        resourceType: "knowledge_article",
        resourceId: row.id,
        metadata: { status: input.status },
      });

      return row;
    });
  }

  static async update(ctx: RequestContext, id: string, input: Partial<ArticleInput>) {
    requirePermission(ctx, "kb:manage");
    const existing = await this.getById(ctx, id);
    if (!existing) throw new Error("Article not found");

    const status = input.status ?? (existing.status as "draft" | "published");
    const wasPublished = existing.status === "published";
    const publishedAt =
      status === "published"
        ? existing.publishedAt ?? new Date()
        : wasPublished && status === "draft"
          ? null
          : existing.publishedAt;

    return withTenantContext(ctx, async (tx) => {
      const [row] = await tx
        .update(knowledgeArticle)
        .set({
          title: input.title ?? existing.title,
          summary: input.summary !== undefined ? input.summary : existing.summary,
          body: input.body ?? existing.body,
          status,
          publishedAt,
          updatedAt: new Date(),
        })
        .where(and(eq(knowledgeArticle.id, id), eq(knowledgeArticle.organizationId, ctx.orgId)))
        .returning();

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "kb.article_updated",
        resourceType: "knowledge_article",
        resourceId: id,
        metadata: { status },
      });

      return row;
    });
  }

  static async linkToTicket(
    ctx: RequestContext,
    ticketId: string,
    articleId: string,
    linkType: "reply" | "resolve",
    ticketEventId?: string
  ) {
    requirePermission(ctx, "kb:link");
    const visible = await TicketRepository.assertTicketVisible(ctx, ticketId);
    if (!visible) throw new ForbiddenError();

    const article = await this.getById(ctx, articleId);
    if (!article || article.status !== "published") {
      throw new Error("Published article required");
    }

    return withTenantContext(ctx, async (tx) => {
      const [link] = await tx
        .insert(ticketKnowledgeLink)
        .values({
          organizationId: ctx.orgId,
          ticketId,
          articleId,
          linkedById: ctx.userId,
          linkType,
          ticketEventId: ticketEventId ?? null,
        })
        .returning();

      await tx.insert(auditEvent).values({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        action: "kb.linked_to_ticket",
        resourceType: "ticket",
        resourceId: ticketId,
        metadata: { articleId, linkType },
      });

      return link;
    });
  }

  static async listLinksForTicket(ctx: RequestContext, ticketId: string) {
    const visible = await TicketRepository.assertTicketVisible(ctx, ticketId);
    if (!visible) return [];

    return db.query.ticketKnowledgeLink.findMany({
      where: and(
        eq(ticketKnowledgeLink.ticketId, ticketId),
        eq(ticketKnowledgeLink.organizationId, ctx.orgId)
      ),
      orderBy: [desc(ticketKnowledgeLink.createdAt)],
      with: { article: true, linkedBy: true },
    });
  }
}
