import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { CatalogRepository } from "@/lib/repositories/catalogRepository";
import { UserRepository } from "@/lib/repositories/userRepository";
import { parseFormSchema } from "@/lib/domain/catalogForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CatalogItemEditor } from "@/components/catalog/catalog-item-editor";
import Link from "next/link";

async function updateCatalogItem(id: string, formData: FormData) {
  "use server";
  const ctx = await buildRequestContext();
  requirePermission(ctx, "catalog:manage");

  const formSchemaRaw = String(formData.get("formSchema") ?? "[]");
  const requiresApproval = formData.get("requiresApproval") === "true";
  const active = formData.get("active") === "true";
  const approverUserId = String(formData.get("approverUserId") ?? "") || null;

  await CatalogRepository.update(ctx, id, {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    fulfillmentQueue: String(formData.get("fulfillmentQueue") ?? "general"),
    requiresApproval,
    approverUserId,
    active,
    formSchema: parseFormSchema(formSchemaRaw),
  });
  revalidatePath("/admin/catalog");
  redirect("/admin/catalog");
}

export default async function EditCatalogItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await buildRequestContext();
  requirePermission(ctx, "catalog:manage");

  const item = await CatalogRepository.getById(ctx, id);
  if (!item) notFound();

  const members = await UserRepository.listMembers(ctx);
  const memberOptions = members.map((m) => ({
    id: m.user.id,
    label: m.user.name || m.user.email,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit catalog item</h1>
        <Link href="/admin/catalog">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{item.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCatalogItem.bind(null, id)} className="space-y-4">
            <CatalogItemEditor
              members={memberOptions}
              initial={{
                name: item.name,
                description: item.description,
                fulfillmentQueue: item.fulfillmentQueue,
                requiresApproval: item.requiresApproval,
                approverUserId: item.approverUserId,
                active: item.active,
                formSchema: parseFormSchema(item.formSchema),
              }}
            />
            <Button type="submit">Save changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
