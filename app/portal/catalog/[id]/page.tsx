import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { CatalogRepository } from "@/lib/repositories/catalogRepository";
import { parseFormSchema } from "@/lib/domain/catalogForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CatalogOrderKbHelper } from "@/components/catalog/catalog-order-kb-helper";

async function placeOrder(catalogItemId: string, formData: FormData) {
  "use server";
  const ctx = await buildRequestContext();
  requirePermission(ctx, "catalog:order");

  const item = await CatalogRepository.getById(ctx, catalogItemId);
  if (!item) throw new Error("Not found");

  const fields = parseFormSchema(item.formSchema);
  const responses: Record<string, string> = {};
  for (const field of fields) {
    responses[field.key] = String(formData.get(`field_${field.key}`) ?? "");
  }

  const ticket = await CatalogRepository.placeOrder(ctx, catalogItemId, responses);
  redirect(`/portal/tickets/${ticket.id}`);
}

export default async function PortalCatalogOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await buildRequestContext();
  requirePermission(ctx, "catalog:order");

  const item = await CatalogRepository.getById(ctx, id);
  if (!item || !item.active) notFound();

  const fields = parseFormSchema(item.formSchema);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/portal/catalog" className={cn(buttonVariants({ variant: "outline" }))}>
        ← Back to catalog
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{item.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <CatalogOrderKbHelper itemName={item.name} />

          <form action={placeOrder.bind(null, id)} className="space-y-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`field_${field.key}`}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={`field_${field.key}`}
                    name={`field_${field.key}`}
                    required={field.required}
                    rows={4}
                  />
                ) : (
                  <Input
                    id={`field_${field.key}`}
                    name={`field_${field.key}`}
                    required={field.required}
                  />
                )}
              </div>
            ))}
            <Button type="submit" className="w-full">Submit request</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
