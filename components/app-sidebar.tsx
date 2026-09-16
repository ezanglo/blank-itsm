"use client";

import Link from "next/link";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser, type ShellUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { shellChromeType } from "@/lib/shell/chrome-typography";
import {
  defaultProductName,
  type ShellNavConfig,
  type ShellSurface,
} from "@/lib/navigation/shell-nav";

export type ShellBranding = {
  logoUrl?: string | null;
  productName?: string;
};

export function AppSidebar({
  nav,
  branding,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  nav: ShellNavConfig;
  branding: ShellBranding;
  user: ShellUser;
}) {
  const productName =
    branding.productName?.trim() ||
    defaultProductName(nav.surface as ShellSurface);

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href={homeHref(nav.surface)} />}
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt=""
                  className="size-8 shrink-0 rounded-md object-contain"
                />
              ) : (
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-xs font-medium text-sidebar-foreground"
                  aria-hidden
                >
                  {productName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className={shellChromeType.sidebarOrgName}>{productName}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={nav.sections} />
        <NavSecondary items={nav.secondary} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function homeHref(surface: ShellSurface): string {
  switch (surface) {
    case "portal":
      return "/portal";
    case "agent":
      return "/agent";
    case "admin":
      return "/admin/reports";
  }
}
