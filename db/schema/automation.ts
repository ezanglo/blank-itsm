import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { organization } from "./organizations";
import { user } from "./users";
import type {
  AutomationAction,
  AutomationConditions,
  AutomationTrigger,
  AutomationTriggerConfig,
} from "@/lib/domain/automation/types";

export const automationRule = pgTable(
  "automation_rule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    kind: text("kind").notNull().$type<"assignment" | "trigger">(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    trigger: text("trigger").$type<AutomationTrigger | null>(),
    triggerConfig: jsonb("trigger_config").$type<AutomationTriggerConfig | null>(),
    conditions: jsonb("conditions").$type<AutomationConditions>().notNull(),
    actions: jsonb("actions").$type<AutomationAction[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => user.id),
    updatedBy: uuid("updated_by").references(() => user.id),
  },
  (table) => ({
    orgKindEnabledSortIdx: index("automation_rule_org_kind_enabled_sort_idx").on(
      table.organizationId,
      table.kind,
      table.enabled,
      table.sortOrder
    ),
  })
);
