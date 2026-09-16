export type AutomationRuleKind = "assignment" | "trigger";

export type AutomationTrigger =
  | "ticket_created"
  | "status_changed"
  | "public_reply_added"
  | "sla_at_risk"
  | "sla_breached";

export const AUTOMATION_TRIGGERS: readonly AutomationTrigger[] = [
  "ticket_created",
  "status_changed",
  "public_reply_added",
  "sla_at_risk",
  "sla_breached",
] as const;

export type AutomationTriggerConfig = {
  fromStatus?: string;
  toStatus?: string;
};

export type ConditionField = "type" | "priority" | "status";

export type ConditionOp = "eq" | "neq" | "in";

export type AutomationCondition = {
  field: ConditionField;
  op: ConditionOp;
  value: string | string[];
};

export type AutomationConditions = {
  all: AutomationCondition[];
};

export type AssignAction = {
  type: "assign";
  assigneeUserId?: string;
};

export type AddInternalNoteAction = {
  type: "add_internal_note";
  body: string;
};

export type EnqueueEmailAction = {
  type: "enqueue_email";
  templateKey: string;
  recipient: "assignee" | "requester" | "user_ids";
  userIds?: string[];
};

export type SetStatusAction = {
  type: "set_status";
  toStatus: string;
};

export type AutomationAction =
  | AssignAction
  | AddInternalNoteAction
  | EnqueueEmailAction
  | SetStatusAction;

export type AutomationContext = {
  orgId: string;
  ticketId: string;
  depth: number;
  firedRuleIds: Set<string>;
  actionExecutions: number;
};

export const MAX_ACTIONS_PER_PASS = 20;

export type StatusChangedMeta = {
  fromStatus: string;
  toStatus: string;
};

export type PendingAutomationEmail = {
  to: string;
  subject: string;
  templateKey: "automation_notify";
  payload: Record<string, unknown>;
};
