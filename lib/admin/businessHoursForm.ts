import {
  DEFAULT_BUSINESS_HOURS,
  normalizeBusinessHours,
  type BusinessHoursCalendar,
  type BusinessDayConfig,
} from "@/lib/domain/businessHours";

function parseTimeToMinutes(value: string, fallback: number): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return fallback;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return fallback;
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function businessHoursFromFormData(formData: FormData): BusinessHoursCalendar {
  const days: BusinessDayConfig[] = [];
  for (let i = 0; i < 7; i++) {
    const enabled = formData.get(`day_${i}_enabled`) === "on";
    const start = parseTimeToMinutes(String(formData.get(`day_${i}_start`) ?? ""), 540);
    const end = parseTimeToMinutes(String(formData.get(`day_${i}_end`) ?? ""), 1020);
    days.push({ enabled, startMinute: start, endMinute: end });
  }
  const timezone = String(formData.get("timezone") ?? "UTC").trim() || "UTC";
  return normalizeBusinessHours({ timezone, days });
}

export function businessHoursToFormDefaults(
  calendar: BusinessHoursCalendar | null | undefined
): BusinessHoursCalendar {
  const normalized = normalizeBusinessHours(calendar ?? DEFAULT_BUSINESS_HOURS);
  return normalized;
}

export { minutesToTime };
