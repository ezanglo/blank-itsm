import Link from "next/link";
import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { KnowledgeRepository } from "@/lib/repositories/knowledgeRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalKnowledgeSearch } from "@/components/knowledge/portal-knowledge-search";

export default async function PortalKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "kb:read");

  const { q } = await searchParams;
  const initialQuery = (q ?? "").trim();
  const articles = initialQuery
    ? await KnowledgeRepository.searchPublished(ctx, initialQuery, 20)
    : await KnowledgeRepository.listPublished(ctx, 12);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">Search published articles for self-service answers.</p>
      </div>

      <PortalKnowledgeSearch initialQuery={initialQuery} />

      <Card>
        <CardHeader>
          <CardTitle>{initialQuery ? "Search results" : "Published articles"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {articles.length === 0 && (
            <p className="text-sm text-muted-foreground">No articles found.</p>
          )}
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/portal/knowledge/${article.id}`}
              className="block rounded-lg border p-4 hover:bg-muted/50"
            >
              <p className="font-medium">{article.title}</p>
              {article.summary && (
                <p className="text-sm text-muted-foreground mt-1">{article.summary}</p>
              )}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
