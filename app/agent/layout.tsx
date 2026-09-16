import { redirect } from "next/navigation";
import { buildRequestContext, hasPermission } from "@/lib/auth/context";
import { handleAuthLayoutFailure } from "@/lib/auth/redirect";
import { DashboardShell } from "@/components/dashboard-shell";
import { loadShellBranding } from "@/lib/shell/load-shell-branding";
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
  const { logoUrl, brandingStyle } = await loadShellBranding(ctx.orgId);
  const user = await getShellUser();

  const nav = buildShellNav("agent", {
    canAgent: true,
    canAdmin: hasPermission(ctx, "admin:access"),
  });

  return (
    <DashboardShell
      nav={nav}
      branding={{ logoUrl }}
      user={user}
      brandingStyle={brandingStyle}
    >
      {children}
    </DashboardShell>
  );
}
