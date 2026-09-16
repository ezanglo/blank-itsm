/**
 * M8 Automation — in-VM E2E acceptance (http://127.0.0.1:43123)
 * Run: npm run test:e2e:m8
 *
 * Covers M8_TESTER_BRIEF scenarios 1–5 (no Preview SSO).
 */
import "dotenv/config";
import { chromium, type Browser, type Page } from "playwright";
import { mkdir, writeFile, readdir } from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { ensureCredentialAccountForEmail } from "@/lib/auth/seed-credentials";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = "password123";
const RUN_ID = process.env.E2E_RUN_ID ?? String(Date.now());
const SHOT_DIR = path.join(process.cwd(), "e2e-screenshots", "m8");
const SUMMARY_PATH = path.join(process.cwd(), "reviews", "E2E_M8_ACCEPTANCE_SUMMARY.md");
const JSON_PATH = path.join(process.cwd(), "reviews", "E2E_M8_ACCEPTANCE_RESULT.json");
const EMAIL_MOCK_DIR = process.env.EMAIL_MOCK_DIR ?? path.join(process.cwd(), ".data", "email-outbox");

const RULE_CRUD = `E2E-M8-${RUN_ID}-CRUD`;
const RULE_ASSIGN = `E2E-M8-${RUN_ID}-ASSIGN`;
const RULE_NOTE = `E2E-M8-${RUN_ID}-NOTE`;
const RULE_ORG_B = `E2E-M8-${RUN_ID}-ORGB`;
const TICKET_SUBJECT = `E2E-M8-${RUN_ID}-assign-ticket`;
const NOTE_BODY = `E2E-M8-${RUN_ID}-internal-note`;

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
  return `e2e-screenshots/m8/${file}`;
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

async function createAssignmentRule(
  page: Page,
  name: string,
  sortOrder: number,
  ticketType: "incident" | "service_request",
  assigneeLabel = "Agent A"
) {
  await page.goto(`${BASE}/admin/automation/new`, { waitUntil: "domcontentloaded" });
  await page.locator("#name").fill(name);
  await page.locator("#sort_order").fill(String(sortOrder));
  await page.locator('select[name="kind"]').selectOption("assignment");
  await page.locator('select[name="cond_field"]').selectOption("type");
  await page.locator('select[name="cond_op"]').selectOption("eq");
  await page.locator('input[name="cond_value"]').fill(ticketType);
  await page.locator('select[name="action_type"]').selectOption("assign");
  await page.locator("#assignee_user_id").selectOption({ label: assigneeLabel });
  await page.getByRole("button", { name: "Create rule" }).click();
  await page.waitForURL(/\/admin\/automation$/, { timeout: 20_000 });
}

async function createTriggerNoteRule(page: Page, name: string) {
  await page.goto(`${BASE}/admin/automation/new`, { waitUntil: "domcontentloaded" });
  await page.locator("#name").fill(name);
  await page.locator('select[name="kind"]').selectOption("trigger");
  await page.locator('select[name="trigger"]').selectOption("ticket_created");
  await page.locator('select[name="cond_field"]').selectOption("type");
  await page.locator('select[name="cond_op"]').selectOption("eq");
  await page.locator('input[name="cond_value"]').fill("service_request");
  await page.locator('select[name="action_type"]').selectOption("add_internal_note");
  await page.locator("#note_body").fill(NOTE_BODY);
  await page.getByRole("button", { name: "Create rule" }).click();
  await page.waitForURL(/\/admin\/automation$/, { timeout: 20_000 });
}

