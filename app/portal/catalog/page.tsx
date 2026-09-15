import Link from "next/link";
import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { CatalogRepository } from "@/lib/repositories/catalogRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function PortalCatalogPage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "catalog:order");

  const items = await CatalogRepository.listActive(ctx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Service Catalog</h1>
        <p className="text-muted-foreground mt-1">
          Browse available services and submit a standardized request.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No catalog services are available right now.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  {item.requiresApproval && <Badge variant="secondary">Approval</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <Link href={`/portal/catalog/${item.id}`}>
                  <Button>Order service</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
