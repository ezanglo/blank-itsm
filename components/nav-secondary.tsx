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
      <SidebarGroupLabel>Switch workspace</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                render={<Link href={item.url} />}
                isActive={isShellNavItemActive(pathname, item.url)}
                tooltip={item.title}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
