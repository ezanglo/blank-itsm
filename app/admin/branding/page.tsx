import { buildRequestContext, requirePermission } from "@/lib/auth/context";
import { BrandingRepository } from "@/lib/repositories/brandingRepository";
import { BrandingAdminForm } from "@/components/admin/branding-admin-form";
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Organization Branding</h1>
      <BrandingAdminForm
        initial={{
          logoUrl: branding?.logoUrl ?? "",
          primary: branding?.tokens?.primary ?? "",
          primaryForeground: branding?.tokens?.primaryForeground ?? "",
        }}
        saveAction={updateBranding}
      />
    </div>
  );
}
