import type { ticket } from "@/db/schema";
import type {
  AutomationCondition,
  AutomationConditions,
  AutomationTrigger,
  AutomationTriggerConfig,
  StatusChangedMeta,
} from "./types";

type TicketRow = typeof ticket.$inferSelect;

function ticketFieldValue(ticketRow: TicketRow, field: AutomationCondition["field"]): string | null {
  switch (field) {
    case "type":
      return ticketRow.type;
    case "priority":
      return ticketRow.priority ?? null;
    case "status":
      return ticketRow.status;
    default:
      return null;
  }
}

export function conditionMatches(ticketRow: TicketRow, condition: AutomationCondition): boolean {
  const actual = ticketFieldValue(ticketRow, condition.field);
  if (actual == null) return false;
  if (condition.op === "eq") {
    return actual === condition.value;
  }
  if (condition.op === "neq") {
    return actual !== condition.value;
  }
  if (condition.op === "in" && Array.isArray(condition.value)) {
    return condition.value.includes(actual);
  }
  return false;
}

export function conditionsMatch(ticketRow: TicketRow, conditions: AutomationConditions): boolean {
  if (conditions.all.length === 0) return true;
  return conditions.all.every((c) => conditionMatches(ticketRow, c));
}

export function triggerConfigMatches(
  config: AutomationTriggerConfig | null | undefined,
  trigger: AutomationTrigger,
  meta?: StatusChangedMeta
): boolean {
  if (trigger !== "status_changed") return true;
  if (!meta) return false;
  const cfg = config ?? {};
  if (cfg.fromStatus && cfg.fromStatus !== meta.fromStatus) return false;
  if (cfg.toStatus && cfg.toStatus !== meta.toStatus) return false;
  return true;
}
