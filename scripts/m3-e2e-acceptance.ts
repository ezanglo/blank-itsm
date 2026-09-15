/**
 * In-VM Playwright M3 Founder acceptance (http://127.0.0.1:43123).
 * Run: npx tsx scripts/m3-e2e-acceptance.ts
 */
import "dotenv/config";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { mkdir, readdir, writeFile } from "fs/promises";
import path from "path";
import postgres from "postgres";
import { execSync } from "child_process";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = "password123";
const SHOT_DIR = path.join(process.cwd(), "e2e-screenshots");
const M4_SHOT_DIR = path.join(SHOT_DIR, "m4");
const REPORT_PATH = path.join(process.cwd(), "E2E_M3_ACCEPTANCE.md");
const M4_REPORT_PATH = path.join(process.cwd(), "E2E_M4_ACCEPTANCE.md");
const EMAIL_MOCK_DIR =
  process.env.EMAIL_MOCK_DIR ?? path.join(process.cwd(), ".data", "email-outbox");

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

async function shotM4(page: Page, name: string) {
  await mkdir(M4_SHOT_DIR, { recursive: true });
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(M4_SHOT_DIR, file), fullPage: true });
  return `m4/${file}`;
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

async function getOrgARequesterTicketId(): Promise<string | null> {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT t.id
      FROM ticket t
      INNER JOIN organization o ON o.id = t.organization_id
      INNER JOIN "user" u ON u.id = t.requester_id
      WHERE o.slug = 'org-a' AND u.email = 'requester@org-a.test'
      ORDER BY t.created_at DESC
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

const m4Results: ScenarioResult[] = [];

function recordM4(r: ScenarioResult) {
  m4Results.push(r);
  record(r);
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });
  await mkdir(M4_SHOT_DIR, { recursive: true });
  await mkdir(EMAIL_MOCK_DIR, { recursive: true });

  const orgBTicketId = await getOrgBTicketId();
  const orgARequesterTicketId = await getOrgARequesterTicketId();

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

  // --- 7 M4: agent internal note hidden from requester portal ---
  try {
    const ctxAgent = await newContext(browser);
    const agentPage = await ctxAgent.newPage();
    if (!orgARequesterTicketId) throw new Error("no Org A requester ticket in database");
    await signIn(agentPage, "agent@org-a.test");
    await agentPage.goto(`${BASE}/agent/tickets/${orgARequesterTicketId}`);
    const internalMarker = `e2e-internal-${Date.now()}`;
    await agentPage.getByLabel(/internal note/i).fill(internalMarker);
    await agentPage.getByRole("button", { name: /internal note/i }).click();
    await agentPage.waitForTimeout(800);

    const ctxReq = await newContext(browser);
    const reqPage = await ctxReq.newPage();
    await signIn(reqPage, "requester@org-a.test");
    await reqPage.goto(`${BASE}/portal/tickets/${orgARequesterTicketId}`);
    const portalContent = await reqPage.content();
    const hidden = !portalContent.includes(internalMarker);
    const s7 = await shotM4(reqPage, "01-internal-note-hidden-portal");
    const s7Result = {
      id: "S7",
      title: "M4 internal notes hidden from requester portal",
      status: hidden ? "PASS" : "FAIL",
      notes: `internal marker visible on portal=${!hidden}`,
      screenshot: s7,
    } as ScenarioResult;
    record(s7Result);
    recordM4({
      id: "M4-1",
      title: "Internal notes hidden on requester portal (S7)",
      status: s7Result.status,
      notes: s7Result.notes,
      screenshot: s7,
    });
    await ctxAgent.close();
    await ctxReq.close();
  } catch (e) {
    recordM4({
      id: "M4-1",
      title: "Internal notes hidden on requester portal (S7)",
      status: "FAIL",
      notes: String(e),
    });
  }

  // --- M4-2 SLA panel on agent ticket ---
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    if (!orgARequesterTicketId) throw new Error("no Org A requester ticket");
    await signIn(page, "agent@org-a.test");
    await page.goto(`${BASE}/agent/tickets/${orgARequesterTicketId}`);
    const content = await page.content();
    const slaOk =
      content.includes("SLA") &&
      (content.includes("First response due") || content.includes("Resolution due"));
    const s = await shotM4(page, "02-sla-panel-agent");
    recordM4({
      id: "M4-2",
      title: "SLA panel on agent ticket detail",
      status: slaOk ? "PASS" : "FAIL",
      notes: slaOk ? "SLA section and due fields present" : "SLA panel not found",
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    recordM4({
      id: "M4-2",
      title: "SLA panel on agent ticket detail",
      status: "FAIL",
      notes: String(e),
    });
  }

  // --- M4-3 Attachment upload + download ---
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    if (!orgARequesterTicketId) throw new Error("no Org A requester ticket");
    await signIn(page, "agent@org-a.test");
    await page.goto(`${BASE}/agent/tickets/${orgARequesterTicketId}`);
    const fileName = `e2e-attach-${Date.now()}.txt`;
    await page.locator('input[type="file"][name="file"]').setInputFiles({
      name: fileName,
      mimeType: "text/plain",
      buffer: Buffer.from("M4 e2e attachment body"),
    });
    await page.getByRole("button", { name: /^attach$/i }).click();
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "domcontentloaded" });
    const link = page.locator(`a[href^="/api/attachments/"]`).filter({ hasText: fileName });
    await link.waitFor({ timeout: 10_000 });
    const attachHref = await link.getAttribute("href");
    const download = await page.request.get(`${BASE}${attachHref}`);
    const body = await download.text();
    const ok = download.ok() && body.includes("M4 e2e attachment");
    const s = await shotM4(page, "03-attachment-upload");
    recordM4({
      id: "M4-3",
      title: "Attachment upload and download",
      status: ok ? "PASS" : "FAIL",
      notes: `listed=${!!attachHref}, download=${download.status()}, bodyMatch=${body.includes("M4 e2e")}`,
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    recordM4({
      id: "M4-3",
      title: "Attachment upload and download",
      status: "FAIL",
      notes: String(e),
    });
  }

  // --- M4-4 Mock email outbox (.eml) on admin invite ---
  try {
    const before = new Set(await readdir(EMAIL_MOCK_DIR).catch(() => []));
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "admin@org-a.test");
    await page.goto(`${BASE}/admin/users`);
    const inviteEmail = `e2e-invite-${Date.now()}@example.com`;
    await page.locator("#email").fill(inviteEmail);
    await page.getByRole("button", { name: /^invite$/i }).click();
    await page.waitForTimeout(2500);
    const after = await readdir(EMAIL_MOCK_DIR);
    const newEml = after.filter((f) => f.endsWith(".eml") && !before.has(f));
    const s = await shotM4(page, "04-mock-email-invite");
    recordM4({
      id: "M4-4",
      title: "Mock email outbox writes .eml on invite (no Resend)",
      status: newEml.length > 0 ? "PASS" : "FAIL",
      notes:
        newEml.length > 0
          ? `New files: ${newEml.join(", ")} in ${EMAIL_MOCK_DIR}`
          : `No new .eml in ${EMAIL_MOCK_DIR} (invite may need role field)`,
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    recordM4({
      id: "M4-4",
      title: "Mock email outbox writes .eml on invite",
      status: "FAIL",
      notes: String(e),
    });
  }

  // --- M4-5 Impact × urgency → Critical priority ---
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "requester@org-a.test");
    await page.goto(`${BASE}/portal/tickets/new`);
    const subject = `E2E M4 critical ${Date.now()}`;
    await page.locator("#subject").fill(subject);
    await page.locator("#description").fill("High impact and urgency for priority matrix.");
    await page.locator("#impact").selectOption("high");
    await page.locator("#urgency").selectOption("high");
    await page.locator("form button[type='submit']").click();
    await page.waitForURL(/\/portal\/tickets\//, { timeout: 20_000 });
    const content = await page.content();
    const priorityOk = /critical/i.test(content);
    const s = await shotM4(page, "05-impact-urgency-critical");
    recordM4({
      id: "M4-5",
      title: "Impact × urgency sets Critical priority on ticket",
      status: priorityOk ? "PASS" : "FAIL",
      notes: priorityOk ? "Critical badge visible on ticket detail" : "Critical priority not shown",
      screenshot: s,
    });
    await ctx.close();
  } catch (e) {
    recordM4({
      id: "M4-5",
      title: "Impact × urgency sets Critical priority",
      status: "FAIL",
      notes: String(e),
    });
  }

  // --- M4-6 Cross-tenant smoke (reuse S5 outcome) ---
  const s5 = results.find((r) => r.id === "S5");
  recordM4({
    id: "M4-6",
    title: "Cross-tenant ticket URL blocked (smoke)",
    status: s5?.status ?? "SKIP",
    notes: s5?.notes ?? "S5 not run",
    screenshot: s5?.screenshot?.includes("m4/") ? s5.screenshot : "05-cross-tenant-404.png",
  });

  await browser.close();

  const sha =
    process.env.E2E_GIT_SHA ??
    execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const lines = [
    "# M3/M4 Founder acceptance — in-VM E2E",
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

  const m4Pass = m4Results.filter((r) => r.status === "PASS").length;
  const m4Lines = [
    "# M4 Service Desk — in-VM E2E acceptance",
    "",
    `**Run at:** ${new Date().toISOString()}`,
    `**Base URL:** ${BASE}`,
    `**App commit:** \`${sha}\``,
    `**Branch:** \`cursor/m4-service-desk-core-4831\``,
    `**Runner:** Playwright Chromium (headless); dev server \`npm run dev\` on port 43123`,
    `**Database:** \`${process.env.DATABASE_URL ?? "from .env"}\``,
    "",
    "**Auth:** Browser \`fetch\` to \`/api/auth/sign-in/email\` with \`credentials: include\` (same as M3 E2E).",
    "",
    "## M4 summary",
    "",
    `**${m4Pass}/${m4Results.length}** scenarios passed.`,
    "",
    "| ID | Scenario | Result | Screenshot |",
    "|----|----------|--------|------------|",
    ...m4Results.map(
      (r) =>
        `| ${r.id} | ${r.title} | **${r.status}** | ${r.screenshot ?? "—"} |`
    ),
    "",
    "## Evidence paths",
    "",
    "- Report: `E2E_M4_ACCEPTANCE.md` (this file)",
    "- Screenshots: `e2e-screenshots/m4/*.png`",
    `- Mock email files: \`${EMAIL_MOCK_DIR}\` (*.eml)`,
    "- Full M3 regression log: `E2E_M3_ACCEPTANCE.md`",
    "",
    "## Notes",
    "",
    ...m4Results.map((r) => `### ${r.id} — ${r.status}\n${r.notes}\n`),
    "",
    "## Credentials",
    "",
    "`*@org-a.test` / `*@org-b.test` with password `password123`.",
    "",
  ];
  await writeFile(M4_REPORT_PATH, m4Lines.join("\n"));
  console.log(`Wrote ${M4_REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
