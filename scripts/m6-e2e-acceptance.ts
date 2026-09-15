/**
 * M6 E2E acceptance (http://127.0.0.1:43123)
 * Run: npm run test:e2e:m6
 */
import "dotenv/config";
import { chromium, type Browser, type Page } from "playwright";
import { mkdir, writeFile, readdir } from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = "password123";
const SHOT_DIR = path.join(process.cwd(), "e2e-screenshots", "m6");
const REPORT_PATH = path.join(process.cwd(), "E2E_M6_ACCEPTANCE.md");
const EMAIL_MOCK_DIR = process.env.EMAIL_MOCK_DIR ?? path.join(process.cwd(), ".data", "email-outbox");

type ScenarioResult = {
  id: string;
  title: string;
  status: "PASS" | "FAIL";
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
  return `m6/${file}`;
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

async function newContext(browser: Browser) {
  return browser.newContext({ baseURL: BASE });
}

async function listEmlFiles(): Promise<string[]> {
  try {
    const files = await readdir(EMAIL_MOCK_DIR);
    return files.filter((f) => f.endsWith(".eml")).sort();
  } catch {
    return [];
  }
}

async function writeReport() {
  const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  const passed = results.filter((r) => r.status === "PASS").length;
  const total = results.length;
  const lines = [
    "# M6 Admin & white-label — in-VM E2E acceptance",
    "",
    `**Run at:** ${new Date().toISOString()}`,
    `**Base URL:** ${BASE}`,
    `**App commit:** \`${sha}\``,
    `**Branch:** \`${branch}\``,
    "**Runner:** Playwright Chromium (headless); dev server `npm run dev` on port 43123",
    `**Database:** \`${process.env.DATABASE_URL ?? "(not set)"}\``,
    "",
    "**Auth:** Browser `fetch` to `/api/auth/sign-in/email` with `credentials: include` (Preview SSO not required).",
    "",
    "## M6 summary",
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
    "- Report: `E2E_M6_ACCEPTANCE.md` (this file)",
    "- Screenshots: `e2e-screenshots/m6/*.png`",
    `- Mock escalation mail: \`${EMAIL_MOCK_DIR}/*.eml\``,
    "",
    "## Notes",
    "",
    ...results.map((r) => `### ${r.id} — ${r.status}\n${r.notes}\n`),
    "",
    "## Credentials",
    "",
    "`*@org-a.test` with password `password123` (admin for SLA/branding/audit/roles).",
    "",
  ];
  await writeFile(REPORT_PATH, lines.join("\n"));
  console.log(`\nWrote ${REPORT_PATH}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[m6-e2e] DATABASE_URL not set; SLA escalation file check may be limited");
  }

  const browser = await chromium.launch({ headless: true });

  // M6-1 Draft KB hidden
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "requester@org-a.test");
    await page.goto(`${BASE}/portal/knowledge?q=VPN`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const content = await page.content();
    const showsDraft = content.includes("VPN troubleshooting draft");
    const s = await shot(page, "01-draft-kb-hidden");
    record({
      id: "M6-1",
      title: "Draft KB article not listed in portal search",
      status: !showsDraft ? "PASS" : "FAIL",
      notes: showsDraft ? "Draft title visible in search" : "Draft title not in portal search HTML",
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M6-1",
      title: "Draft KB article not listed in portal search",
      status: "FAIL",
      notes: String(e),
    });
  }

  // M6-2 Roles page
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "admin@org-a.test");
    await page.goto(`${BASE}/admin/roles`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Roles & permissions", { timeout: 15_000 });
    const ok =
      (await page.locator("text=Permission reference").count()) > 0 &&
      (await page.locator("text=admin:access").count()) > 0;
    const s = await shot(page, "02-admin-roles");
    record({
      id: "M6-2",
      title: "Admin roles & permissions reference loads",
      status: ok ? "PASS" : "FAIL",
      notes: ok ? "System roles and permission keys visible" : "Expected role matrix content missing",
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M6-2",
      title: "Admin roles & permissions reference loads",
      status: "FAIL",
      notes: String(e),
    });
  }

  // M6-3 Branding live preview
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "admin@org-a.test");
    await page.goto(`${BASE}/admin/branding`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Live preview", { timeout: 15_000 });
    await page.fill("#primary", "hsl(280, 70%, 45%)");
    await page.waitForTimeout(300);
    const previewBtn = page.locator("button", { hasText: "Submit ticket" });
    const ok = (await previewBtn.count()) > 0;
    const s = await shot(page, "03-branding-preview");
    record({
      id: "M6-3",
      title: "Branding admin with live preview",
      status: ok ? "PASS" : "FAIL",
      notes: ok ? "Preview panel and sample button rendered" : "Live preview UI missing",
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M6-3",
      title: "Branding admin with live preview",
      status: "FAIL",
      notes: String(e),
    });
  }

  // M6-4 Audit log browser
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "admin@org-a.test");
    await page.goto(`${BASE}/admin/audit`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Audit log", { timeout: 15_000 });
    const hasTable = (await page.locator("table").count()) > 0;
    const hasEvent =
      (await page.locator("text=ticket.created").count()) > 0 ||
      (await page.locator("text=branding.updated").count()) > 0 ||
      (await page.locator("text=user.invited").count()) > 0;
    const ok = hasTable && hasEvent;
    const s = await shot(page, "04-audit-log");
    record({
      id: "M6-4",
      title: "Admin audit event browser",
      status: ok ? "PASS" : "FAIL",
      notes: ok
        ? "Audit table shows at least one known action"
        : `table=${hasTable}, knownAction=${hasEvent}`,
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M6-4",
      title: "Admin audit event browser",
      status: "FAIL",
      notes: String(e),
    });
  }

  // M6-5 SLA test escalation → mock .eml
  try {
    const before = await listEmlFiles();
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "admin@org-a.test");
    await page.goto(`${BASE}/admin/sla`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=SLA & Business Hours", { timeout: 15_000 });

    const email = `sla-e2e-${Date.now()}@org-a.test`;
    await page.fill("#escalationEmail", email);
    await page.getByRole("button", { name: "Save SLA settings" }).click();
    await page.waitForTimeout(1200);

    await page.getByRole("button", { name: "Send test escalation" }).click();
    await page.waitForTimeout(2000);

    const after = await listEmlFiles();
    const newFiles = after.filter((f) => !before.includes(f));
    let emlOk = false;
    let emlNote = "";
    if (newFiles.length > 0) {
      const { readFile } = await import("fs/promises");
      const latest = newFiles[newFiles.length - 1];
      const body = await readFile(path.join(EMAIL_MOCK_DIR, latest), "utf8");
      emlOk =
        body.includes(email) &&
        (body.includes("SLA escalation") || body.includes("sla_escalation"));
      emlNote = `new file ${latest}`;
    } else if (after.length > before.length) {
      const { readFile } = await import("fs/promises");
      const latest = after[after.length - 1];
      const body = await readFile(path.join(EMAIL_MOCK_DIR, latest), "utf8");
      emlOk = body.includes(email);
      emlNote = `latest ${latest}`;
    } else {
      emlNote = "no new .eml in mock outbox";
    }

    const s = await shot(page, "05-sla-escalation-test");
    record({
      id: "M6-5",
      title: "SLA admin sends test escalation to mock outbox",
      status: emlOk ? "PASS" : "FAIL",
      notes: emlOk
        ? `Mock .eml written (${emlNote}) with escalation subject/body`
        : emlNote,
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M6-5",
      title: "SLA admin sends test escalation to mock outbox",
      status: "FAIL",
      notes: String(e),
    });
  }

  await browser.close();
  await writeReport();

  if (results.some((r) => r.status === "FAIL")) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
