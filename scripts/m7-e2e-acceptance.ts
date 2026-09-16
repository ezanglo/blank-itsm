/**
 * M7 Reporting — in-VM E2E acceptance (http://127.0.0.1:43123)
 * Run: npm run test:e2e:m7
 *
 * Covers tasks/M7_TESTER_BRIEF.md scenarios 1–4 without Preview SSO.
 */
import "dotenv/config";
import { chromium, type Browser, type Page } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { ensureCredentialAccountForEmail } from "@/lib/auth/seed-credentials";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = "password123";
const SHOT_DIR = path.join(process.cwd(), "e2e-screenshots", "m7");
const SUMMARY_PATH = path.join(process.cwd(), "reviews", "E2E_M7_ACCEPTANCE_SUMMARY.md");
const JSON_PATH = path.join(process.cwd(), "reviews", "E2E_M7_ACCEPTANCE_RESULT.json");

const ORG_A_SUBJECT = "Cannot access email";
const ORG_B_SUBJECT = "Network issue";

type ScenarioResult = {
  id: string;
  briefScenario: string;
  title: string;
  status: "PASS" | "FAIL";
  notes: string;
  screenshot?: string;
  assertions?: string[];
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
  return `e2e-screenshots/m7/${file}`;
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

function parseCsvDataRows(csv: string): string[] {
  const lines = csv.trim().split(/\r?\n/);
  return lines.length > 1 ? lines.slice(1) : [];
}

async function writeArtifacts() {
  const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  const passed = results.filter((r) => r.status === "PASS").length;
  const total = results.length;
  const overall = passed === total ? "PASS" : "FAIL";

  await mkdir(path.dirname(SUMMARY_PATH), { recursive: true });

  const matrix = [
    "| Brief | ID | Scenario | Result | Screenshot |",
    "|-------|-----|----------|--------|------------|",
    ...results.map(
      (r) =>
        `| ${r.briefScenario} | ${r.id} | ${r.title} | **${r.status}** | ${r.screenshot ?? "—"} |`
    ),
  ].join("\n");

  const summary = [
    "# M7 Reporting — in-VM E2E acceptance summary",
    "",
    `**Overall:** ${overall} (${passed}/${total} checks)`,
    `**Run at:** ${new Date().toISOString()}`,
    `**Base URL:** ${BASE}`,
    `**App commit:** \`${sha}\``,
    `**Branch:** \`${branch}\``,
    "**Runner:** Playwright Chromium (headless); auth via `POST /api/auth/sign-in/email` with `credentials: include` (no Preview SSO).",
    "",
    "## Commands",
    "",
    "```bash",
    "git checkout cursor/m7-reporting-e542  # ffe0acd or later on branch",
    "npm install --legacy-peer-deps",
    "npm run db:seed",
    "npm run dev   # port 43123",
    "npm run test:e2e:m7",
    "npm test -- --run   # optional unit/RPT suite",
    "```",
    "",
    "## Scenario matrix (M7_TESTER_BRIEF 1–4)",
    "",
    matrix,
    "",
    "## Per-scenario notes",
    "",
    ...results.map((r) => {
      const asserts =
        r.assertions && r.assertions.length > 0
          ? `\n\nAssertions:\n${r.assertions.map((a) => `- ${a}`).join("\n")}`
          : "";
      return `### ${r.id} (Brief §${r.briefScenario}) — ${r.status}\n\n${r.title}\n\n${r.notes}${asserts}\n`;
    }),
    "",
    "## Artifact paths",
    "",
    `- This summary: \`reviews/E2E_M7_ACCEPTANCE_SUMMARY.md\``,
    `- Machine-readable: \`reviews/E2E_M7_ACCEPTANCE_RESULT.json\``,
    `- Screenshots: \`e2e-screenshots/m7/*.png\``,
    "",
    "## Credentials",
    "",
    "Seeded users `*@org-a.test` / `*@org-b.test` with password `password123`.",
    "",
  ].join("\n");

  await writeFile(SUMMARY_PATH, summary);

  const json = {
    milestone: "M7",
    overall,
    passed,
    total,
    runAt: new Date().toISOString(),
    baseUrl: BASE,
    commit: sha,
    branch,
    scenarios: results.map((r) => ({
      id: r.id,
      briefScenario: r.briefScenario,
      title: r.title,
      status: r.status,
      notes: r.notes,
      screenshot: r.screenshot,
      assertions: r.assertions ?? [],
    })),
  };
  await writeFile(JSON_PATH, JSON.stringify(json, null, 2) + "\n");
  console.log(`\nWrote ${SUMMARY_PATH}`);
  console.log(`Wrote ${JSON_PATH}`);
}

async function main() {
  for (const email of [
    "agent@org-a.test",
    "agent@org-b.test",
    "admin@org-a.test",
    "requester@org-a.test",
  ]) {
    await ensureCredentialAccountForEmail(email, PASSWORD);
  }

  const browser = await chromium.launch({ headless: true });

  // Brief §1 — Agent dashboard
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "agent@org-a.test");
    await page.goto(`${BASE}/agent/reports`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Operations dashboard" }).waitFor({
      timeout: 15_000,
    });
    const html = await page.content();
    const assertions = [
      html.includes("Open backlog"),
      html.includes("Volume (7 days)"),
      html.includes("SLA attention"),
      html.includes("SLA breached"),
      html.includes("Workload by assignee"),
      html.includes("Ticket list"),
      html.includes(ORG_A_SUBJECT),
      !html.includes(ORG_B_SUBJECT),
    ];
    const labels = [
      "Open backlog card present",
      "Volume card present",
      "SLA attention card present",
      "SLA breached card present",
      "Workload table present",
      "Ticket list table present",
      `Org A subject "${ORG_A_SUBJECT}" in table`,
      `Org B subject "${ORG_B_SUBJECT}" absent`,
    ];
    const ok = assertions.every(Boolean);
    const s = await shot(page, "01-agent-reports-dashboard");
    record({
      id: "M7-1a",
      briefScenario: "1",
      title: "Agent /agent/reports org-scoped dashboard",
      status: ok ? "PASS" : "FAIL",
      notes: ok
        ? "Dashboard sections and org-scoped ticket table verified"
        : `Failed checks: ${labels.filter((_, i) => !assertions[i]).join("; ")}`,
      screenshot: s,
      assertions: labels.filter((_, i) => assertions[i]),
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M7-1a",
      briefScenario: "1",
      title: "Agent /agent/reports org-scoped dashboard",
      status: "FAIL",
      notes: String(e),
    });
  }

  // Brief §1 — Admin dashboard
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "admin@org-a.test");
    await page.goto(`${BASE}/admin/reports`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Operations dashboard" }).waitFor({
      timeout: 15_000,
    });
    const html = await page.content();
    const ok =
      html.includes("Export all tickets (CSV)") &&
      html.includes(ORG_A_SUBJECT) &&
      !html.includes(ORG_B_SUBJECT);
    const s = await shot(page, "02-admin-reports-dashboard");
    record({
      id: "M7-1b",
      briefScenario: "1",
      title: "Admin /admin/reports org-scoped dashboard",
      status: ok ? "PASS" : "FAIL",
      notes: ok
        ? "Admin reports surface matches agent metrics with export controls"
        : "Missing export controls or wrong tenant data on admin reports",
      screenshot: s,
      assertions: ok
        ? ["Operations dashboard", "CSV export controls", "Org A-only subjects"]
        : [],
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M7-1b",
      briefScenario: "1",
      title: "Admin /admin/reports org-scoped dashboard",
      status: "FAIL",
      notes: String(e),
    });
  }

  // Brief §2 — CSV export
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "agent@org-a.test");

    const allRes = await page.request.get(`${BASE}/api/reports/tickets/export?scope=all`);
    const allCsv = await allRes.text();
    const allOk =
      allRes.ok() &&
      allCsv.startsWith("number,subject") &&
      allCsv.includes(ORG_A_SUBJECT);

    const openRes = await page.request.get(`${BASE}/api/reports/tickets/export?scope=open`);
    const openCsv = await openRes.text();
    const openRows = parseCsvDataRows(openCsv);
    const openOk =
      openRes.ok() &&
      openCsv.startsWith("number,subject") &&
      openRows.length > 0 &&
      openRows.every(
        (line) => !/,resolved,/.test(line) && !/,closed,/.test(line)
      );

    const ok = allOk && openOk;
    record({
      id: "M7-2",
      briefScenario: "2",
      title: "CSV export scope=all and scope=open",
      status: ok ? "PASS" : "FAIL",
      notes: ok
        ? `all HTTP ${allRes.status()}, open HTTP ${openRes.status()}; open data rows=${openRows.length}`
        : `allOk=${allOk}, openOk=${openOk}, allStatus=${allRes.status()}, openStatus=${openRes.status()}`,
      assertions: [
        "GET export?scope=all returns 200 CSV with header",
        "GET export?scope=open returns 200 without resolved/closed rows",
      ],
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M7-2",
      briefScenario: "2",
      title: "CSV export scope=all and scope=open",
      status: "FAIL",
      notes: String(e),
    });
  }

  // Brief §3 — Requester authz
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "requester@org-a.test");

    const exportRes = await page.request.get(`${BASE}/api/reports/tickets/export?scope=all`);
    const exportForbidden = exportRes.status() === 403;

    await page.goto(`${BASE}/agent/reports`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const agentUrl = page.url();
    const agentBlocked =
      !agentUrl.includes("/agent/reports") ||
      !(await page.getByRole("heading", { name: "Operations dashboard" }).count());

    await page.goto(`${BASE}/admin/reports`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const adminUrl = page.url();
    const adminBlocked =
      !adminUrl.includes("/admin/reports") ||
      !(await page.getByRole("heading", { name: "Operations dashboard" }).count());

    const s = await shot(page, "03-requester-blocked");
    const ok = exportForbidden && agentBlocked && adminBlocked;
    record({
      id: "M7-3",
      briefScenario: "3",
      title: "Requester denied reports UI and export (no report:read)",
      status: ok ? "PASS" : "FAIL",
      notes: ok
        ? `Export HTTP 403; agent URL ${agentUrl}; admin URL ${adminUrl} (no dashboard)`
        : `export=${exportRes.status()}, agentBlocked=${agentBlocked}, adminBlocked=${adminBlocked}`,
      screenshot: s,
      assertions: [
        "Export API returns 403",
        "Cannot view Operations dashboard on /agent/reports",
        "Cannot view Operations dashboard on /admin/reports",
      ],
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M7-3",
      briefScenario: "3",
      title: "Requester denied reports UI and export (no report:read)",
      status: "FAIL",
      notes: String(e),
    });
  }

  // Brief §4 — Isolation
  try {
    const ctxA = await newContext(browser);
    const pageA = await ctxA.newPage();
    await signIn(pageA, "agent@org-a.test");
    const resA = await pageA.request.get(`${BASE}/api/reports/tickets/export?scope=all`);
    const csvA = await resA.text();

    const ctxB = await newContext(browser);
    const pageB = await ctxB.newPage();
    await signIn(pageB, "agent@org-b.test");
    const resB = await pageB.request.get(`${BASE}/api/reports/tickets/export?scope=all`);
    const csvB = await resB.text();

    const aOk =
      resA.ok() && csvA.includes(ORG_A_SUBJECT) && !csvA.includes(ORG_B_SUBJECT);
    const bOk =
      resB.ok() && csvB.includes(ORG_B_SUBJECT) && !csvB.includes(ORG_A_SUBJECT);

    await pageA.goto(`${BASE}/agent/reports`, { waitUntil: "domcontentloaded" });
    const htmlA = await pageA.content();
    const pageAOk = htmlA.includes(ORG_A_SUBJECT) && !htmlA.includes(ORG_B_SUBJECT);

    const s = await shot(pageA, "04-org-a-isolation");
    const ok = aOk && bOk && pageAOk;
    record({
      id: "M7-4",
      briefScenario: "4",
      title: "Org A/B CSV and dashboard isolation",
      status: ok ? "PASS" : "FAIL",
      notes: ok
        ? "Org A and Org B exports and dashboard contain only tenant subjects"
        : `csvA=${aOk}, csvB=${bOk}, pageA=${pageAOk}`,
      screenshot: s,
      assertions: [
        `Org A CSV contains "${ORG_A_SUBJECT}" not "${ORG_B_SUBJECT}"`,
        `Org B CSV contains "${ORG_B_SUBJECT}" not "${ORG_A_SUBJECT}"`,
        "Org A dashboard HTML matches CSV isolation",
      ],
    });
    await ctxA.close();
    await ctxB.close();
  } catch (e) {
    record({
      id: "M7-4",
      briefScenario: "4",
      title: "Org A/B CSV and dashboard isolation",
      status: "FAIL",
      notes: String(e),
    });
  }

  await browser.close();
  await writeArtifacts();

  if (results.some((r) => r.status === "FAIL")) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
