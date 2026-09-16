import type { AutomationAction, AutomationConditions, AutomationRuleKind, AutomationTrigger } from "@/lib/domain/automation/types";

export function conditionsFromForm(formData: FormData): AutomationConditions {
  const field = String(formData.get("cond_field") ?? "").trim();
  const op = String(formData.get("cond_op") ?? "eq").trim();
  const value = String(formData.get("cond_value") ?? "").trim();
  if (!field || !value) {
    return { all: [] };
  }
  return { all: [{ field: field as "type" | "priority" | "status", op: op as "eq" | "neq" | "in", value }] };
}

export function actionsFromForm(formData: FormData): AutomationAction[] {
  const actionType = String(formData.get("action_type") ?? "").trim();
  if (actionType === "assign") {
    const assigneeUserId = String(formData.get("assignee_user_id") ?? "").trim();
    return [{ type: "assign", assigneeUserId }];
  }
  if (actionType === "add_internal_note") {
    const body = String(formData.get("note_body") ?? "").trim();
    return [{ type: "add_internal_note", body }];
  }
  if (actionType === "enqueue_email") {
    const recipient = String(formData.get("email_recipient") ?? "requester").trim() as
      | "assignee"
      | "requester"
      | "user_ids";
    const templateKey = String(formData.get("email_template") ?? "automation_notify").trim();
    if (recipient === "user_ids") {
      const raw = String(formData.get("email_user_ids") ?? "").trim();
      const userIds = raw.split(",").map((s) => s.trim()).filter(Boolean);
      return [{ type: "enqueue_email", templateKey, recipient, userIds }];
    }
    return [{ type: "enqueue_email", templateKey, recipient }];
  }
  if (actionType === "set_status") {
    const toStatus = String(formData.get("to_status") ?? "").trim();
    return [{ type: "set_status", toStatus }];
  }
  return [];
}

export function ruleInputFromForm(formData: FormData) {
  const kind = String(formData.get("kind") ?? "assignment") as AutomationRuleKind;
  const trigger =
    kind === "trigger"
      ? (String(formData.get("trigger") ?? "ticket_created") as AutomationTrigger)
      : null;
  const fromStatus = String(formData.get("trigger_from_status") ?? "").trim();
  const toStatus = String(formData.get("trigger_to_status") ?? "").trim();
  const triggerConfig =
    kind === "trigger" && trigger === "status_changed" && (fromStatus || toStatus)
      ? { fromStatus: fromStatus || undefined, toStatus: toStatus || undefined }
      : null;

  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    kind,
    enabled: formData.get("enabled") === "on",
    sortOrder: Number(formData.get("sort_order") ?? 0),
    trigger,
    triggerConfig,
    conditions: conditionsFromForm(formData),
    actions: actionsFromForm(formData),
  };
}
