import "dotenv/config";
import { db } from "./index";
import {
  user,
  organization,
  organizationMembership,
  role,
  permission,
  rolePermission,
  ticket,
} from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create permissions
  console.log("Creating permissions...");
  const permissionsData = [
    { key: "ticket:create", name: "Create Ticket", description: "Can create tickets" },
    {
      key: "ticket:read_own",
      name: "Read Own Tickets",
      description: "Can read own tickets",
    },
    {
      key: "ticket:read_org",
      name: "Read Organization Tickets",
      description: "Can read all organization tickets",
    },
    { key: "ticket:claim", name: "Claim Ticket", description: "Can claim/assign tickets" },
    {
      key: "ticket:update_status",
      name: "Update Ticket Status",
      description: "Can update ticket status",
    },
    { key: "ticket:assign", name: "Assign Ticket", description: "Can assign tickets" },
    { key: "user:invite", name: "Invite User", description: "Can invite users" },
    {
      key: "user:role_change",
      name: "Change User Role",
      description: "Can change user roles",
    },
    {
      key: "branding:write",
      name: "Update Branding",
      description: "Can update organization branding",
    },
    {
      key: "branding:read",
      name: "Read Branding",
      description: "Can read organization branding",
    },
    { key: "audit:read", name: "Read Audit Log", description: "Can read audit logs" },
    {
      key: "admin:access",
      name: "Admin Access",
      description: "Can access admin area",
    },
    { key: "agent:access", name: "Agent Access", description: "Can access agent area" },
    {
      key: "portal:access",
      name: "Portal Access",
      description: "Can access requester portal",
    },
  ];

  const insertedPermissions = await db
    .insert(permission)
    .values(permissionsData)
    .onConflictDoNothing()
    .returning();

  const permissionMap = new Map(insertedPermissions.map((p) => [p.key, p.id]));

  // Create system roles
  console.log("Creating roles...");
  const rolesData = [
    { key: "requester", name: "Requester", description: "Can submit and view own tickets" },
    {
      key: "agent",
      name: "Agent",
      description: "Can manage tickets and help requesters",
    },
    {
      key: "admin",
      name: "Admin",
      description: "Full administrative access",
    },
  ];

  const insertedRoles = await db
    .insert(role)
    .values(rolesData)
    .onConflictDoNothing()
    .returning();

  const roleMap = new Map(insertedRoles.map((r) => [r.key, r.id]));

  // Create role-permission mappings
  console.log("Creating role-permission mappings...");
  const rolePermissionsData = [
    // Requester permissions
    { roleKey: "requester", permissionKey: "ticket:create" },
    { roleKey: "requester", permissionKey: "ticket:read_own" },
    { roleKey: "requester", permissionKey: "portal:access" },
    { roleKey: "requester", permissionKey: "branding:read" },

    // Agent permissions
    { roleKey: "agent", permissionKey: "ticket:create" },
    { roleKey: "agent", permissionKey: "ticket:read_own" },
    { roleKey: "agent", permissionKey: "ticket:read_org" },
    { roleKey: "agent", permissionKey: "ticket:claim" },
    { roleKey: "agent", permissionKey: "ticket:update_status" },
    { roleKey: "agent", permissionKey: "ticket:assign" },
    { roleKey: "agent", permissionKey: "agent:access" },
    { roleKey: "agent", permissionKey: "portal:access" },
    { roleKey: "agent", permissionKey: "branding:read" },

    // Admin permissions (all)
    { roleKey: "admin", permissionKey: "ticket:create" },
    { roleKey: "admin", permissionKey: "ticket:read_own" },
    { roleKey: "admin", permissionKey: "ticket:read_org" },
    { roleKey: "admin", permissionKey: "ticket:claim" },
    { roleKey: "admin", permissionKey: "ticket:update_status" },
    { roleKey: "admin", permissionKey: "ticket:assign" },
    { roleKey: "admin", permissionKey: "user:invite" },
    { roleKey: "admin", permissionKey: "user:role_change" },
    { roleKey: "admin", permissionKey: "branding:write" },
    { roleKey: "admin", permissionKey: "branding:read" },
    { roleKey: "admin", permissionKey: "audit:read" },
    { roleKey: "admin", permissionKey: "admin:access" },
    { roleKey: "admin", permissionKey: "agent:access" },
    { roleKey: "admin", permissionKey: "portal:access" },
  ];

  for (const rp of rolePermissionsData) {
    const roleId = roleMap.get(rp.roleKey);
    const permId = permissionMap.get(rp.permissionKey);
    if (roleId && permId) {
      await db
        .insert(rolePermission)
        .values({ roleId, permissionId: permId })
        .onConflictDoNothing();
    }
  }

  // Create Organization A
  console.log("Creating Organization A...");
  const [orgA] = await db
    .insert(organization)
    .values({
      name: "Organization A",
      slug: "org-a",
    })
    .returning();

  // Create Organization B
  console.log("Creating Organization B...");
  const [orgB] = await db
    .insert(organization)
    .values({
      name: "Organization B",
      slug: "org-b",
    })
    .returning();

  // Create users for Organization A
  console.log("Creating users for Organization A...");

  // Admin A
  const [adminUserA] = await db
    .insert(user)
    .values({
      email: "admin@org-a.test",
      name: "Admin A",
      emailVerified: true,
    })
    .returning();

  await db.insert(organizationMembership).values({
    organizationId: orgA.id,
    userId: adminUserA.id,
    roleId: roleMap.get("admin")!,
    status: "active",
  });

  // Agent A
  const [agentUserA] = await db
    .insert(user)
    .values({
      email: "agent@org-a.test",
      name: "Agent A",
      emailVerified: true,
    })
    .returning();

  await db.insert(organizationMembership).values({
    organizationId: orgA.id,
    userId: agentUserA.id,
    roleId: roleMap.get("agent")!,
    status: "active",
  });

  // Requester A
  const [requesterUserA] = await db
    .insert(user)
    .values({
      email: "requester@org-a.test",
      name: "Requester A",
      emailVerified: true,
    })
    .returning();

  await db.insert(organizationMembership).values({
    organizationId: orgA.id,
    userId: requesterUserA.id,
    roleId: roleMap.get("requester")!,
    status: "active",
  });

  // Create users for Organization B
  console.log("Creating users for Organization B...");

  // Admin B
  const [adminUserB] = await db
    .insert(user)
    .values({
      email: "admin@org-b.test",
      name: "Admin B",
      emailVerified: true,
    })
    .returning();

  await db.insert(organizationMembership).values({
    organizationId: orgB.id,
    userId: adminUserB.id,
    roleId: roleMap.get("admin")!,
    status: "active",
  });

  // Agent B
  const [agentUserB] = await db
    .insert(user)
    .values({
      email: "agent@org-b.test",
      name: "Agent B",
      emailVerified: true,
    })
    .returning();

  await db.insert(organizationMembership).values({
    organizationId: orgB.id,
    userId: agentUserB.id,
    roleId: roleMap.get("agent")!,
    status: "active",
  });

  // Requester B
  const [requesterUserB] = await db
    .insert(user)
    .values({
      email: "requester@org-b.test",
      name: "Requester B",
      emailVerified: true,
    })
    .returning();

  await db.insert(organizationMembership).values({
    organizationId: orgB.id,
    userId: requesterUserB.id,
    roleId: roleMap.get("requester")!,
    status: "active",
  });

  // Create sample tickets for Organization A
  console.log("Creating sample tickets for Organization A...");
  await db.insert(ticket).values([
    {
      organizationId: orgA.id,
      number: 1,
      type: "incident",
      subject: "Cannot access email",
      description: "I am unable to log into my email account.",
      status: "open",
      priority: "high",
      requesterId: requesterUserA.id,
    },
    {
      organizationId: orgA.id,
      number: 2,
      type: "service_request",
      subject: "Need new keyboard",
      description: "My keyboard is broken, need a replacement.",
      status: "in_progress",
      priority: "medium",
      requesterId: requesterUserA.id,
      assigneeId: agentUserA.id,
      claimedAt: new Date(),
    },
  ]);

  // Create sample tickets for Organization B
  console.log("Creating sample tickets for Organization B...");
  await db.insert(ticket).values([
    {
      organizationId: orgB.id,
      number: 1,
      type: "incident",
      subject: "Network issue",
      description: "Internet is not working in the office.",
      status: "open",
      priority: "critical",
      requesterId: requesterUserB.id,
    },
    {
      organizationId: orgB.id,
      number: 2,
      type: "service_request",
      subject: "Software installation request",
      description: "Need Adobe Photoshop installed on my machine.",
      status: "open",
      priority: "low",
      requesterId: requesterUserB.id,
    },
  ]);

  console.log("✅ Database seeded successfully!");
  console.log("\nTest accounts created:");
  console.log("\n=== Organization A ===");
  console.log("Admin:     admin@org-a.test");
  console.log("Agent:     agent@org-a.test");
  console.log("Requester: requester@org-a.test");
  console.log("\n=== Organization B ===");
  console.log("Admin:     admin@org-b.test");
  console.log("Agent:     agent@org-b.test");
  console.log("Requester: requester@org-b.test");
  console.log(
    "\nNote: For Better Auth email/password, you'll need to sign up these users through the UI."
  );

  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
