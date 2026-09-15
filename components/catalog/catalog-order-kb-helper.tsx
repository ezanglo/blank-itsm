"use client";

import { useState } from "react";
import { KbDeflectSearch } from "@/components/knowledge/kb-deflect";

export function CatalogOrderKbHelper({ itemName }: { itemName: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="text-sm text-primary hover:underline"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Hide" : "Search knowledge base"} before ordering
      </button>
      {expanded && <KbDeflectSearch query={itemName} label="Related articles" />}
    </div>
  );
}
