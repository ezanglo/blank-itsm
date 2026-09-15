"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogFormField } from "@/lib/domain/catalogForm";

type MemberOption = { id: string; label: string };

export function CatalogItemEditor({
  members,
  initial,
}: {
  members: MemberOption[];
  initial?: {
    name: string;
    description: string;
    fulfillmentQueue: string;
    requiresApproval: boolean;
    approverUserId: string | null;
    active: boolean;
    formSchema: CatalogFormField[];
  };
}) {
  const [fields, setFields] = useState<CatalogFormField[]>(
    initial?.formSchema?.length
      ? initial.formSchema
      : [{ key: "details", label: "Additional details", type: "textarea", required: true }]
  );

  function addField() {
    setFields((prev) => [
      ...prev,
      { key: `field_${prev.length + 1}`, label: "New field", type: "text", required: false },
    ]);
  }

  function updateField(index: number, patch: Partial<CatalogFormField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required defaultValue={initial?.name} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            required
            defaultValue={initial?.description}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fulfillmentQueue">Fulfillment queue *</Label>
          <Input
            id="fulfillmentQueue"
            name="fulfillmentQueue"
            required
            defaultValue={initial?.fulfillmentQueue ?? "general"}
            placeholder="e.g. general, hardware"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="approverUserId">Approver (if approval required)</Label>
          <select
            id="approverUserId"
            name="approverUserId"
            defaultValue={initial?.approverUserId ?? ""}
            className="flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm"
          >
            <option value="">— Select approver —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="requiresApproval"
            value="true"
            defaultChecked={initial?.requiresApproval}
          />
          Requires single approver
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" value="true" defaultChecked={initial?.active ?? true} />
          Active in portal
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Form fields</h3>
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            Add field
          </Button>
        </div>
        <input type="hidden" name="formSchema" value={JSON.stringify(fields)} />
        {fields.map((field, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-4 border rounded-lg p-3">
            <Input
              placeholder="Field key"
              value={field.key}
              onChange={(e) => updateField(index, { key: e.target.value })}
            />
            <Input
              placeholder="Label"
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
            />
            <select
              value={field.type}
              onChange={(e) =>
                updateField(index, { type: e.target.value as CatalogFormField["type"] })
              }
              className="flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm"
            >
              <option value="text">Text</option>
              <option value="textarea">Textarea</option>
              <option value="select">Select</option>
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={Boolean(field.required)}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                />
                Required
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeField(index)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
