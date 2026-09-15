import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { organization } from "./organizations";
import { user } from "./users";

export const auditEvent = pgTable(
  "audit_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => user.id), // nullable for system actions
    action: text("action").notNull(), // user.invited | user.role_changed | branding.updated | ticket.claimed | ticket.status_changed
    resourceType: text("resource_type"), // ticket | user | branding
    resourceId: uuid("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("audit_event_org_id_idx").on(table.organizationId),
    orgCreatedIdx: index("audit_event_org_created_idx").on(
      table.organizationId,
      table.createdAt
    ),
  })
);
