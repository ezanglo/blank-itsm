"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function PortalKnowledgeSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  return (
    <form
      className="flex flex-col sm:flex-row gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const q = query.trim();
        router.push(q ? `/portal/knowledge?q=${encodeURIComponent(q)}` : "/portal/knowledge");
      }}
    >
      <div className="flex-1 space-y-1">
        <Label htmlFor="kb-q">Search</Label>
        <Input
          id="kb-q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. password, VPN, laptop"
        />
      </div>
      <div className="pt-6 sm:pt-0 sm:self-end">
        <Button type="submit">Search</Button>
      </div>
    </form>
  );
}
