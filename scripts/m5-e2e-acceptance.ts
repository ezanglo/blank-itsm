/**
 * M5 in-VM Playwright acceptance (http://127.0.0.1:43123)
 * Run: npm run test:e2e:m5
 */
import "dotenv/config";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import postgres from "postgres";
import { execSync } from "child_process";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = "password123";
const SHOT_DIR = path.join(process.cwd(), "e2e-screenshots", "m5");
const REPORT_PATH = path.join(process.cwd(), "E2E_M5_ACCEPTANCE.md");

type ScenarioResult = {
  id: string;
  title: string;
  status: "PASS" | "FAIL" | "SKIP";
  notes: string;
  screenshot?: string;
};

const results: ScenarioResult[] = [];

function record(r: ScenarioResult) {
  results.push(r);
  console.log(`[${r.id}] ${r.status}: ${r.title}`);
}

async function shot(page: Page, name: string) {
  await mkdir(SHOT_DIR, { recursive: true });
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(SHOT_DIR, file), fullPage: true });
  return `m5/${file}`;
}

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
  if (status !== 200) throw new Error(`sign-in API returned HTTP ${status}`);
}

async function newContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ baseURL: BASE });
}

async function getCatalogId(name: string): Promise<string> {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT c.id FROM catalog_item c
      INNER JOIN organization o ON o.id = c.organization_id
      WHERE o.slug = 'org-a' AND c.name = ${name}
      LIMIT 1
    `;
    if (!rows[0]?.id) throw new Error(`catalog item ${name} not found`);
    return rows[0].id;
  } finally {
    await sql.end();
  }
}

async function getOrgBTicketId(): Promise<string | null> {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT t.id FROM ticket t
      INNER JOIN organization o ON o.id = t.organization_id
      WHERE o.slug = 'org-b'
      ORDER BY t.number ASC LIMIT 1
    `;
    return rows[0]?.id ?? null;
  } finally {
    await sql.end();
  }
}

async function getPublishedArticle(): Promise<{ id: string; title: string }> {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const rows = await sql<{ id: string; title: string }[]>`
      SELECT ka.id, ka.title FROM knowledge_article ka
      INNER JOIN organization o ON o.id = ka.organization_id
      WHERE o.slug = 'org-a' AND ka.status = 'published'
      LIMIT 1
    `;
    if (!rows[0]?.id) throw new Error("published article missing");
    return rows[0];
  } finally {
    await sql.end();
  }
}

