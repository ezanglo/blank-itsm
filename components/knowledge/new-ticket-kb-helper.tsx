"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KbDeflectSearch } from "@/components/knowledge/kb-deflect";

export function NewTicketKbHelper() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-4 mb-6">
      <div className="space-y-2">
        <Label htmlFor="kb-search">Quick knowledge search</Label>
        <Input
          id="kb-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Describe your issue to find help articles…"
        />
      </div>
      <KbDeflectSearch query={search} />
    </div>
  );
}
