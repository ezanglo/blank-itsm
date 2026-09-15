import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { KnowledgeRepository } from "@/lib/repositories/knowledgeRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

async function updateArticle(id: string, formData: FormData) {
  "use server";
  const ctx = await buildRequestContext();
  requirePermission(ctx, "kb:manage");

  const status = formData.get("status") === "published" ? "published" : "draft";
  await KnowledgeRepository.update(ctx, id, {
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    body: String(formData.get("body") ?? ""),
    status,
  });
  revalidatePath("/admin/knowledge");
  redirect("/admin/knowledge");
}

export default async function EditKnowledgeArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await buildRequestContext();
  requirePermission(ctx, "kb:manage");

  const article = await KnowledgeRepository.getById(ctx, id);
  if (!article) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit article</h1>
        <Link href="/admin/knowledge">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{article.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateArticle.bind(null, id)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required defaultValue={article.title} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Input id="summary" name="summary" defaultValue={article.summary ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body *</Label>
              <Textarea id="body" name="body" rows={10} required defaultValue={article.body} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={article.status}
                className="flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <Button type="submit">Save changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
