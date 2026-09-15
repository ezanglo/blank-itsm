import { describe, it, expect } from "vitest";
import { computePriority, DEFAULT_IMPACT, DEFAULT_URGENCY } from "@/lib/domain/ticketPriority";
import { computeSlaDueDates, SLA_RESPONSE_MINUTES } from "@/lib/domain/sla";

describe("ticket priority matrix", () => {
  it("defaults to medium for medium impact and urgency", () => {
    expect(computePriority(DEFAULT_IMPACT, DEFAULT_URGENCY)).toBe("medium");
  });

  it("maps high impact and high urgency to critical", () => {
    expect(computePriority("high", "high")).toBe("critical");
  });

  it("computes SLA due dates from priority", () => {
    const created = new Date("2026-01-01T12:00:00Z");
    const { responseDueAt } = computeSlaDueDates("critical", created);
    expect(responseDueAt.getTime() - created.getTime()).toBe(
      SLA_RESPONSE_MINUTES.critical * 60_000
    );
  });
});
