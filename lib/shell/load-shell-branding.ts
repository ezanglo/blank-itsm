import { BrandingRepository } from "@/lib/repositories/brandingRepository";

export type ShellBrandingPayload = {
  logoUrl?: string | null;
  brandingStyle: Record<string, string>;
};

/**
 * Load org branding for dashboard shell layouts.
 * Fail-closed: DB/RLS errors degrade to preset chrome (no HTTP 500).
 */
export async function loadShellBranding(orgId: string): Promise<ShellBrandingPayload> {
  try {
    const branding = await BrandingRepository.getForOrg(orgId);
    const brandingStyle: Record<string, string> = {};
    if (branding?.tokens) {
      if (branding.tokens.primary) {
        brandingStyle["--primary"] = branding.tokens.primary;
      }
      if (branding.tokens.primaryForeground) {
        brandingStyle["--primary-foreground"] = branding.tokens.primaryForeground;
      }
    }
    return { logoUrl: branding?.logoUrl, brandingStyle };
  } catch (error) {
    console.error("[shell] branding load failed; using preset chrome", {
      orgId,
      error,
    });
    return { brandingStyle: {} };
  }
}
