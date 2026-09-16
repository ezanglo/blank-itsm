import type {
  AutomationAction,
  AutomationCondition,
  AutomationConditions,
  AutomationRuleKind,
  AutomationTrigger,
  ConditionField,
  ConditionOp,
} from "./types";
import { TICKET_STATUSES } from "@/lib/domain/ticketStatus";

const CONDITION_FIELDS: readonly ConditionField[] = ["type", "priority", "status"];
const CONDITION_OPS: readonly ConditionOp[] = ["eq", "neq", "in"];
const TICKET_TYPES = ["incident", "service_request"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;
const EMAIL_TEMPLATE_KEYS = ["automation_notify", "ticket_public_reply", "sla_escalation"] as const;
const EMAIL_RECIPIENTS = ["assignee", "requester", "user_ids"] as const;

export class AutomationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutomationValidationError";
  }
}

function assertCondition(cond: unknown, index: number): AutomationCondition {
  if (!cond || typeof cond !== "object") {
    throw new AutomationValidationError(`conditions.all[${index}] must be an object`);
  }
  const row = cond as Record<string, unknown>;
  const field = row.field;
  const op = row.op;
  const value = row.value;

  if (typeof field !== "string" || !CONDITION_FIELDS.includes(field as ConditionField)) {
    throw new AutomationValidationError(`Unknown condition field at index ${index}`);
  }
  if (typeof op !== "string" || !CONDITION_OPS.includes(op as ConditionOp)) {
    throw new AutomationValidationError(`Unknown condition op at index ${index}`);
  }

  if (op === "in") {
    if (!Array.isArray(value) || value.length === 0 || !value.every((v) => typeof v === "string")) {
      throw new AutomationValidationError(`conditions.all[${index}].value must be a non-empty string array for op "in"`);
    }
  } else if (typeof value !== "string" || value.length === 0) {
    throw new AutomationValidationError(`conditions.all[${index}].value must be a non-empty string`);
  }

  validateConditionValue(field as ConditionField, value, op as ConditionOp, index);
  return { field: field as ConditionField, op: op as ConditionOp, value: value as string | string[] };
}

function validateConditionValue(
  field: ConditionField,
  value: string | string[],
  op: ConditionOp,
  index: number
) {
  const values = Array.isArray(value) ? value : [value];
  if (field === "type") {
    for (const v of values) {
      if (!TICKET_TYPES.includes(v as (typeof TICKET_TYPES)[number])) {
        throw new AutomationValidationError(`Invalid ticket type in condition ${index}`);
      }
    }
  } else if (field === "priority") {
    for (const v of values) {
      if (!PRIORITIES.includes(v as (typeof PRIORITIES)[number])) {
        throw new AutomationValidationError(`Invalid priority in condition ${index}`);
      }
    }
  } else if (field === "status") {
    for (const v of values) {
      if (!TICKET_STATUSES.includes(v as (typeof TICKET_STATUSES)[number])) {
        throw new AutomationValidationError(`Invalid status in condition ${index}`);
      }
    }
  }
}

function assertAction(action: unknown, index: number): AutomationAction {
  if (!action || typeof action !== "object") {
    throw new AutomationValidationError(`actions[${index}] must be an object`);
  }
  const row = action as Record<string, unknown>;
  const type = row.type;
  if (type === "assign") {
    if ("assignmentGroupId" in row && row.assignmentGroupId != null) {
      throw new AutomationValidationError(
        "assignmentGroupId is not supported until assignment groups exist in schema"
      );
    }
    const assigneeUserId = row.assigneeUserId;
    if (typeof assigneeUserId !== "string" || !assigneeUserId) {
      throw new AutomationValidationError(`assign action at ${index} requires assigneeUserId`);
    }
    return { type: "assign", assigneeUserId };
  }
  if (type === "add_internal_note") {
    const body = row.body;
    if (typeof body !== "string" || !body.trim()) {
      throw new AutomationValidationError(`add_internal_note at ${index} requires body`);
    }
    return { type: "add_internal_note", body: body.trim() };
  }
  if (type === "enqueue_email") {
    const templateKey = row.templateKey;
    const recipient = row.recipient;
    if (typeof templateKey !== "string" || !EMAIL_TEMPLATE_KEYS.includes(templateKey as (typeof EMAIL_TEMPLATE_KEYS)[number])) {
      throw new AutomationValidationError(`Unknown email templateKey at action ${index}`);
    }
    if (typeof recipient !== "string" || !EMAIL_RECIPIENTS.includes(recipient as (typeof EMAIL_RECIPIENTS)[number])) {
      throw new AutomationValidationError(`Unknown email recipient at action ${index}`);
    }
    if (recipient === "user_ids") {
      const userIds = row.userIds;
      if (!Array.isArray(userIds) || userIds.length === 0 || !userIds.every((id) => typeof id === "string")) {
        throw new AutomationValidationError(`enqueue_email user_ids at ${index} requires userIds array`);
      }
      return { type: "enqueue_email", templateKey, recipient: "user_ids", userIds };
    }
    return { type: "enqueue_email", templateKey, recipient: recipient as "assignee" | "requester" };
  }
  if (type === "set_status") {
    const toStatus = row.toStatus;
    if (typeof toStatus !== "string" || !TICKET_STATUSES.includes(toStatus as (typeof TICKET_STATUSES)[number])) {
      throw new AutomationValidationError(`Invalid toStatus at action ${index}`);
    }
    return { type: "set_status", toStatus };
  }
  throw new AutomationValidationError(`Unknown action type at index ${index}`);
}

export function parseConditions(raw: unknown): AutomationConditions {
  if (!raw || typeof raw !== "object") {
    throw new AutomationValidationError("conditions must be an object");
  }
  const all = (raw as { all?: unknown }).all;
  if (!Array.isArray(all)) {
    throw new AutomationValidationError("conditions.all must be an array");
  }
  return { all: all.map((c, i) => assertCondition(c, i)) };
}

export function parseActions(raw: unknown): AutomationAction[] {
  if (!Array.isArray(raw)) {
    throw new AutomationValidationError("actions must be an array");
  }
  return raw.map((a, i) => assertAction(a, i));
}

export function validateRuleShape(input: {
  kind: AutomationRuleKind;
  trigger?: AutomationTrigger | null;
  conditions: unknown;
  actions: unknown;
}) {
  if (input.kind === "trigger" && !input.trigger) {
    throw new AutomationValidationError("trigger is required when kind is trigger");
  }
  if (input.kind === "assignment" && input.trigger) {
    throw new AutomationValidationError("assignment rules cannot have a trigger");
  }
  const conditions = parseConditions(input.conditions);
  const actions = parseActions(input.actions);
  if (actions.length === 0) {
    throw new AutomationValidationError("At least one action is required");
  }
  return { conditions, actions };
}
