"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
      className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
      style={
        {
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink render={<Link href={surfaceRoot(surface)} />}>
              {surfaceLabel(surface)}
            </BreadcrumbLink>
          </BreadcrumbItem>
          {parent ? (
            <>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink render={<Link href={parent.href} />}>
                  {parent.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          ) : null}
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
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
