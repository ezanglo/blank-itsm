import { describe, it, expect } from "vitest";
import { addBusinessMinutes, DEFAULT_BUSINESS_HOURS } from "@/lib/domain/businessHours";
import { computeSlaDueDates, SLA_RESPONSE_MINUTES } from "@/lib/domain/sla";

describe("business hours SLA", () => {
  it("adds business minutes within same day", () => {
    const monday9am = new Date("2026-01-05T09:00:00.000Z");
    const result = addBusinessMinutes(monday9am, 60, DEFAULT_BUSINESS_HOURS);
    expect(result.toISOString()).toBe("2026-01-05T10:00:00.000Z");
  });

  it("skips weekends when adding business minutes", () => {
    const friday4pm = new Date("2026-01-09T16:00:00.000Z");
    const result = addBusinessMinutes(friday4pm, 120, DEFAULT_BUSINESS_HOURS);
    expect(result.toISOString()).toBe("2026-01-12T10:00:00.000Z");
  });

  it("computeSlaDueDates respects business hours calendar", () => {
    const start = new Date("2026-01-09T16:30:00.000Z");
    const { responseDueAt } = computeSlaDueDates("critical", start, {
      businessHours: DEFAULT_BUSINESS_HOURS,
    });
    const wallClock = new Date(start.getTime() + SLA_RESPONSE_MINUTES.critical * 60_000);
    expect(responseDueAt.getTime()).toBeGreaterThan(wallClock.getTime());
  });
});
