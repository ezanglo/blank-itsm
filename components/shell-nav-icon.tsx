"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Bot,
  ClipboardList,
  Home,
  Inbox,
  LayoutGrid,
  Palette,
  PlusCircle,
  ScrollText,
  Shield,
  Ticket,
  Users,
} from "lucide-react";

import type { ShellNavIconKey } from "@/lib/navigation/shell-nav";

const SHELL_NAV_ICONS: Record<ShellNavIconKey, LucideIcon> = {
  home: Home,
  ticket: Ticket,
  plusCircle: PlusCircle,
  layoutGrid: LayoutGrid,
  bookOpen: BookOpen,
  inbox: Inbox,
  barChart3: BarChart3,
  users: Users,
  shield: Shield,
  bot: Bot,
  palette: Palette,
  scrollText: ScrollText,
  clipboardList: ClipboardList,
};

export function ShellNavIcon({
  name,
  className,
}: {
  name: ShellNavIconKey;
  className?: string;
}) {
  const Icon = SHELL_NAV_ICONS[name];
  return <Icon className={className} aria-hidden />;
}
