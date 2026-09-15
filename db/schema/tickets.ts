import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { organization } from "./organizations";
import { user } from "./users";

export const ticket = pgTable(
  "ticket",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    number: integer("number").notNull(), // org-scoped sequence
    type: text("type").notNull(), // incident | service_request
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("open"), // open | in_progress | resolved | closed
    priority: text("priority"), // low | medium | high | critical
    impact: text("impact"), // low | medium | high
    urgency: text("urgency"), // low | medium | high
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => user.id),
    assigneeId: uuid("assignee_id").references(() => user.id),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("ticket_org_id_idx").on(table.organizationId),
    orgStatusIdx: index("ticket_org_status_idx").on(table.organizationId, table.status),
    orgAssigneeIdx: index("ticket_org_assignee_idx").on(
      table.organizationId,
      table.assigneeId
    ),
    orgRequesterIdx: index("ticket_org_requester_idx").on(
      table.organizationId,
      table.requesterId
    ),
  })
);

export const ticketEvent = pgTable(
  "ticket_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => user.id),
    kind: text("kind").notNull(), // comment_public | comment_internal | status_change | assignment | system
    body: text("body"),
    metadata: text("metadata"), // JSON string for structured data
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ticketIdIdx: index("ticket_event_ticket_id_idx").on(table.ticketId),
    orgIdIdx: index("ticket_event_org_id_idx").on(table.organizationId),
  })
);
