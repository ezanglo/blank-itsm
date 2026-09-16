import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const migrateUrl =
  process.env.DATABASE_URL_DIRECT?.trim() || process.env.DATABASE_URL?.trim();

if (!migrateUrl) {
  throw new Error(
    "DATABASE_URL_DIRECT or DATABASE_URL is required for drizzle-kit (prefer direct Neon URL for migrate)."
  );
}

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrateUrl,
  },
  verbose: true,
  strict: true,
});
