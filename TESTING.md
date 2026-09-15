# Testing Guide for blank-itsm M3

This document provides comprehensive testing instructions for the M3 vertical slice implementation.

## Quick Start Testing

### 1. Setup (5 minutes)

```bash
# Start PostgreSQL
sudo service postgresql start

# Install dependencies
npm install

# Setup database
npm run db:push
npm run db:seed

# Start dev server
npm run dev
```

Visit `http://localhost:43123`

### 2. Run Automated Tests

```bash
npm test
```

Expected output: All 8 tests pass
- ISO-010: Ticket list isolation ✅
- ISO-011: Direct ID isolation ✅
- ISO-012: Portal isolation ✅
- ISO-060: Server-side tenant binding ✅
- ISO-061: Cross-tenant write blocked ✅
- ISO-BRAND: Branding isolation ✅

## Manual Testing Scenarios

### Scenario 1: Requester Happy Path (5 min)

**Goal**: Verify requester can submit and view tickets

1. Go to `/sign-up`
2. Create account: `requester@org-a.test` / password: `password123`
3. You should be redirected to portal home
4. Click "Submit New Ticket"
5. Fill form:
   - Type: Incident
   - Subject: "Cannot access email"
   - Description: "My email is not working"
   - Priority: High
6. Click "Submit Ticket"
7. Verify redirect to ticket detail page
8. Click "My Tickets" in nav
9. Verify your ticket appears in the list
10. Click ticket to view details

**Expected Results**:
- ✅ Ticket created with number #3 (after seed data)
- ✅ Ticket appears in "My Tickets"
- ✅ Ticket detail shows all information
- ✅ Status badge shows "Open"

### Scenario 2: Agent Queue & Claim (5 min)

**Goal**: Verify agent can view queue and claim tickets

1. Sign out (top right)
2. Sign up: `agent@org-a.test` / `password123`
3. You should see "Agent Workspace" button in nav
4. Click "Agent Workspace" or go to `/agent`
5. Verify "Unassigned" filter is active
6. You should see tickets including the one from Scenario 1
7. Click "Claim" on the requester's ticket
8. Click "My Tickets" filter
9. Verify ticket now appears in "My Tickets"
10. Click ticket to open detail
11. Verify "Update Status" dropdown appears
12. Select "In Progress" and click "Update"
13. Verify status changed

**Expected Results**:
- ✅ Unassigned tickets visible
- ✅ Claim functionality works
- ✅ Claimed ticket appears in "My Tickets"
- ✅ Status update works
- ✅ Status badge updates

### Scenario 3: Admin Branding (5 min)

**Goal**: Verify organization branding customization

1. Sign up: `admin@org-a.test` / `password123`
2. Click "Admin" in nav
3. Go to "Branding"
4. Set values:
   - Logo URL: `https://via.placeholder.com/150/00FF00/FFFFFF?text=Org+A`
   - Primary: `hsl(142, 71%, 45%)` (green)
   - Primary Foreground: `hsl(0, 0%, 100%)` (white)
5. Click "Save Branding"
6. Go back to Portal (click "Portal" in nav)
7. Verify green logo appears in header
8. Verify primary buttons are green

**Expected Results**:
- ✅ Branding saves successfully
- ✅ Logo appears in portal/agent headers
- ✅ Theme colors apply

### Scenario 4: Cross-Tenant Isolation (CRITICAL - 10 min)

**Goal**: Verify Org A users CANNOT access Org B data

#### Setup Organization B

1. Open incognito/private window
2. Sign up: `admin@org-b.test` / `password123`
3. Go to Admin → Branding
4. Set different branding:
   - Logo URL: `https://via.placeholder.com/150/FF0000/FFFFFF?text=Org+B`
   - Primary: `hsl(0, 84%, 60%)` (red)
5. Sign up: `agent@org-b.test` / `password123`
6. Submit a ticket as this agent
7. Note the ticket URL: `/agent/tickets/{TICKET_ID_B}`

#### Test Isolation

1. Switch back to Org A window
2. Sign in as `agent@org-a.test`
3. Go to Agent Queue
4. **Verify**: You only see Org A tickets (not Org B ticket)
5. Copy the Org B ticket URL from step 7
6. Try to access it directly by pasting URL
7. **Verify**: You get 404 page (not the ticket content)
8. Go to Portal
9. **Verify**: Org A branding appears (green, not red)
10. Switch to Org B window
11. **Verify**: Org B branding appears (red)

**Expected Results**:
- ✅ Org A agent cannot see Org B tickets in queue
- ✅ Direct URL to Org B ticket returns 404 for Org A user
- ✅ No Org B ticket information leaks in error message
- ✅ Each org sees only their own branding
- ✅ No cross-contamination of data

### Scenario 5: Permission Gates (5 min)

**Goal**: Verify role-based access control

1. Sign in as `requester@org-a.test`
2. Try to access `/agent` directly
3. **Verify**: Redirected to portal (or access denied)
4. Try to access `/admin` directly
5. **Verify**: Redirected to portal

6. Sign in as `agent@org-a.test`
7. Can access `/agent` ✅
8. Try to access `/admin`
9. **Verify**: Redirected or denied

10. Sign in as `admin@org-a.test`
11. Can access `/admin` ✅
12. Can access `/agent` ✅
13. Can access `/portal` ✅

**Expected Results**:
- ✅ Requesters cannot access agent/admin
- ✅ Agents cannot access admin
- ✅ Admins can access everything