function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function writeReport() {
  const passed = results.filter((r) => r.status === "PASS").length;
  const total = results.filter((r) => r.status !== "SKIP").length;
  const sha = gitSha();
  const branch = gitBranch();
  const lines = [
    "# M5 Catalog + Knowledge — in-VM E2E acceptance",
    "",
    `**Run at:** ${new Date().toISOString()}`,
    `**Base URL:** ${BASE}`,
    `**App commit:** \`${sha}\``,
    `**Branch:** \`${branch}\``,
    "**Runner:** Playwright Chromium (headless); dev server `npm run dev` on port 43123",
    `**Database:** \`${process.env.DATABASE_URL ?? "(not set)"}\``,
    "",
    "**Auth:** Browser `fetch` to `/api/auth/sign-in/email` with `credentials: include`.",
    "",
    "## M5 summary",
    "",
    `**${passed}/${total}** scenarios passed.`,
    "",
    "| ID | Scenario | Result | Screenshot |",
    "|----|----------|--------|------------|",
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.title} | **${r.status}** | ${r.screenshot ?? "—"} |`
    ),
    "",
    "## Evidence paths",
    "",
    "- Report: `E2E_M5_ACCEPTANCE.md` (this file)",
    "- Screenshots: `e2e-screenshots/m5/*.png`",
    "",
    "## Notes",
    "",
    ...results.map((r) => `### ${r.id} — ${r.status}\n${r.notes}\n`),
    "",
    "## Credentials",
    "",
    "`*@org-a.test` / `*@org-b.test` with password `password123`.",
    "",
  ];
  await writeFile(REPORT_PATH, lines.join("\n"));
  console.log(`\nWrote ${REPORT_PATH}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL required");
  }

  const browser = await chromium.launch({ headless: true });

  // M5-1 KB search
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "requester@org-a.test");
    await page.goto(`${BASE}/portal/knowledge?q=password`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Reset your password", { timeout: 15_000 });
    const s = await shot(page, "01-kb-search-password");
    record({
      id: "M5-1",
      title: "Portal KB search returns published article",
      status: "PASS",
      notes: "Search q=password shows Reset your password",
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M5-1",
      title: "Portal KB search returns published article",
      status: "FAIL",
      notes: String(e),
    });
  }

  // M5-2 Catalog order → service_request ticket
  try {
    const softwareId = await getCatalogId("Software access");
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "requester@org-a.test");
    await page.goto(`${BASE}/portal/catalog/${softwareId}`, { waitUntil: "domcontentloaded" });
    await page.fill('input[name="field_application"]', "Figma E2E");
    await page.click('button:has-text("Submit request")');
    await page.waitForURL(/\/portal\/tickets\//, { timeout: 15_000 });
    const content = await page.content();
    const ok = content.includes("Service catalog:") && content.includes("service");
    const s = await shot(page, "02-catalog-order-ticket");
    record({
      id: "M5-2",
      title: "Catalog order creates service_request ticket",
      status: ok ? "PASS" : "FAIL",
      notes: ok ? "Landed on ticket with Service catalog subject" : "Ticket detail missing catalog markers",
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M5-2",
      title: "Catalog order creates service_request ticket",
      status: "FAIL",
      notes: String(e),
    });
  }

  // M5-3 Approval workflow (laptop)
  try {
    const laptopId = await getCatalogId("New laptop");
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "requester@org-a.test");
    await page.goto(`${BASE}/portal/catalog/${laptopId}`, { waitUntil: "domcontentloaded" });
    await page.fill('textarea[name="field_justification"]', "E2E laptop approval test");
    await page.fill('input[name="field_department"]', "Engineering");
    await page.click('button:has-text("Submit request")');
    await page.waitForURL(/\/portal\/tickets\//, { timeout: 15_000 });
    const pending = (await page.content()).includes("Pending Approval");
    const ticketUrl = page.url();
    const sPending = await shot(page, "03a-pending-approval");

    await signIn(page, "admin@org-a.test");
    await page.goto(ticketUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Approve request" }).click();
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "domcontentloaded" });
    const approveGone = (await page.getByRole("button", { name: "Approve request" }).count()) === 0;
    const approved = approveGone;
    const sApproved = await shot(page, "03b-approved-open");
    record({
      id: "M5-3",
      title: "Single-approver catalog workflow (pending → approved)",
      status: pending && approved ? "PASS" : "FAIL",
      notes: `pending=${pending}, approveGone=${approveGone}`,
      screenshot: sApproved,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M5-3",
      title: "Single-approver catalog workflow (pending → approved)",
      status: "FAIL",
      notes: String(e),
    });
  }

  // M5-4 Agent KB link on public reply
  try {
    const article = await getPublishedArticle();
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "requester@org-a.test");
    await page.goto(`${BASE}/portal/tickets/new`);
    const subject = `E2E M5 KB link ${Date.now()}`;
    await page.locator("#subject").fill(subject);
    await page.locator("#description").fill("Ticket for KB link test");
    await page.locator("form button[type='submit']").click();
    await page.waitForURL(/\/portal\/tickets\//, { timeout: 20_000 });
    const ticketUrl = page.url();

    await signIn(page, "agent@org-a.test");
    await page.goto(ticketUrl.replace("/portal/", "/agent/"), { waitUntil: "domcontentloaded" });
    await page.locator("#public-body").fill("Please see the linked article.");
    const replyForm = page.locator("form").filter({ has: page.locator("#public-body") });
    await replyForm.locator('select[name="knowledgeArticleId"]').selectOption(article.id);
    await page.getByRole("button", { name: /send public reply/i }).click();
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "domcontentloaded" });
    const content = await page.content();
    const ok = content.includes("Linked knowledge articles") && content.includes(article.title);
    const s = await shot(page, "04-agent-kb-link-reply");
    record({
      id: "M5-4",
      title: "Agent links KB article on public reply",
      status: ok ? "PASS" : "FAIL",
      notes: ok ? `Linked panel shows ${article.title}` : "Linked knowledge articles panel missing title",
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M5-4",
      title: "Agent links KB article on public reply",
      status: "FAIL",
      notes: String(e),
    });
  }

  // M5-5 Cross-tenant ticket URL blocked
  try {
    const orgBTicket = await getOrgBTicketId();
    if (!orgBTicket) throw new Error("no org-b ticket");
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "agent@org-a.test");
    const res = await page.goto(`${BASE}/agent/tickets/${orgBTicket}`, {
      waitUntil: "domcontentloaded",
    });
    const status = res?.status() ?? 0;
    const blocked = status === 404 || (await page.content()).toLowerCase().includes("not found");
    const s = await shot(page, "05-cross-tenant-blocked");
    record({
      id: "M5-5",
      title: "Cross-tenant agent ticket URL blocked",
      status: blocked ? "PASS" : "FAIL",
      notes: `HTTP ${status}, blocked=${blocked}, ticket=${orgBTicket}`,
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M5-5",
      title: "Cross-tenant agent ticket URL blocked",
      status: "FAIL",
      notes: String(e),
    });
  }

  await browser.close();
  await writeReport();

  const failed = results.some((r) => r.status === "FAIL");
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
