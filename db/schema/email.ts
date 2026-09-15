import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { organization } from "./organizations";

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    toAddress: text("to_address").notNull(),
    subject: text("subject").notNull(),
    templateKey: text("template_key").notNull(),
    payload: text("payload").notNull(),
    status: text("status").notNull().default("pending"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index("email_outbox_status_idx").on(table.status),
    orgIdIdx: index("email_outbox_org_id_idx").on(table.organizationId),
  })
);
