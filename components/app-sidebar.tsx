"use client";

import Link from "next/link";
import { LifeBuoy } from "lucide-react";

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
                  alt="Organization logo"
                  className="size-8 rounded-md object-contain"
                />
              ) : (
                <span
                  className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"
                  aria-hidden
                >
                  <LifeBuoy className="size-4" />
                </span>
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{productName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {surfaceSubtitle(nav.surface)}
                </span>
              </div>
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

function surfaceSubtitle(surface: ShellSurface): string {
  switch (surface) {
    case "portal":
      return "Request help";
    case "agent":
      return "Service desk";
    case "admin":
      return "Organization";
  }
}
