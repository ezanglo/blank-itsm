"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { shellChromeType } from "@/lib/shell/chrome-typography";
import {
  isShellNavItemActive,
  type ShellNavItem,
} from "@/lib/navigation/shell-nav";

export function NavSecondary({ items }: { items: ShellNavItem[] }) {
  const pathname = usePathname();

  if (items.length === 0) {
    return null;
  }

  return (
    <SidebarGroup className="mt-auto">
      <SidebarGroupLabel className={shellChromeType.groupLabel}>
        Other workspaces
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                render={<Link href={item.url} />}
                isActive={isShellNavItemActive(pathname, item.url)}
                tooltip={item.title}
                className={shellChromeType.navItem}
              >
                <item.icon className={shellChromeType.navIcon} aria-hidden />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
