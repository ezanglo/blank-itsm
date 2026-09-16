"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { shellChromeType } from "@/lib/shell/chrome-typography";

export type ShellUser = {
  name: string;
  email: string;
};

function initials(name: string, email: string): string {
  const fromName = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  if (fromName) {
    return fromName;
  }
  return email.charAt(0).toUpperCase() || "?";
}

export function NavUser({ user }: { user: ShellUser }) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                aria-label="Account menu"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs font-medium">
                {initials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className={shellChromeType.accountName}>{user.name}</span>
              <span className={shellChromeType.accountEmail}>{user.email}</span>
            </div>
            <ChevronsUpDown
              className="ml-auto size-4 shrink-0 opacity-60"
              aria-hidden
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg text-xs font-medium">
                    {initials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className={shellChromeType.accountName}>{user.name}</span>
                  <span className={shellChromeType.accountEmail}>
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <form
                action="/api/auth/sign-out"
                method="POST"
                className="flex w-full items-center gap-2"
              >
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 text-sm font-medium"
                >
                  <LogOut className="size-4 shrink-0" aria-hidden />
                  Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
