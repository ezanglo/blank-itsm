import type { PriorityLevel } from "./ticketPriority";
import { addBusinessMinutes, type BusinessHoursCalendar } from "./businessHours";

/** SLA targets in minutes from ticket creation (or priority change). */
export const SLA_RESPONSE_MINUTES: Record<PriorityLevel, number> = {
  critical: 60,
  high: 240,
  medium: 480,
  low: 1440,
};

export const SLA_RESOLUTION_MINUTES: Record<PriorityLevel, number> = {
  critical: 240,
  high: 480,
  medium: 1440,
  low: 4320,
};

export function addMinutes(from: Date, minutes: number): Date {
  return new Date(from.getTime() + minutes * 60_000);
}

export function computeSlaDueDates(
  priority: PriorityLevel,
  createdAt: Date = new Date(),
  options?: { businessHours?: BusinessHoursCalendar }
): { responseDueAt: Date; resolutionDueAt: Date } {
  const add = options?.businessHours
    ? (d: Date, m: number) => addBusinessMinutes(d, m, options.businessHours!)
    : addMinutes;
  return {
    responseDueAt: add(createdAt, SLA_RESPONSE_MINUTES[priority]),
    resolutionDueAt: add(createdAt, SLA_RESOLUTION_MINUTES[priority]),
  };
}

export { DEFAULT_BUSINESS_HOURS } from "./businessHours";

export type SlaStatus = "on_track" | "response_due" | "resolution_due" | "breached";

export function getSlaStatus(ticket: {
  status: string;
  priority: string | null;
  createdAt: Date;
  firstResponseAt: Date | null;
  responseDueAt: Date | null;
  resolutionDueAt: Date | null;
  resolvedAt: Date | null;
}): SlaStatus {
  const now = Date.now();
  const priority = (ticket.priority ?? "medium") as PriorityLevel;

  if (ticket.status === "resolved" || ticket.status === "closed") {
    if (ticket.resolvedAt && ticket.resolutionDueAt && ticket.resolvedAt > ticket.resolutionDueAt) {
      return "breached";
    }
    return "on_track";
  }

  const { responseDueAt, resolutionDueAt } =
    ticket.responseDueAt && ticket.resolutionDueAt
      ? { responseDueAt: ticket.responseDueAt, resolutionDueAt: ticket.resolutionDueAt }
      : computeSlaDueDates(priority, ticket.createdAt);

  if (!ticket.firstResponseAt && now > responseDueAt.getTime()) {
    return "response_due";
  }
  if (now > resolutionDueAt.getTime()) {
    return "resolution_due";
  }
  return "on_track";
}
