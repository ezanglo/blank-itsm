import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { RbacRepository } from "@/lib/repositories/rbacRepository";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function RolesPage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "admin:access");

  const { roles, allPermissions } = await RbacRepository.listSystemRolesWithPermissions(ctx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Roles &amp; permissions</h1>
        <p className="text-muted-foreground mt-1">
          System roles are shared across tenants. Assign roles per user on the Users page.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((r) => {
          const keys = new Set(
            r.rolePermissions.map((rp) => rp.permission.key)
          );
          return (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="capitalize">{r.name}</CardTitle>
                <CardDescription>{r.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                {allPermissions
                  .filter((p) => keys.has(p.key))
                  .map((p) => (
                    <Badge key={p.id} variant="secondary" className="text-xs font-normal">
                      {p.key}
                    </Badge>
                  ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission reference</CardTitle>
          <CardDescription>All permission keys in the system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {allPermissions.map((p) => (
            <div key={p.id} className="text-sm">
              <span className="font-mono text-xs">{p.key}</span>
              <span className="text-muted-foreground"> — {p.description}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
