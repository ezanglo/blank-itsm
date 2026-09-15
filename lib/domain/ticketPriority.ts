/**
 * Priority derived from impact × urgency (ITIL-style matrix).
 */

export type ImpactLevel = "low" | "medium" | "high";
export type UrgencyLevel = "low" | "medium" | "high";
export type PriorityLevel = "low" | "medium" | "high" | "critical";

export const DEFAULT_IMPACT: ImpactLevel = "medium";
export const DEFAULT_URGENCY: UrgencyLevel = "medium";

const MATRIX: Record<ImpactLevel, Record<UrgencyLevel, PriorityLevel>> = {
  low: { low: "low", medium: "low", high: "medium" },
  medium: { low: "low", medium: "medium", high: "high" },
  high: { low: "medium", medium: "high", high: "critical" },
};

export function isImpactLevel(value: string): value is ImpactLevel {
  return value === "low" || value === "medium" || value === "high";
}

export function isUrgencyLevel(value: string): value is UrgencyLevel {
  return value === "low" || value === "medium" || value === "high";
}

export function computePriority(
  impact: ImpactLevel = DEFAULT_IMPACT,
  urgency: UrgencyLevel = DEFAULT_URGENCY
): PriorityLevel {
  return MATRIX[impact][urgency];
}

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: "bg-slate-100 text-slate-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};
