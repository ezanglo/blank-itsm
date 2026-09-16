# blank-itsm

Multi-tenant ITSM (IT Service Management) platform with secure tenant isolation, built with Next.js, TypeScript, PostgreSQL, and Better Auth.

## Features

- **Multi-tenant Architecture**: Secure row-level tenant isolation with automated tests
- **Role-Based Access Control**: Requester, Agent, and Admin roles with granular permissions
- **Ticket Management**: Create, list, view, and manage incident and service request tickets
- **Service Desk (M4)**: Ticket timeline with public replies vs internal notes, impact×urgency priority, SLA timers, local file attachments, and outbox email (mock transport in dev)
- **Catalog & Knowledge (M5)**: Admin service catalog CRUD, portal catalog orders → service_request tickets with optional single-approver workflow, knowledge articles (draft/published), portal KB search with ticket deflection, agent KB linking on reply/resolve
- **Admin & white-label (M6)**: Roles/permissions reference, hardened user role changes, SLA business-hours calendar and escalation email (mock outbox), branding live preview, org audit log browser
- **Reporting & ops visibility (M7)**: Org-scoped operations dashboard (backlog, volume, SLA counts, workload by assignee), CSV export for ticket lists, agent and admin surfaces
- **Automation rules (M8)**: Org-scoped assignment rules (first-match on create) and trigger rules (status change, public reply, SLA signals) with allowlisted conditions/actions, loop guard, admin UI at `/admin/automation`, email via outbox only
- **Agent Queue**: Unassigned and "My Tickets" views with claim/assign functionality
- **Organization Branding**: Customizable logos and theme colors per organization
- **Audit Trail**: Comprehensive audit logging for security-sensitive actions
- **Responsive Design**: Mobile-friendly portal and agent workspace

## Stack

- **Framework**: Next.js 16 with App Router + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth (email/password)
- **UI**: shadcn/ui with Tailwind CSS
- **Testing**: Vitest for automated isolation tests

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 16+
- npm or equivalent package manager

### Installation

1. **Clone the repository**

```bash
git clone https://origin.cursor.com/git/ezraanglo/blank-itsm.git
cd blank-itsm
```

