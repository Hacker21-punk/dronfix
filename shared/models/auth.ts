import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, pgEnum, timestamp, varchar, text } from "drizzle-orm/pg-core";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Role enum
export const roleEnum = pgEnum("role", ["admin", "engineer", "account", "logistics"]);

// Single unified users table - no separate profiles
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().default(""),
  email: varchar("email").unique().notNull(),
  password: varchar("password"),
  role: roleEnum("role").default("engineer").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
