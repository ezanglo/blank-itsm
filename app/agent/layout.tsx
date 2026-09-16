import { redirect } from "next/navigation";
import { buildRequestContext, hasPermission } from "@/lib/auth/context";
import { handleAuthLayoutFailure } from "@/lib/auth/redirect";
import { BrandingRepository } from "@/lib/repositories/brandingRepository";
import { DashboardShell } from "@/components/dashboard-shell";
import { buildShellNav } from "@/lib/navigation/shell-nav";
import { getShellUser } from "@/lib/navigation/shell-session";

async function getAgentContext() {
  try {
    const ctx = await buildRequestContext();
    if (!hasPermission(ctx, "agent:access")) {
      redirect("/portal");
    }
    return ctx;
  } catch (error) {
    handleAuthLayoutFailure(error);
  }
}

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAgentContext();
  const branding = await BrandingRepository.getForOrg(ctx.orgId);
  const user = await getShellUser();

  const brandingStyle: Record<string, string> = {};
  if (branding?.tokens) {
    if (branding.tokens.primary) {
      brandingStyle["--primary"] = branding.tokens.primary;
    }
    if (branding.tokens.primaryForeground) {
      brandingStyle["--primary-foreground"] = branding.tokens.primaryForeground;
    }
  }

  const nav = buildShellNav("agent", {
    canAgent: true,
    canAdmin: hasPermission(ctx, "admin:access"),
  });

  return (
    <DashboardShell
      nav={nav}
      branding={{ logoUrl: branding?.logoUrl }}
      user={user}
      brandingStyle={brandingStyle}
    >
      {children}
    </DashboardShell>
  );
}
