import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { organization } from "./organizations";
import { user } from "./users";
import { ticket } from "./tickets";

export type CatalogFormFieldType = "text" | "textarea" | "select";

export type CatalogFormField = {
  key: string;
  label: string;
  type: CatalogFormFieldType;
  required?: boolean;
  options?: string[];
};

export const catalogItem = pgTable(
  "catalog_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    formSchema: text("form_schema").notNull().default("[]"),
    fulfillmentQueue: text("fulfillment_queue").notNull().default("general"),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    approverUserId: uuid("approver_user_id").references(() => user.id),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index("catalog_item_org_id_idx").on(table.organizationId),
    orgActiveIdx: index("catalog_item_org_active_idx").on(table.organizationId, table.active),
  })
);

export const catalogOrder = pgTable(
  "catalog_order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    catalogItemId: uuid("catalog_item_id")
      .notNull()
      .references(() => catalogItem.id, { onDelete: "restrict" }),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    formResponses: text("form_responses").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ticketIdIdx: index("catalog_order_ticket_id_idx").on(table.ticketId),
    orgIdIdx: index("catalog_order_org_id_idx").on(table.organizationId),
  })
);

export const serviceRequestApproval = pgTable(
  "service_request_approval",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    approverUserId: uuid("approver_user_id")
      .notNull()
      .references(() => user.id),
    status: text("status").notNull().default("pending"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedById: uuid("decided_by_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ticketIdIdx: index("service_request_approval_ticket_id_idx").on(table.ticketId),
    orgStatusIdx: index("service_request_approval_org_status_idx").on(
      table.organizationId,
      table.status
    ),
  })
);
