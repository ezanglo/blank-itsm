import Link from "next/link";
import { revalidatePath } from "next/cache";
import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { CatalogRepository } from "@/lib/repositories/catalogRepository";
import { UserRepository } from "@/lib/repositories/userRepository";
import { parseFormSchema } from "@/lib/domain/catalogForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CatalogItemEditor } from "@/components/catalog/catalog-item-editor";

async function createCatalogItem(formData: FormData) {
  "use server";
  const ctx = await buildRequestContext();
  requirePermission(ctx, "catalog:manage");

  const formSchemaRaw = String(formData.get("formSchema") ?? "[]");
  const requiresApproval = formData.get("requiresApproval") === "true";
  const active = formData.get("active") === "true";
  const approverUserId = String(formData.get("approverUserId") ?? "") || null;

  await CatalogRepository.create(ctx, {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    fulfillmentQueue: String(formData.get("fulfillmentQueue") ?? "general"),
    requiresApproval,
    approverUserId,
    active,
    formSchema: parseFormSchema(formSchemaRaw),
  });
  revalidatePath("/admin/catalog");
}

async function deleteCatalogItem(id: string) {
  "use server";
  const ctx = await buildRequestContext();
  requirePermission(ctx, "catalog:manage");
  await CatalogRepository.delete(ctx, id);
  revalidatePath("/admin/catalog");
}

export default async function AdminCatalogPage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "catalog:manage");

  const items = await CatalogRepository.listAll(ctx);
  const members = await UserRepository.listMembers(ctx);
  const memberOptions = members.map((m) => ({
    id: m.user.id,
    label: m.user.name || m.user.email,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Service Catalog</h1>

      <Card>
        <CardHeader>
          <CardTitle>New catalog item</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCatalogItem} className="space-y-4">
            <CatalogItemEditor members={memberOptions} />
            <Button type="submit">Create item</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalog items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 && (
            <p className="text-muted-foreground text-sm">No catalog items yet.</p>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-lg p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.name}</p>
                  {!item.active && <Badge variant="outline">Inactive</Badge>}
                  {item.requiresApproval && <Badge variant="secondary">Approval</Badge>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Queue: {item.fulfillmentQueue}
                  {item.approver ? ` · Approver: ${item.approver.name || item.approver.email}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/catalog/${item.id}`}>
                  <Button variant="outline" size="sm">Edit</Button>
                </Link>
                <form action={deleteCatalogItem.bind(null, item.id)}>
                  <Button type="submit" variant="destructive" size="sm">Delete</Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
