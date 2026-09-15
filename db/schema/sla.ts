import { pgTable, uuid, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { organization } from "./organizations";
import { user } from "./users";
import type { BusinessHoursCalendar } from "@/lib/domain/businessHours";

export const organizationSlaSettings = pgTable(
  "organization_sla_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    timezone: text("timezone").notNull().default("UTC"),
    businessHours: jsonb("business_hours").$type<BusinessHoursCalendar>().notNull(),
    escalationEmail: text("escalation_email"),
    updatedBy: uuid("updated_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdUnique: unique().on(table.organizationId),
  })
);
