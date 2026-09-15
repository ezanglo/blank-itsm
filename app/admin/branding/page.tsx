import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { BrandingRepository } from "@/lib/repositories/brandingRepository";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { revalidatePath } from "next/cache";

async function updateBranding(formData: FormData) {
  "use server";
  
  const ctx = await buildRequestContext();
  requirePermission(ctx, "branding:write");
  
  const logoUrl = formData.get("logoUrl") as string;
  const primary = formData.get("primary") as string;
  const primaryForeground = formData.get("primaryForeground") as string;
  
  await BrandingRepository.upsert(ctx, {
    logoUrl: logoUrl || null,
    tokens: {
      primary: primary || undefined,
      primaryForeground: primaryForeground || undefined,
    },
  });
  
  revalidatePath("/admin/branding");
  revalidatePath("/portal");
  revalidatePath("/agent");
}

export default async function BrandingPage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "admin:access");
  requirePermission(ctx, "branding:write");
  
  const branding = await BrandingRepository.getForOrg(ctx.orgId);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Organization Branding</h1>

      <Card>
        <CardHeader>
          <CardTitle>Customize Appearance</CardTitle>
          <CardDescription>
            Set your organization&apos;s logo and colors. Changes will appear on the portal and agent workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateBranding} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                name="logoUrl"
                type="url"
                placeholder="https://example.com/logo.png"
                defaultValue={branding?.logoUrl || ""}
              />
              <p className="text-sm text-muted-foreground">
                Enter the URL of your organization&apos;s logo image
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary">Primary Color</Label>
              <Input
                id="primary"
                name="primary"
                type="text"
                placeholder="hsl(221, 83%, 53%)"
                defaultValue={branding?.tokens?.primary || ""}
              />
              <p className="text-sm text-muted-foreground">
                Primary brand color (HSL format, e.g., hsl(221, 83%, 53%))
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryForeground">Primary Foreground Color</Label>
              <Input
                id="primaryForeground"
                name="primaryForeground"
                type="text"
                placeholder="hsl(0, 0%, 100%)"
                defaultValue={branding?.tokens?.primaryForeground || ""}
              />
              <p className="text-sm text-muted-foreground">
                Text color on primary background (HSL format, e.g., hsl(0, 0%, 100%))
              </p>
            </div>

            <Button type="submit">Save Branding</Button>
          </form>
        </CardContent>
      </Card>

      {branding && (
        <Card>
          <CardHeader>
            <CardTitle>Current Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {branding.logoUrl && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Logo Preview</p>
                <img
                  src={branding.logoUrl}
                  alt="Organization logo"
                  className="h-12 border rounded p-2"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {branding.tokens?.primary && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Primary</p>
                  <div
                    className="h-10 rounded border"
                    style={{ backgroundColor: branding.tokens.primary }}
                  />
                </div>
              )}
              {branding.tokens?.primaryForeground && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Primary Foreground</p>
                  <div
                    className="h-10 rounded border"
                    style={{ backgroundColor: branding.tokens.primaryForeground }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
