/**
 * Ticket status transition module (T4)
 * Product-owned labels and transition rules
 */

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export const TICKET_STATUSES: readonly TicketStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

// Allowed transitions (agents); requesters may only reopen via portal where permitted
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ["in_progress", "resolved", "closed"],
  in_progress: ["resolved", "open", "closed"],
  resolved: ["closed", "open"],
  closed: ["open"],
};

/** Requester-initiated transitions (e.g. reopen closed ticket). */
const REQUESTER_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: [],
  in_progress: [],
  resolved: [],
  closed: ["open"],
};

/**
 * Check if a status transition is allowed
 */
export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

/**
 * Get allowed next statuses from current status
 */
export function getAllowedNextStatuses(current: TicketStatus): TicketStatus[] {
  return TRANSITIONS[current];
}

export function getAllowedRequesterNextStatuses(current: TicketStatus): TicketStatus[] {
  return REQUESTER_TRANSITIONS[current];
}

export function assertTransition(from: TicketStatus, to: TicketStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid status transition from ${from} to ${to}`);
  }
}

/**
 * Validate a status string
 */
export function isValidStatus(status: string): status is TicketStatus {
  return TICKET_STATUSES.includes(status as TicketStatus);
}