async function createTriggerEmailRule(page: Page, name: string) {
  await page.goto(`${BASE}/admin/automation/new`, { waitUntil: "domcontentloaded" });
  await page.locator("#name").fill(name);
  await page.locator('select[name="kind"]').selectOption("trigger");
  await page.locator('select[name="trigger"]').selectOption("status_changed");
  await page.locator('input[name="trigger_to_status"]').fill("resolved");
  await page.locator('select[name="action_type"]').selectOption("enqueue_email");
  await page.locator('select[name="email_recipient"]').selectOption("requester");
  await page.getByRole("button", { name: "Create rule" }).click();
  await page.waitForURL(/\/admin\/automation$/, { timeout: 20_000 });
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
    "# M8 Automation rules — in-VM E2E acceptance summary",
    "",
    `**Overall:** ${overall} (${passed}/${total} checks)`,
    `**Run at:** ${new Date().toISOString()}`,
    `**E2E run id:** \`${RUN_ID}\``,
    `**Base URL:** ${BASE}`,
    `**App commit:** \`${sha}\``,
    `**Branch:** \`${branch}\``,
    "**Runner:** Playwright Chromium (headless); auth via `POST /api/auth/sign-in/email` with `credentials: include` (no Preview SSO).",
    "",
    "## Commands",
    "",
    "```bash",
    "git checkout cursor/automation-rules-m8-5d5d  # 5304c5b or later",
    "npm install --legacy-peer-deps",
    "npm run dev:db && npm run db:seed",
    "npm run dev   # port 43123",
    "npm run test:e2e:m8",
    "```",
    "",
    "## Scenario matrix (M8_TESTER_BRIEF 1–5)",
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
    "- Summary: `reviews/E2E_M8_ACCEPTANCE_SUMMARY.md`",
    "- Machine-readable: `reviews/E2E_M8_ACCEPTANCE_RESULT.json`",
    "- Screenshots: `e2e-screenshots/m8/*.png`",
    `- Mock email outbox: \`${EMAIL_MOCK_DIR}/*.eml\``,
    "",
    "## Credentials",
    "",
    "Seeded users `*@org-a.test` / `*@org-b.test` with password `password123`.",
    "",
  ].join("\n");

  await writeFile(SUMMARY_PATH, summary);

  const json = {
    milestone: "M8",
    overall,
    passed,
    total,
    runId: RUN_ID,
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
    "admin@org-a.test",
    "admin@org-b.test",
    "agent@org-a.test",
    "agent@org-b.test",
    "requester@org-a.test",
    "requester@org-b.test",
  ]) {
    await ensureCredentialAccountForEmail(email, PASSWORD);
  }

  const browser = await chromium.launch({ headless: true });
  let assignmentTicketUrl = "";

  // Brief §1 — Admin CRUD
  try {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await signIn(page, "admin@org-a.test");
    await page.goto(`${BASE}/admin/automation`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Automation rules" }).waitFor({ timeout: 15_000 });

    await createAssignmentRule(page, RULE_CRUD, -500, "incident");
    const html = await page.content();
    const listed = html.includes(RULE_CRUD);
    const s1 = await shot(page, "01-admin-automation-list");

    await createAssignmentRule(page, RULE_ASSIGN, -400, "incident");

    const editLink = page.getByRole("link", { name: "Edit" }).first();
    await editLink.click();
    await page.waitForURL(/\/admin\/automation\//, { timeout: 15_000 });
    const onEdit = (await page.content()).includes("Edit automation rule");
    const s2 = await shot(page, "02-admin-automation-edit");

    const ok = listed && onEdit;
    record({
      id: "M8-1",
      briefScenario: "1",
      title: "Admin CRUD /admin/automation",
      status: ok ? "PASS" : "FAIL",
      notes: ok
        ? `Created rules ${RULE_CRUD} and ${RULE_ASSIGN}; list and edit surfaces verified`
        : `listed=${listed}, edit=${onEdit}`,
      screenshot: s2,
      assertions: ok
        ? ["Automation list loads", `Rule ${RULE_CRUD} visible`, "Edit form reachable"]
        : [],
    });
    await ctx.close();
  } catch (e) {
    record({
      id: "M8-1",
      briefScenario: "1",
      title: "Admin CRUD /admin/automation",
      status: "FAIL",
      notes: String(e),
    });
  }

  // Brief §2 — Assignment on create + timeline attribution
  try {
    const reqCtx = await newContext(browser);
    const reqPage = await reqCtx.newPage();
    await signIn(reqPage, "requester@org-a.test");
    await reqPage.goto(`${BASE}/portal/tickets/new`, { waitUntil: "domcontentloaded" });
    await reqPage.locator('select[name="type"]').selectOption("incident");
    await reqPage.locator("#subject").fill(TICKET_SUBJECT);
    await reqPage.locator("#description").fill("M8 E2E assignment");
    await reqPage
      .getByRole("main")
      .getByRole("button", { name: "Submit Ticket", exact: true })
      .click();
    await reqPage.waitForURL(/\/portal\/tickets\//, { timeout: 20_000 });
    assignmentTicketUrl = reqPage.url();
    await reqCtx.close();

    const agCtx = await newContext(browser);
    const agPage = await agCtx.newPage();
    await signIn(agPage, "agent@org-a.test");
    const ticketPath = assignmentTicketUrl.replace(BASE, "");
    await agPage.goto(`${BASE}${ticketPath.replace("/portal/", "/agent/")}`, {
      waitUntil: "domcontentloaded",
    });
    await agPage.waitForTimeout(1200);
    const html = await agPage.content();
    const hasAgent = html.includes("Agent A");
    const hasAutomation = html.includes("Automation assigned") || html.includes("automation");
    const s = await shot(agPage, "03-assignment-timeline");
    const ok = hasAgent && hasAutomation;
    record({
      id: "M8-2",
      briefScenario: "2",
      title: "Assignment on create + timeline automation attribution",
      status: ok ? "PASS" : "FAIL",
      notes: ok
        ? `Ticket ${TICKET_SUBJECT} assigned to Agent A with automation attribution`
        : `hasAgent=${hasAgent}, hasAutomation=${hasAutomation}, url=${assignmentTicketUrl}`,
      screenshot: s,
      assertions: ok
        ? ["Assignee Agent A on agent ticket view", "Timeline mentions automation assignment"]
        : [],
    });
    await agCtx.close();
  } catch (e) {
    record({
      id: "M8-2",
      briefScenario: "2",
      title: "Assignment on create + timeline automation attribution",
      status: "FAIL",
      notes: String(e),
    });
  }

  // Brief §3 — Trigger → internal note and/or outbox email
  try {
    const emlBefore = await listEmlFiles();

    const adminCtx = await newContext(browser);
    const adminPage = await adminCtx.newPage();
    await signIn(adminPage, "admin@org-a.test");
    await createTriggerNoteRule(adminPage, RULE_NOTE);
    await createTriggerEmailRule(adminPage, `${RULE_NOTE}-email`);
    await adminCtx.close();

    const reqCtx = await newContext(browser);
    const reqPage = await reqCtx.newPage();
    await signIn(reqPage, "requester@org-a.test");
    await reqPage.goto(`${BASE}/portal/tickets/new`, { waitUntil: "domcontentloaded" });
    await reqPage.locator('select[name="type"]').selectOption("service_request");
    await reqPage.locator("#subject").fill(`E2E-M8-${RUN_ID}-sr-note`);
    await reqPage.locator("#description").fill("trigger internal note");
    await reqPage
      .getByRole("main")
      .getByRole("button", { name: "Submit Ticket", exact: true })
      .click();
    await reqPage.waitForURL(/\/portal\/tickets\//, { timeout: 20_000 });
    const srUrl = reqPage.url();
    await reqCtx.close();

    const agCtx = await newContext(browser);
    const agPage = await agCtx.newPage();
    await signIn(agPage, "agent@org-a.test");
    const agentSrUrl = srUrl.replace("/portal/tickets/", "/agent/tickets/");
    await agPage.goto(agentSrUrl, { waitUntil: "domcontentloaded" });
    await agPage.waitForTimeout(1000);
    const noteHtml = await agPage.content();
    const hasNote = noteHtml.includes(NOTE_BODY);

    if (assignmentTicketUrl) {
      const ticketId = assignmentTicketUrl.split("/").pop()!;
      await agPage.goto(`${BASE}/agent/tickets/${ticketId}`, { waitUntil: "domcontentloaded" });
      await agPage.locator('select[name="status"]').selectOption("in_progress");
      await agPage.getByRole("button", { name: "Update" }).click();
      await agPage.waitForTimeout(800);
      await agPage.locator('select[name="status"]').selectOption("resolved");
      await agPage.getByRole("button", { name: "Update" }).click();
      await agPage.waitForTimeout(1500);
    }

    const emlAfter = await listEmlFiles();
    const newEmails = emlAfter.length - emlBefore.length;
    const s = await shot(agPage, "04-trigger-note-email");
    const ok = hasNote && newEmails >= 1;
    record({
      id: "M8-3",
      briefScenario: "3",
      title: "Trigger → internal note and/or mock outbox email",
      status: ok ? "PASS" : "FAIL",
      notes: ok
        ? `Internal note visible to agent; ${newEmails} new .eml file(s) in mock outbox`
        : `hasNote=${hasNote}, newEmails=${newEmails}`,
      screenshot: s,
      assertions: ok
        ? ["Internal note from automation on SR create", "Email outbox received new message on resolve"]
        : [],
    });
    await agCtx.close();
  } catch (e) {
    record({
      id: "M8-3",
      briefScenario: "3",
      title: "Trigger → internal note and/or mock outbox email",
      status: "FAIL",
      notes: String(e),
    });
  }

  // Brief §4 — Authz
  try {
    const agentCtx = await newContext(browser);
    const agentPage = await agentCtx.newPage();
    await signIn(agentPage, "agent@org-a.test");
    await agentPage.goto(`${BASE}/admin/automation`, { waitUntil: "domcontentloaded" });
    await agentPage.waitForTimeout(800);
    const agentUrl = agentPage.url();
    const agentHtml = await agentPage.content();
    const agentBlocked =
      !agentUrl.includes("/admin/automation") ||
      agentHtml.includes("do not have permission") ||
      agentHtml.includes("Access denied");
    const s1 = await shot(agentPage, "05-agent-blocked");
    await agentCtx.close();

    const reqCtx = await newContext(browser);
    const reqPage = await reqCtx.newPage();
    await signIn(reqPage, "requester@org-a.test");
    await reqPage.goto(`${BASE}/admin/automation`, { waitUntil: "domcontentloaded" });
    await reqPage.waitForTimeout(800);
    const reqUrl = reqPage.url();
    const reqHtml = await reqPage.content();
    const reqBlocked =
      !reqUrl.includes("/admin/automation") ||
      reqHtml.includes("do not have permission") ||
      reqHtml.includes("Access denied");
    const s2 = await shot(reqPage, "06-requester-blocked");

    const ok = agentBlocked && reqBlocked;
    record({
      id: "M8-4",
      briefScenario: "4",
      title: "Authz: agent/requester cannot manage rules",
      status: ok ? "PASS" : "FAIL",
      notes: ok
        ? `Agent URL ${agentUrl}; requester URL ${reqUrl}`
        : `agentBlocked=${agentBlocked}, reqBlocked=${reqBlocked}`,
      screenshot: s2,
      assertions: ok
        ? ["Agent cannot access automation admin", "Requester cannot access automation admin"]
        : [],
    });
    await reqCtx.close();
  } catch (e) {
    record({
      id: "M8-4",
      briefScenario: "4",
      title: "Authz: agent/requester cannot manage rules",
      status: "FAIL",
      notes: String(e),
    });
  }

  // Brief §5 — Org A/B isolation
  try {
    const adminBCtx = await newContext(browser);
    const adminB = await adminBCtx.newPage();
    await signIn(adminB, "admin@org-b.test");
    await createAssignmentRule(adminB, RULE_ORG_B, 0, "incident", "Agent B");
    const orgBHtml = await adminB.content();
    const bSeesOwn = orgBHtml.includes(RULE_ORG_B);
    const bNoOrgA = !orgBHtml.includes(RULE_CRUD) && !orgBHtml.includes(RULE_ASSIGN);
    const s1 = await shot(adminB, "07-org-b-rules");
    await adminBCtx.close();

    const adminACtx = await newContext(browser);
    const adminA = await adminACtx.newPage();
    await signIn(adminA, "admin@org-a.test");
    await adminA.goto(`${BASE}/admin/automation`, { waitUntil: "domcontentloaded" });
    const orgAHtml = await adminA.content();
    const aNoOrgB = !orgAHtml.includes(RULE_ORG_B);
    const aSeesOwn = orgAHtml.includes(RULE_CRUD);
    const s2 = await shot(adminA, "08-org-a-isolation");
    const ok = bSeesOwn && bNoOrgA && aNoOrgB && aSeesOwn;
    record({
      id: "M8-5",
      briefScenario: "5",
      title: "Org A/B isolation",
      status: ok ? "PASS" : "FAIL",
      notes: ok
        ? `Org B rule ${RULE_ORG_B} not visible in Org A; Org A rules not in Org B list`
        : `bSeesOwn=${bSeesOwn}, bNoOrgA=${bNoOrgA}, aNoOrgB=${aNoOrgB}, aSeesOwn=${aSeesOwn}`,
      screenshot: s2,
      assertions: ok
        ? ["Org B admin sees only Org B rules", "Org A admin does not see Org B rule names"]
        : [],
    });
    await adminACtx.close();
  } catch (e) {
    record({
      id: "M8-5",
      briefScenario: "5",
      title: "Org A/B isolation",
      status: "FAIL",
      notes: String(e),
    });
  }

  await browser.close();
  await writeArtifacts();

  const failed = results.some((r) => r.status === "FAIL");
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
