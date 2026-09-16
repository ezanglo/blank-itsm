"use client";

import { AppSidebar, type ShellBranding } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import type { ShellUser } from "@/components/nav-user";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { ShellNavConfig } from "@/lib/navigation/shell-nav";

export type DashboardShellProps = {
  nav: ShellNavConfig;
  branding: ShellBranding;
  user: ShellUser;
  brandingStyle?: Record<string, string>;
  children: React.ReactNode;
};

export function DashboardShell({
  nav,
  branding,
  user,
  brandingStyle,
  children,
}: DashboardShellProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
          ...brandingStyle,
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" nav={nav} branding={branding} user={user} />
      <SidebarInset>
        <SiteHeader surface={nav.surface} />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
