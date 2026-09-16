"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { shellChromeType } from "@/lib/shell/chrome-typography";
import {
  shellParentForPath,
  shellTitleForPath,
  type ShellSurface,
} from "@/lib/navigation/shell-nav";

export function SiteHeader({ surface }: { surface: ShellSurface }) {
  const pathname = usePathname();
  const title = shellTitleForPath(pathname);
  const parent = shellParentForPath(pathname);

  return (
    <header
      className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background px-4"
      style={
        {
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className={`truncate ${shellChromeType.headerTitle}`}>{title}</h1>
        {parent ? (
          <Breadcrumb className="hidden min-w-0 md:block">
            <BreadcrumbList className="flex-nowrap">
              <BreadcrumbItem>
                <BreadcrumbLink
                  className={shellChromeType.headerCrumb}
                  render={<Link href={surfaceRoot(surface)} />}
                >
                  {surfaceLabel(surface)}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  className={shellChromeType.headerCrumb}
                  render={<Link href={parent.href} />}
                >
                  {parent.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
      </div>
    </header>
  );
}

function surfaceRoot(surface: ShellSurface): string {
  switch (surface) {
    case "portal":
      return "/portal";
    case "agent":
      return "/agent";
    case "admin":
      return "/admin/reports";
  }
}

function surfaceLabel(surface: ShellSurface): string {
  switch (surface) {
    case "portal":
      return "Portal";
    case "agent":
      return "Agent";
    case "admin":
      return "Admin";
  }
}
