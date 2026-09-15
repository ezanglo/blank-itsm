/**
 * Boots embedded Postgres when localhost:5432 is unavailable (Cloud Agent / fresh clone).
 */
import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "child_process";
import path from "path";
import postgres from "postgres";
import { readFileSync } from "fs";

const PORT = 55432;
const URL = `postgresql://postgres:postgres@localhost:${PORT}/blank_itsm`;

async function canConnect(url: string) {
  try {
    const sql = postgres(url, { max: 1, connect_timeout: 2 });
    await sql`SELECT 1`;
    await sql.end();
    return true;
  } catch {
    return false;
  }
}

async function applySql(url: string, files: string[]) {
  const sql = postgres(url, { max: 1 });
  for (const file of files) {
    const body = readFileSync(path.join(process.cwd(), "db/migrations", file), "utf8");
    try {
      await sql.unsafe(body);
    } catch (err) {
      console.warn(`[ensure-local-db] ${file}:`, err);
    }
  }
  await sql.end();
}

async function main() {
  const existing = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/blank_itsm";
  if (await canConnect(existing)) {
    console.log("[ensure-local-db] Using existing DATABASE_URL");
    return;
  }

  console.log("[ensure-local-db] Starting embedded Postgres on port", PORT);
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(process.cwd(), ".data", "pg-dev"),
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: true,
  });
  await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase("blank_itsm");
  } catch {
    // already exists
  }

  process.env.DATABASE_URL = URL;
  execSync("npx drizzle-kit push --force", { stdio: "inherit", env: process.env });
  await applySql(URL, [
    "0001_add_rls_policies.sql",
    "0002_add_rls_with_check.sql",
    "0003_force_rls.sql",
    "0004_account_oauth_columns.sql",
    "0005_m4_service_desk.sql",
    "0006_itsm_app_role.sql",
  ]);
  execSync("npm run db:seed", { stdio: "inherit", env: process.env });
  console.log(`[ensure-local-db] Ready. Set DATABASE_URL=${URL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