### Scenario 6: User Invitation (5 min)

**Goal**: Verify invitation system

1. Sign in as `admin@org-a.test`
2. Go to Admin → Users
3. Click "Invite" form
4. Enter:
   - Email: `newuser@org-a.test`
   - Role: Agent
5. Click "Invite"
6. **Verify**: Invitation appears in console logs (M4: email would be sent)
7. **Verify**: User list updates
8. Note: In M3, invitation acceptance flow simplified (user signs up with invited email)

**Expected Results**:
- ✅ Invitation created
- ✅ Audit event logged
- ✅ User list shows pending invitation

### Scenario 7: Responsive Mobile (5 min)

**Goal**: Verify mobile usability

1. Open Chrome DevTools (F12)
2. Click device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Sign in as `requester@org-a.test`
5. Navigate through:
   - Portal home
   - Submit ticket
   - My tickets
   - Ticket detail
6. Sign in as `agent@org-a.test`
7. Navigate through:
   - Agent queue
   - Ticket detail

**Expected Results**:
- ✅ Portal fully usable on mobile
- ✅ Agent workspace usable (may be denser)
- ✅ No horizontal scrolling
- ✅ Buttons/forms touchable
- ✅ Text readable

## Automated Test Details

### Running Individual Tests

```bash
# Run specific test file
npm test tests/isolation.test.ts

# Run with UI
npm run test:ui
```

### Test Coverage

| Test | AC | Description | What It Validates |
|------|-----|-------------|-------------------|
| ISO-010 | AC-M3-010 | List isolation | Agent A lists tickets, only sees Org A |
| ISO-011 | AC-M3-011 | Direct ID 404 | Agent A gets Org B ticket by ID → null |
| ISO-012 | AC-M3-012 | Requester isolation | Requester only sees own tickets |
| ISO-060 | AC-M3-060 | Server-side binding | Create ignores forged orgId |
| ISO-061 | AC-M3-061 | Cross-tenant write | Agent A cannot claim Org B ticket |
| ISO-BRAND | AC-M3-021 | Branding isolation | Each org has separate branding |

### Expected Test Output

```
✓ tests/isolation.test.ts (8)
  ✓ Tenant Isolation Tests (8)
    ✓ ISO-010: Ticket list isolation (1)
      ✓ should only return tickets from agent's organization
    ✓ ISO-011: Direct ID isolation (negative) (2)
      ✓ should return null when agent A tries to access ticket B by ID
      ✓ should successfully get own org ticket
    ✓ ISO-012: Portal isolation (1)
      ✓ should only return requester's own tickets from their org
    ✓ ISO-060: Server-side tenant binding (1)
      ✓ should ignore forged organizationId in create ticket input
    ✓ ISO-061: Cross-tenant write blocked (2)
      ✓ should fail when agent A tries to claim ticket B
      ✓ should successfully claim own org ticket
    ✓ ISO-BRAND: Branding isolation (1)
      ✓ should return correct branding for each organization

Test Files  1 passed (1)
     Tests  8 passed (8)
```

## Troubleshooting

### Database Issues

```bash
# Reset database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS blank_itsm;"
sudo -u postgres psql -c "CREATE DATABASE blank_itsm;"
npm run db:push
npm run db:seed
```

### Port Already in Use

```bash
# Kill process on port 43123
lsof -ti:43123 | xargs kill -9

# Or change port in .env
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

Then run: `npm run dev -- -p 3000`

### Tests Failing

1. Ensure database is seeded: `npm run db:seed`
2. Check DATABASE_URL in .env
3. Verify PostgreSQL is running: `sudo service postgresql status`
4. Check seed data exists:
   ```bash
   sudo -u postgres psql blank_itsm -c "SELECT slug FROM organization;"
   ```

## Acceptance Checklist

Use this checklist for final M3 acceptance:

### Functional Requirements
- [ ] Users can sign up and sign in
- [ ] Requesters can submit tickets
- [ ] Requesters can view their tickets
- [ ] Agents can view queue (unassigned/mine)
- [ ] Agents can claim tickets
- [ ] Agents can update ticket status
- [ ] Admins can invite users
- [ ] Admins can customize branding
- [ ] Branding applies to portal/agent surfaces

### Security Requirements (CRITICAL)
- [ ] Cross-tenant ticket access returns 404
- [ ] Agent A cannot see Org B tickets in queue
- [ ] Agent A cannot modify Org B tickets
- [ ] Branding isolated per organization
- [ ] All automated isolation tests pass
- [ ] Audit events created for sensitive actions

### UX Requirements
- [ ] Portal usable on mobile
- [ ] Agent workspace usable on mobile (basic)
- [ ] Branding fallback to defaults when not set
- [ ] Clear error messages
- [ ] Responsive layouts

### Technical Requirements
- [ ] All migrations applied
- [ ] Seed script creates test data
- [ ] Automated tests pass
- [ ] Dev server starts without errors
- [ ] No console errors in browser

## M3 Exit Criteria

**M3 is complete when**:
1. ✅ All automated tests pass (`npm test`)
2. ✅ Manual test scenarios 1-7 pass
3. ✅ Security checklist items verified
4. ✅ README documents setup in ~15 min
5. ✅ Founder can run test script successfully

## Post-M3 / M4 Scope

Features intentionally deferred:
- Email delivery (invitation, notifications)
- Rich ticket timeline/comments
- SLA timers
- Attachments
- Knowledge base / catalog
- MSP operator UI
- Advanced reporting
