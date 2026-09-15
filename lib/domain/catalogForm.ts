import type { CatalogFormField } from "@/db/schema/catalog";

export type { CatalogFormField };

export function parseFormSchema(raw: string): CatalogFormField[] {
  try {
    const parsed = JSON.parse(raw) as CatalogFormField[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f) => f && typeof f.key === "string" && typeof f.label === "string"
    );
  } catch {
    return [];
  }
}

export function serializeFormSchema(fields: CatalogFormField[]): string {
  return JSON.stringify(fields);
}

export function formatFormResponses(
  fields: CatalogFormField[],
  responses: Record<string, string>
): string {
  const lines = fields.map((field) => {
    const value = responses[field.key] ?? "";
    return `${field.label}: ${value}`;
  });
  return lines.join("\n");
}

export function validateFormResponses(
  fields: CatalogFormField[],
  responses: Record<string, string>
): string | null {
  for (const field of fields) {
    if (field.required && !String(responses[field.key] ?? "").trim()) {
      return `${field.label} is required`;
    }
  }
  return null;
}
