import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { organization } from "./organizations";
import { ticket } from "./tickets";
import { user } from "./users";

export const ticketAttachment = pgTable(
  "ticket_attachment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    uploadedById: uuid("uploaded_by_id")
      .notNull()
      .references(() => user.id),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ticketIdIdx: index("ticket_attachment_ticket_id_idx").on(table.ticketId),
    orgIdIdx: index("ticket_attachment_org_id_idx").on(table.organizationId),
  })
);
