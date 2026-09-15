/** Seeded demo accounts (org-a / org-b). Used for membership provisioning on first auth. */
export type SeedRosterEntry = {
  orgSlug: string;
  roleKey: "admin" | "agent" | "requester";
  displayName: string;
};

export const SEED_EMAIL_ROSTER: Record<string, SeedRosterEntry> = {
  "admin@org-a.test": { orgSlug: "org-a", roleKey: "admin", displayName: "Admin A" },
  "agent@org-a.test": { orgSlug: "org-a", roleKey: "agent", displayName: "Agent A" },
  "requester@org-a.test": { orgSlug: "org-a", roleKey: "requester", displayName: "Requester A" },
  "admin@org-b.test": { orgSlug: "org-b", roleKey: "admin", displayName: "Admin B" },
  "agent@org-b.test": { orgSlug: "org-b", roleKey: "agent", displayName: "Agent B" },
  "requester@org-b.test": { orgSlug: "org-b", roleKey: "requester", displayName: "Requester B" },
};

export function lookupSeedRoster(email: string): SeedRosterEntry | null {
  return SEED_EMAIL_ROSTER[email.toLowerCase()] ?? null;
}
