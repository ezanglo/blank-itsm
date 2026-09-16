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
  type ShellNavSection,
} from "@/lib/navigation/shell-nav";

export function NavMain({ sections }: { sections: ShellNavSection[] }) {
  const pathname = usePathname();

  return (
    <>
      {sections.map((section) => (
        <SidebarGroup key={section.label ?? "main"}>
          {section.label ? (
            <SidebarGroupLabel className={shellChromeType.groupLabel}>
              {section.label}
            </SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => (
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
      ))}
    </>
  );
}
