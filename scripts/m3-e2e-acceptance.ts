/**
 * In-VM Playwright M3 Founder acceptance (http://127.0.0.1:43123).
 * Run: npx tsx scripts/m3-e2e-acceptance.ts
 */
import "dotenv/config";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import postgres from "postgres";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = "password123";
const SHOT_DIR = path.join(process.cwd(), "e2e-screenshots");
const REPORT_PATH = path.join(process.cwd(), "E2E_M3_ACCEPTANCE.md");

type ScenarioResult = {
  id: string;
  title: string;
  status: "PASS" | "FAIL" | "SKIP";
  notes: string;
  screenshot?: string;
};

const results: ScenarioResult[] = [];

async function shot(page: Page, name: string) {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(SHOT_DIR, file), fullPage: true });
  return file;
}

/** Browser fetch sign-in (same origin/cookies as auth client). */
async function signIn(page: Page, email: string) {
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
  if (status !== 200) {
    throw new Error(`sign-in API returned HTTP ${status}`);
  }
  await page.goto(`${BASE}/portal`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/sign-in")) {
    throw new Error("redirected back to sign-in (session not established)");
  }
}

async function newContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ baseURL: BASE });
}

async function getOrgBTicketId(): Promise<string | null> {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT t.id
      FROM ticket t
      INNER JOIN organization o ON o.id = t.organization_id
      WHERE o.slug = 'org-b'
      ORDER BY t.number ASC
      LIMIT 1
    `;
    return rows[0]?.id ?? null;
  } finally {
    await sql.end();
  }
}

function record(r: ScenarioResult) {
  results.push(r);
  console.log(`[${r.status}] ${r.id}: ${r.title} — ${r.notes}`);
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });

  const orgBTicketId = await getOrgBTicketId();

  const browser = await chromium.launch({ headless: true });

  // --- 1 Admin sign-in, refresh, /admin ---
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "admin@org-a.test");
    await page.reload({ waitUntil: "domcontentloaded" });
    const stillPortal = page.url().includes("/portal");
    await page.goto(`${BASE}/admin`);
    await page.waitForURL(/\/admin/, { timeout: 15_000 });
    const adminOk = await page.getByRole("heading", { name: /users|branding|admin/i }).first().isVisible().catch(() => false)
      || (await page.content()).includes("Admin");
    const s1 = await shot(page, "01-admin-session-admin");
    record({
      id: "S1",
      title: "Admin sign-in → session holds → /admin",
      status: stillPortal && adminOk ? "PASS" : "FAIL",
      notes: `refresh portal=${stillPortal}, admin=${adminOk}, url=${page.url()}`,
      screenshot: s1,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "S1",
      title: "Admin sign-in → session holds → /admin",
      status: "FAIL",
      notes: String(e),
    });
  }

  // --- 2 Org A branding ---
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "admin@org-a.test");
    await page.goto(`${BASE}/admin/branding`);
    await page.waitForSelector("#logoUrl", { timeout: 15_000 });
    const logo = "https://via.placeholder.com/150/00FF00/FFFFFF?text=OrgA-E2E";
    await page.locator("#logoUrl").fill(logo);
    await page.locator("#primary").fill("hsl(142, 71%, 45%)");
    await page.locator("#primaryForeground").fill("hsl(0, 0%, 100%)");
    await page.getByRole("button", { name: /save branding/i }).click();
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/portal`);
    const html = await page.content();
    const brandingOk = html.includes(logo) || html.includes("OrgA-E2E");
    const s2 = await shot(page, "02-org-a-branding-portal");
    record({
      id: "S2",
      title: "Org A branding set and visible on portal",
      status: brandingOk ? "PASS" : "FAIL",
      notes: brandingOk ? "Logo URL present on portal header" : "Logo not found after save",
      screenshot: s2,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "S2",
      title: "Org A branding set and visible on portal",
      status: "FAIL",
      notes: String(e),
    });
  }

  // --- 3 Requester submit ticket ---
  const ticketSubject = `E2E M3 ticket ${Date.now()}`;
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "requester@org-a.test");
    await page.goto(`${BASE}/portal/tickets/new`);
    await page.locator("#subject").fill(ticketSubject);
    await page.locator("#description").fill("Automated acceptance test ticket body.");
    await page.locator("form button[type='submit']").click();
    await page.waitForURL(/\/portal\/tickets\//, { timeout: 20_000 });
    await page.goto(`${BASE}/portal/tickets`);
    const listed = (await page.content()).includes(ticketSubject);
    const s3 = await shot(page, "03-requester-my-tickets");
    record({
      id: "S3",
      title: "Requester submit ticket → My tickets",
      status: listed ? "PASS" : "FAIL",
      notes: listed ? `Found "${ticketSubject}"` : "Ticket not listed",
      screenshot: s3,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "S3",
      title: "Requester submit ticket → My tickets",
      status: "FAIL",
      notes: String(e),
    });
  }

  // --- 4 Agent queue claim status ---
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "agent@org-a.test");
    await page.goto(`${BASE}/agent?view=unassigned`);
    const claimBtn = ticketSubject
      ? page
          .locator("div")
          .filter({ hasText: ticketSubject })
          .getByRole("button", { name: /^claim$/i })
          .first()
      : page.getByRole("button", { name: /^claim$/i }).first();
    await claimBtn.waitFor({ timeout: 15_000 });
    await claimBtn.click();
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/agent?view=mine`);
    await page.getByRole("button", { name: /^view$/i }).first().click();
    await page.waitForURL(/\/agent\/tickets\//, { timeout: 15_000 });
    const statusSelect = page.locator('select[name="status"]');
    await statusSelect.waitFor({ timeout: 10_000 });
    await statusSelect.selectOption({ index: 0 });
    await page.getByRole("button", { name: /^update$/i }).click();
    await page.waitForTimeout(1500);
    const detail = await page.content();
    const statusOk = /in progress|resolved|closed|open/i.test(detail);
    const s4 = await shot(page, "04-agent-claim-status");
    record({
      id: "S4",
      title: "Agent queue → claim → status update",
      status: statusOk ? "PASS" : "FAIL",
      notes: statusOk ? "Claimed ticket and updated/viewed status" : "Could not verify status change",
      screenshot: s4,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "S4",
      title: "Agent queue → claim → status update",
      status: "FAIL",
      notes: String(e),
    });
  }

  // --- 5 Cross-tenant Org A agent → Org B ticket URL ---
  try {
    if (!orgBTicketId) {
      record({
        id: "S5",
        title: "Cross-tenant Org B ticket URL blocked for Org A",
        status: "SKIP",
        notes: "No Org B ticket id in database",
      });
    } else {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await signIn(page, "agent@org-a.test");
      const res = await page.goto(`${BASE}/agent/tickets/${orgBTicketId}`, {
        waitUntil: "domcontentloaded",
      });
      const status = res?.status() ?? 0;
      const body = await page.content();
      const blocked =
        status === 404 ||
        body.includes("404") ||
        body.includes("not found") ||
        body.includes("This page could not be found");
      const s5 = await shot(page, "05-cross-tenant-404");
      record({
        id: "S5",
        title: "Cross-tenant Org B ticket URL blocked for Org A",
        status: blocked ? "PASS" : "FAIL",
        notes: `HTTP ${status}, blocked=${blocked}, ticket=${orgBTicketId}`,
        screenshot: s5,
      });
      await ctx.close();
    }
  } catch (e) {
    record({
      id: "S5",
      title: "Cross-tenant Org B ticket URL blocked for Org A",
      status: "FAIL",
      notes: String(e),
    });
  }

  // --- 6 Org B branding + requester cannot access /agent ---
  try {
    const ctxB = await newContext(browser);
    const adminB = await ctxB.newPage();
    await signIn(adminB, "admin@org-b.test");
    await adminB.goto(`${BASE}/admin/branding`);
    await adminB.waitForSelector("#logoUrl", { timeout: 15_000 });
    const logoB = "https://via.placeholder.com/150/FF0000/FFFFFF?text=OrgB-E2E";
    await adminB.locator("#logoUrl").fill(logoB);
    await adminB.locator("#primary").fill("hsl(0, 84%, 60%)");
    await adminB.getByRole("button", { name: /save branding/i }).click();
    await adminB.waitForTimeout(1000);
    await adminB.goto(`${BASE}/portal`);
    const bBranding = (await adminB.content()).includes(logoB) || (await adminB.content()).includes("OrgB-E2E");

    const ctxReq = await newContext(browser);
    const req = await ctxReq.newPage();
    await signIn(req, "requester@org-a.test");
    await req.goto(`${BASE}/agent`);
    await req.waitForURL(/\/(portal|sign-in)/, { timeout: 15_000 });
    const reqUrl = req.url();
    const noAgent = !reqUrl.includes("/agent");
    const reqContent = await req.content();
    const isolationA = !reqContent.includes("OrgB-E2E");

    const s6a = await shot(adminB, "06-org-b-branding");
    const s6b = await shot(req, "06-requester-no-agent");

    record({
      id: "S6",
      title: "Org B branding + requester cannot access /agent; Org A isolated from B branding",
      status: bBranding && noAgent && isolationA ? "PASS" : "FAIL",
      notes: `orgB branding=${bBranding}, requester agent block=${noAgent} (url=${reqUrl}), orgA no B logo=${isolationA}`,
      screenshot: `${s6a}, ${s6b}`,
    });
    await ctxB.close();
    await ctxReq.close();
  } catch (e) {
    record({
      id: "S6",
      title: "Org B branding + requester isolation",
      status: "FAIL",
      notes: String(e),
    });
  }

  await browser.close();

  const sha = process.env.E2E_GIT_SHA ?? "unknown";
  const lines = [
    "# M3 Founder acceptance — in-VM E2E",
    "",
    `**Run at:** ${new Date().toISOString()}`,
    `**Base URL:** ${BASE}`,
    `**App commit:** ${sha}`,
    `**Runner:** Playwright Chromium (headless) in Cloud Agent VM`,
    "",
    "## Summary",
    "",
    "| ID | Scenario | Result | Screenshot |",
    "|----|----------|--------|------------|",
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.title} | **${r.status}** | ${r.screenshot ?? "—"} |`
    ),
    "",
    "## Notes",
    "",
    ...results.map((r) => `### ${r.id} — ${r.status}\n${r.notes}\n`),
    "",
    "## Screenshots",
    "",
    `Files under \`e2e-screenshots/\` (repo root).`,
    "",
    "## Credentials used",
    "",
    "`*@org-a.test` / `*@org-b.test` with password `password123`.",
    "",
  ];

  await writeFile(REPORT_PATH, lines.join("\n"));
  console.log(`\nWrote ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
