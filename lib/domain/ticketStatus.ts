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

// Allowed transitions
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ["in_progress", "closed"],
  in_progress: ["resolved", "open"],
  resolved: ["closed", "open"],
  closed: ["open"], // Can reopen if needed
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

/**
 * Validate a status string
 */
export function isValidStatus(status: string): status is TicketStatus {
  return TICKET_STATUSES.includes(status as TicketStatus);
}
