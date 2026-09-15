import { notFound } from "next/navigation";
import Link from "next/link";
import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { KnowledgeRepository } from "@/lib/repositories/knowledgeRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PortalKnowledgeArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await buildRequestContext();
  requirePermission(ctx, "kb:read");

  const article = await KnowledgeRepository.getById(ctx, id);
  if (!article || article.status !== "published") notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/portal/knowledge">
        <Button variant="outline">← Back to knowledge base</Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{article.title}</CardTitle>
          {article.summary && <p className="text-muted-foreground">{article.summary}</p>}
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">{article.body}</div>
        </CardContent>
      </Card>
    </div>
  );
}
