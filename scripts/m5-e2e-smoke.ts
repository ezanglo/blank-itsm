/**
 * M5 smoke: catalog order + KB search (http://127.0.0.1:43123)
 * Run: npx tsx scripts/m5-e2e-smoke.ts
 */
import "dotenv/config";
import { chromium } from "playwright";
import postgres from "postgres";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = "password123";

async function signIn(page: import("playwright").Page, email: string) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
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

async function getSoftwareCatalogId(): Promise<string> {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT c.id
      FROM catalog_item c
      INNER JOIN organization o ON o.id = c.organization_id
      WHERE o.slug = 'org-a' AND c.name = 'Software access'
      LIMIT 1
    `;
    if (!rows[0]?.id) throw new Error("Software access catalog item not found");
    return rows[0].id;
  } finally {
    await sql.end();
  }
}

async function main() {
  const catalogId = await getSoftwareCatalogId();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE });
  const page = await context.newPage();

  try {
    await signIn(page, "requester@org-a.test");
    await page.goto(`${BASE}/portal/knowledge?q=password`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Reset your password", { timeout: 15000 });

    await page.goto(`${BASE}/portal/catalog/${catalogId}`, { waitUntil: "domcontentloaded" });
    await page.fill('input[name="field_application"]', "Figma");
    await page.click('button:has-text("Submit request")');
    await page.waitForURL(/\/portal\/tickets\//, { timeout: 15000 });
    await page.waitForSelector("text=Service catalog:", { timeout: 10000 });

    console.log("M5 e2e smoke: PASS");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("M5 e2e smoke: FAIL", err);
  process.exit(1);
});