Canonical repo: [cursor.com/codebase/ezraanglo/blank-itsm](https://cursor.com/codebase/ezraanglo/blank-itsm). The earlier temp slug `tmp-24caffaea01e301c` is superseded (see [FOUNDER_PREVIEW.md](./FOUNDER_PREVIEW.md)).

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and update if needed (defaults work for local development):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blank_itsm
BETTER_AUTH_SECRET=your-secret-key-change-this-in-production
BETTER_AUTH_URL=http://localhost:43123
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:43123
NODE_ENV=development
```

4. **Start PostgreSQL**

Using PostgreSQL service (Ubuntu/Debian):
```bash
sudo service postgresql start
sudo -u postgres psql -c "CREATE DATABASE blank_itsm;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

Or using Docker:
```bash
docker-compose up -d
```

5. **Run database migrations**

```bash
npm run db:push
# Apply RLS SQL for M4 tables (if not already applied)
psql "$DATABASE_URL" -f db/migrations/0005_m4_service_desk.sql
psql "$DATABASE_URL" -f db/migrations/0006_itsm_app_role.sql   # itsm_app role for RLS tests — see FOUNDER_PREVIEW.md
psql "$DATABASE_URL" -f db/migrations/0007_m5_catalog_knowledge.sql
psql "$DATABASE_URL" -f db/migrations/0008_m6_admin_sla.sql
psql "$DATABASE_URL" -f db/migrations/0009_m8_automation.sql
```

6. **Seed the database**

This creates:
- System roles and permissions
- Two test organizations (Org A and Org B)
- Test users for each organization
- Sample tickets for isolation testing

```bash
npm run db:seed
```

7. **Start the development server**

```bash
npm run dev
```

The application will be available at `http://localhost:43123`

## Test Accounts

After seeding, you can create accounts for these test users:

### Organization A
- Admin: `admin@org-a.test`
- Agent: `agent@org-a.test`
- Requester: `requester@org-a.test`

### Organization B
- Admin: `admin@org-b.test`
- Agent: `agent@org-b.test`
- Requester: `requester@org-b.test`

**Note**: Since Better Auth requires sign-up through the UI, you'll need to:
1. Go to `/sign-up`
2. Create accounts with the emails above
3. Use any password (min 8 characters)
4. The seed script has already set up the organizations and memberships

## Running Tests

### CI script

```bash
npm run ci
```

Runs ESLint, Vitest (embedded Postgres if `DATABASE_URL` is down, otherwise your local DB), and `next build`. GitHub Actions runs the same via [`.github/workflows/ci.yml`](.github/workflows/ci.yml) when the repo is mirrored to GitHub (Postgres 16 service, no Neon).

### Isolation Tests

Run the automated tenant isolation tests:

```bash
npm test
```

This runs tests covering:
- **ISO-010**: Ticket list isolation (Agent A only sees Org A tickets)
- **ISO-011**: Direct ID isolation (Agent A cannot access Org B ticket by ID)
- **ISO-012**: Portal isolation (Requester only sees own tickets)
- **ISO-060**: Server-side tenant binding (forged organizationId ignored)
- **ISO-061**: Cross-tenant write blocked (Agent A cannot modify Org B tickets)
- **ISO-BRAND**: Branding isolation (correct branding per organization)

All tests must pass before considering the application production-ready.

## Founder Test Script (~15 min)

Manual testing procedure for acceptance:

### 1. Admin Setup - Organization A

1. Sign up as `admin@org-a.test`
2. Go to Admin → Branding
3. Set a logo URL (e.g., `https://via.placeholder.com/150`)
4. Set primary color (e.g., `hsl(142, 71%, 45%)` for green)
5. Go to Admin → Users
6. Invite Agent: `agent@org-a.test`, role: Agent
7. Invite Requester: `requester@org-a.test`, role: Requester

### 2. Requester Workflow - Organization A

1. Sign up as `requester@org-a.test`
2. Verify Organization A branding appears (green theme)
3. Submit a new incident ticket
   - Type: Incident
   - Subject: "Cannot access email"
   - Description: "I cannot log into my email account"
   - Priority: High
4. Go to "My Tickets" - verify ticket appears
5. Click ticket to view details

### 3. Agent Workflow - Organization A

1. Sign up as `agent@org-a.test`
2. Go to Agent Workspace → Queue
3. Click "Unassigned" - verify requester's ticket appears
4. Click "Claim" on the ticket
5. Click "My Tickets" - verify ticket now appears there
6. Open ticket detail
7. Update status from "Open" to "In Progress"

### 4. Cross-Tenant Isolation Test (Negative)

1. Sign up as `agent@org-b.test` or `admin@org-b.test`
2. Go to Admin → Branding
3. Set different branding (e.g., red: `hsl(0, 84%, 60%)`)
4. Set different logo
5. Sign out and sign back in as Organization B user
6. Verify Organization B branding appears (red theme, NOT green)
7. Try to access Organization A ticket by direct URL `/agent/tickets/{ticket-id}` (should get 404)
8. Verify Agent workspace queue only shows Organization B tickets

### 5. Expected Results

- ✅ Organization-specific branding displays correctly
- ✅ Cross-tenant ticket access returns 404
- ✅ Agents only see tickets from their organization
- ✅ Requesters only see their own tickets
- ✅ Claim/assign functionality works
- ✅ Status transitions work
- ✅ Mobile layouts are usable

## Project Structure

```
blank-itsm/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth routes (sign-in, sign-up)
│   ├── portal/            # Requester portal
│   ├── agent/             # Agent workspace
│   └── admin/             # Admin area
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── auth/             # Auth forms
├── db/                    # Database
│   ├── schema/           # Drizzle schema definitions
│   ├── migrations/       # SQL migrations
│   └── seed.ts           # Seed script
├── lib/                   # Shared libraries
│   ├── auth/             # Auth context and helpers
│   ├── domain/           # Domain logic (ticket status)
│   └── repositories/     # Data access layer
└── tests/                 # Automated tests
    └── isolation.test.ts # Tenant isolation tests
```

## Security Features

### Tenant Isolation

- **Server-side Context**: Tenant ID derived from authenticated session only
- **Scoped Repositories**: All queries automatically filtered by organization
- **Permission Checks**: Server-side authorization on all protected operations
- **Audit Trail**: All sensitive actions logged with actor, timestamp, and metadata
- **Automated Tests**: Comprehensive isolation tests including negative cases

### Authorization

- **RBAC Model**: Role-based with fine-grained permissions
- **Fail-Closed**: Cross-tenant access returns 404 (no information leak)
- **Server-Side**: UI controls are UX only; all enforcement server-side

## Development

### Database Operations

```bash
# Generate migration from schema changes
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio

# Re-seed database
npm run db:seed
```

### Adding shadcn Components

```bash
npx shadcn@latest add <component-name>
```

## Architecture Decisions

- **ADR-001**: Row-level multi-tenancy (shared database, shared schema)
- **ADR-002**: RBAC with permission catalog for evolvable roles
- **ADR-003**: Drizzle ORM for type-safe database access

## M3 Acceptance Criteria Coverage

- ✅ **AC-M3-001**: Invite and sign-in flow
- ✅ **AC-M3-002**: Role gate (requester vs agent)
- ✅ **AC-M3-003**: Role gate (agent basics)
- ✅ **AC-M3-010**: Ticket list isolation
- ✅ **AC-M3-011**: Direct ID isolation
- ✅ **AC-M3-012**: Portal isolation
- ✅ **AC-M3-020–022**: Branding tokens and isolation
- ✅ **AC-M3-030–033**: Ticket create/list/detail/types
- ✅ **AC-M3-040**: Unassigned/mine filters
- ✅ **AC-M3-041**: Claim/assign-to-me
- ✅ **AC-M3-050–052**: Portal home and mobile usability
- ✅ **AC-M3-060–063**: Security foundation and automated tests

## M7 — Reporting verification (Reviewer → Tester)

1. Re-seed so `report:read` is on agent/admin roles: `npm run db:seed`
2. `npm test -- --run` — includes **RPT-010** (org isolation), **RPT-011** (all report paths + requester), **RPT-012** (CSV format), **RPT-013** (export HTTP 401/403 + tenant CSV)
3. `npm run dev` — sign in as `agent@org-a.test`, open **Agent → Reports** (`/agent/reports`)
4. Confirm backlog/volume/SLA cards and workload table; use **Export** buttons or `GET /api/reports/tickets/export?scope=open`
5. In-VM Tester evidence (no Preview SSO): `npm run test:e2e:m7` → `reviews/E2E_M7_ACCEPTANCE_SUMMARY.md`
6. Optional quick smoke: `npm run test:e2e:m7:smoke`

## M8 — Automation rules verification (Reviewer)

1. Apply migration `0009_m8_automation.sql` and re-seed (`npm run db:seed`) for `automation:manage` on Admin.
2. `npm test -- --run` — includes `tests/m8-automation.test.ts` (allowlist, first-match, org isolation, disable, outbox, internal notes, loop guard depth, audit).
3. `DATABASE_URL=... BETTER_AUTH_SECRET=... npm run build`
4. `npm run dev` — sign in as `admin@org-a.test`, open **Admin → Automation** (`/admin/automation`).
5. Create an assignment rule (incident → assign Agent A), then as `requester@org-a.test` create an incident and confirm assignee on agent ticket view + timeline automation attribution.

## License

MIT
