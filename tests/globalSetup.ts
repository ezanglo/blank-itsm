import EmbeddedPostgres from "embedded-postgres";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { execSync } from "child_process";

let pg: EmbeddedPostgres | null = null;

export async function setup() {
  const probe = await canConnect(process.env.DATABASE_URL);
  if (probe) {
    await applyMigrations(process.env.DATABASE_URL!, ["0005_m4_service_desk.sql", "0006_itsm_app_role.sql"]);
    writeFileSync(
      path.join(process.cwd(), ".vitest-env.json"),
      JSON.stringify({ DATABASE_URL: process.env.DATABASE_URL })
    );
    return;
  }

  pg = new EmbeddedPostgres({
    databaseDir: path.join(process.cwd(), ".data", "pg-test"),
    user: "postgres",
    password: "postgres",
    port: 55432,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase("blank_itsm");

  const url = "postgresql://postgres:postgres@localhost:55432/blank_itsm";
  process.env.DATABASE_URL = url;
  process.env.ITSM_APP_DATABASE_URL =
    "postgresql://itsm_app:itsm_app_test@localhost:55432/blank_itsm";

  execSync("npx drizzle-kit push --force", { stdio: "inherit", env: process.env });
  await applyMigrations(url, [
    "0001_add_rls_policies.sql",
    "0002_add_rls_with_check.sql",
    "0003_force_rls.sql",
    "0004_account_oauth_columns.sql",
    "0005_m4_service_desk.sql",
    "0006_itsm_app_role.sql",
  ]);
  execSync("npm run db:seed", { stdio: "inherit", env: process.env });

  writeFileSync(
    path.join(process.cwd(), ".vitest-env.json"),
    JSON.stringify({
      DATABASE_URL: url,
      ITSM_APP_DATABASE_URL: process.env.ITSM_APP_DATABASE_URL,
    })
  );
}

export async function teardown() {
  if (pg) {
    await pg.stop();
  }
}

async function canConnect(url?: string): Promise<boolean> {
  if (!url) return false;
  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, { max: 1, connect_timeout: 2 });
    await sql`SELECT 1`;
    await sql.end();
    return true;
  } catch {
    return false;
  }
}

async function applyMigrations(databaseUrl: string, files: string[]) {
  const postgres = (await import("postgres")).default;
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    for (const file of files) {
      const body = readFileSync(path.join(process.cwd(), "db/migrations", file), "utf8");
      try {
        await sql.unsafe(body);
      } catch (err) {
        console.warn(`[test setup] migration ${file} skipped or failed:`, err);
      }
    }
  } finally {
    await sql.end();
  }
}
