/** Business-hours calendar for SLA due-date calculation (UTC-based for local-first dev). */

export type BusinessDayConfig = {
  enabled: boolean;
  /** Minutes from midnight UTC, inclusive start */
  startMinute: number;
  /** Minutes from midnight UTC, exclusive end */
  endMinute: number;
};

export type BusinessHoursCalendar = {
  timezone: string;
  /** Index 0 = Sunday … 6 = Saturday */
  days: BusinessDayConfig[];
};

const MINUTES_PER_DAY = 24 * 60;

/** Mon–Fri 09:00–17:00 UTC */
export const DEFAULT_BUSINESS_HOURS: BusinessHoursCalendar = {
  timezone: "UTC",
  days: [
    { enabled: false, startMinute: 540, endMinute: 1020 },
    { enabled: true, startMinute: 540, endMinute: 1020 },
    { enabled: true, startMinute: 540, endMinute: 1020 },
    { enabled: true, startMinute: 540, endMinute: 1020 },
    { enabled: true, startMinute: 540, endMinute: 1020 },
    { enabled: true, startMinute: 540, endMinute: 1020 },
    { enabled: false, startMinute: 540, endMinute: 1020 },
  ],
};

export function normalizeBusinessHours(
  input: Partial<BusinessHoursCalendar> | null | undefined
): BusinessHoursCalendar {
  if (!input?.days || input.days.length !== 7) {
    return DEFAULT_BUSINESS_HOURS;
  }
  return {
    timezone: input.timezone?.trim() || "UTC",
    days: input.days.map((d) => ({
      enabled: Boolean(d.enabled),
      startMinute: Math.max(0, Math.min(MINUTES_PER_DAY - 1, d.startMinute ?? 540)),
      endMinute: Math.max(1, Math.min(MINUTES_PER_DAY, d.endMinute ?? 1020)),
    })),
  };
}

function dayConfig(calendar: BusinessHoursCalendar, date: Date): BusinessDayConfig {
  return calendar.days[date.getUTCDay()];
}

function startOfNextBusinessMinute(date: Date, calendar: BusinessHoursCalendar): Date {
  let cursor = new Date(date.getTime());
  for (let guard = 0; guard < 366 * 2; guard++) {
    const config = dayConfig(calendar, cursor);
    const minuteOfDay = cursor.getUTCHours() * 60 + cursor.getUTCMinutes();
    if (config.enabled && config.endMinute > config.startMinute) {
      if (minuteOfDay < config.startMinute) {
        cursor.setUTCHours(0, config.startMinute, 0, 0);
        return cursor;
      }
      if (minuteOfDay < config.endMinute) {
        return cursor;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    cursor.setUTCHours(0, 0, 0, 0);
    const nextConfig = dayConfig(calendar, cursor);
    if (nextConfig.enabled && nextConfig.endMinute > nextConfig.startMinute) {
      cursor.setUTCHours(0, nextConfig.startMinute, 0, 0);
      return cursor;
    }
  }
  return new Date(date.getTime() + 60_000);
}

/**
 * Add SLA minutes counting only configured business hours (UTC).
 */
export function addBusinessMinutes(
  from: Date,
  minutes: number,
  calendar: BusinessHoursCalendar = DEFAULT_BUSINESS_HOURS
): Date {
  if (minutes <= 0) return new Date(from.getTime());
  let remaining = minutes;
  let cursor = startOfNextBusinessMinute(from, calendar);

  while (remaining > 0) {
    const config = dayConfig(calendar, cursor);
    if (!config.enabled || config.endMinute <= config.startMinute) {
      cursor = startOfNextBusinessMinute(
        new Date(cursor.getTime() + MINUTES_PER_DAY * 60_000),
        calendar
      );
      continue;
    }
    const minuteOfDay = cursor.getUTCHours() * 60 + cursor.getUTCMinutes();
    const available = config.endMinute - Math.max(config.startMinute, minuteOfDay);
    if (available <= 0) {
      cursor = startOfNextBusinessMinute(
        new Date(cursor.getTime() + 60_000),
        calendar
      );
      continue;
    }
    const chunk = Math.min(remaining, available);
    remaining -= chunk;
    cursor = new Date(cursor.getTime() + chunk * 60_000);
    if (remaining > 0 && cursor.getUTCHours() * 60 + cursor.getUTCMinutes() >= config.endMinute) {
      cursor = startOfNextBusinessMinute(cursor, calendar);
    }
  }
  return cursor;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
