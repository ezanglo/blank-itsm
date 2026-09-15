import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import path from "path";

const vitestEnvPath = path.join(process.cwd(), ".vitest-env.json");
if (existsSync(vitestEnvPath)) {
  const extra = JSON.parse(readFileSync(vitestEnvPath, "utf8")) as Record<string, string>;
  for (const [key, value] of Object.entries(extra)) {
    process.env[key] = value;
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set for tests");
}
