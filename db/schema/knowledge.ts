import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { organization } from "./organizations";
import { user } from "./users";
import { ticket } from "./tickets";
import { ticketEvent } from "./tickets";

export const knowledgeArticle = pgTable(
  "knowledge_article",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary"),
    body: text("body").notNull(),
    status: text("status").notNull().default("draft"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("knowledge_article_org_id_idx").on(table.organizationId),
    orgStatusIdx: index("knowledge_article_org_status_idx").on(
      table.organizationId,
      table.status
    ),
  })
);

export const ticketKnowledgeLink = pgTable(
  "ticket_knowledge_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => knowledgeArticle.id, { onDelete: "cascade" }),
    linkedById: uuid("linked_by_id")
      .notNull()
      .references(() => user.id),
    linkType: text("link_type").notNull(),
    ticketEventId: uuid("ticket_event_id").references(() => ticketEvent.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ticketIdIdx: index("ticket_knowledge_link_ticket_id_idx").on(table.ticketId),
    orgIdIdx: index("ticket_knowledge_link_org_id_idx").on(table.organizationId),
  })
);
