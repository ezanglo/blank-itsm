/**
 * M7 reporting smoke (http://127.0.0.1:43123)
 * Run: npm run test:e2e:m7:smoke
 */
import "dotenv/config";
import { chromium } from "playwright";
import { execSync } from "child_process";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = "password123";

async function signIn(page: import("playwright").Page, email: string) {
  const status = await page.evaluate(
    async ({ email, password, origin }) => {
      const res = await fetch(`${origin}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      return res.status;
    },
    { email, password: PASSWORD, origin: BASE }
  );
  if (status !== 200) throw new Error(`sign-in failed HTTP ${status}`);
}

async function main() {
  const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  console.log(`M7 smoke @ ${sha}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE });
  const page = await context.newPage();

  await signIn(page, "agent@org-a.test");
  await page.goto(`${BASE}/agent/reports`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Operations dashboard" }).waitFor({
    timeout: 15_000,
  });

  const csvRes = await page.request.get(`${BASE}/api/reports/tickets/export?scope=open`);
  if (!csvRes.ok()) {
    throw new Error(`CSV export HTTP ${csvRes.status()}`);
  }
  const body = await csvRes.text();
  if (!body.includes("number,subject")) {
    throw new Error("CSV missing header row");
  }

  console.log("PASS: agent reports dashboard + CSV export");
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
