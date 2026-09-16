"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ArticleHit = { id: string; title: string; summary: string | null };

export function KbDeflectSearch({
  query,
  label = "Search the knowledge base before submitting",
}: {
  query: string;
  label?: string;
}) {
  const [hits, setHits] = useState<ArticleHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/kb/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setHits([]);
          return;
        }
        const data = (await res.json()) as { articles: ArticleHit[] };
        setHits(data.articles ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (query.trim().length < 2) return null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
        {!loading && hits.length === 0 && (
          <p className="text-sm text-muted-foreground">No matching articles yet.</p>
        )}
        {hits.map((article) => (
          <div key={article.id} className="rounded-lg border p-3 text-sm">
            <Link href={`/portal/knowledge/${article.id}`} className="font-medium hover:underline">
              {article.title}
            </Link>
            {article.summary && (
              <p className="text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
