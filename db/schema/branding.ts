import { pgTable, uuid, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { organization } from "./organizations";
import { user } from "./users";

export const organizationBranding = pgTable(
  "organization_branding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    logoUrl: text("logo_url"),
    tokens: jsonb("tokens").$type<{
      primary?: string;
      primaryForeground?: string;
      // Add more theme tokens as needed
    }>(),
    updatedBy: uuid("updated_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdUnique: unique().on(table.organizationId),
  })
);
