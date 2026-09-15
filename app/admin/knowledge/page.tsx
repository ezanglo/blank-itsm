import Link from "next/link";
import { revalidatePath } from "next/cache";
import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { KnowledgeRepository } from "@/lib/repositories/knowledgeRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

async function createArticle(formData: FormData) {
  "use server";
  const ctx = await buildRequestContext();
  requirePermission(ctx, "kb:manage");

  const status = formData.get("status") === "published" ? "published" : "draft";
  await KnowledgeRepository.create(ctx, {
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    body: String(formData.get("body") ?? ""),
    status,
  });
  revalidatePath("/admin/knowledge");
}

export default async function AdminKnowledgePage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "kb:manage");

  const articles = await KnowledgeRepository.listForAdmin(ctx);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Knowledge Base</h1>

      <Card>
        <CardHeader>
          <CardTitle>New article</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createArticle} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Input id="summary" name="summary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body *</Label>
              <Textarea id="body" name="body" rows={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue="draft"
                className="flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <Button type="submit">Create article</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Articles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex items-center justify-between gap-3 border rounded-lg p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{article.title}</p>
                  <Badge variant={article.status === "published" ? "default" : "outline"}>
                    {article.status}
                  </Badge>
                </div>
                {article.summary && (
                  <p className="text-sm text-muted-foreground">{article.summary}</p>
                )}
              </div>
              <Link href={`/admin/knowledge/${article.id}`}>
                <Button variant="outline" size="sm">Edit</Button>
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
