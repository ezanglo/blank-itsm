import { pgTable, uuid, text, timestamp, unique, index } from "drizzle-orm/pg-core";
import { organization } from "./organizations";

export const role = pgTable(
  "role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }), // NULL = system role
    key: text("key").notNull(), // requester | agent | admin
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgKeyUnique: unique().on(table.organizationId, table.key),
  })
);

export const permission = pgTable("permission", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // e.g. ticket:create
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rolePermission = pgTable(
  "role_permission",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    rolePermUnique: unique().on(table.roleId, table.permissionId),
    roleIdIdx: index("role_permission_role_id_idx").on(table.roleId),
  })
);
