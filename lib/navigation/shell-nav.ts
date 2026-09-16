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

export type ShellSurface = "portal" | "agent" | "admin";

export type ShellNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type ShellNavSection = {
  label?: string;
  items: ShellNavItem[];
};

export type ShellNavConfig = {
  surface: ShellSurface;
  sections: ShellNavSection[];
  secondary: ShellNavItem[];
};

export type ShellPermissions = {
  canAgent: boolean;
  canAdmin: boolean;
};

const portalMain: ShellNavItem[] = [
  { title: "Home", url: "/portal", icon: Home },
  { title: "My tickets", url: "/portal/tickets", icon: Ticket },
  { title: "New request", url: "/portal/tickets/new", icon: PlusCircle },
  { title: "Catalog", url: "/portal/catalog", icon: LayoutGrid },
  { title: "Help / Knowledge", url: "/portal/knowledge", icon: BookOpen },
];

const agentMain: ShellNavItem[] = [
  { title: "Queue", url: "/agent", icon: Inbox },
  { title: "Reports", url: "/agent/reports", icon: BarChart3 },
];

const adminSections: ShellNavSection[] = [
  {
    label: "Workspace",
    items: [{ title: "Reports", url: "/admin/reports", icon: BarChart3 }],
  },
  {
    label: "People",
    items: [
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "Roles", url: "/admin/roles", icon: Shield },
    ],
  },
  {
    label: "Service",
    items: [
      { title: "Catalog", url: "/admin/catalog", icon: LayoutGrid },
      { title: "Knowledge", url: "/admin/knowledge", icon: BookOpen },
      { title: "SLA", url: "/admin/sla", icon: ClipboardList },
    ],
  },
  {
    label: "Automation",
    items: [{ title: "Automation", url: "/admin/automation", icon: Bot }],
  },
  {
    label: "Org",
    items: [
      { title: "Branding", url: "/admin/branding", icon: Palette },
      { title: "Audit", url: "/admin/audit", icon: ScrollText },
    ],
  },
];

export function buildShellNav(
  surface: ShellSurface,
  permissions: ShellPermissions
): ShellNavConfig {
  const secondary: ShellNavItem[] = [];

  if (surface === "portal") {
    if (permissions.canAgent) {
      secondary.push({
        title: "Agent workspace",
        url: "/agent",
        icon: Inbox,
      });
    }
    if (permissions.canAdmin) {
      secondary.push({ title: "Admin", url: "/admin/users", icon: Shield });
    }
    return {
      surface,
      sections: [{ label: "Main", items: portalMain }],
      secondary,
    };
  }

  if (surface === "agent") {
    secondary.push({ title: "Portal", url: "/portal", icon: Home });
    if (permissions.canAdmin) {
      secondary.push({ title: "Admin", url: "/admin/users", icon: Shield });
    }
    return {
      surface,
      sections: [{ label: "Main", items: agentMain }],
      secondary,
    };
  }

  secondary.push({ title: "Agent workspace", url: "/agent", icon: Inbox });
  secondary.push({ title: "Portal", url: "/portal", icon: Home });

  return {
    surface,
    sections: adminSections,
    secondary,
  };
}

const TITLE_BY_PATH: Record<string, string> = {
  "/portal": "Home",
  "/portal/tickets": "My tickets",
  "/portal/tickets/new": "New request",
  "/portal/catalog": "Catalog",
  "/portal/knowledge": "Help / Knowledge",
  "/agent": "Queue",
  "/agent/reports": "Reports",
  "/admin/reports": "Reports",
  "/admin/users": "Users",
  "/admin/roles": "Roles",
  "/admin/catalog": "Catalog",
  "/admin/knowledge": "Knowledge",
  "/admin/sla": "SLA",
  "/admin/automation": "Automation",
  "/admin/branding": "Branding",
  "/admin/audit": "Audit",
};

export function shellTitleForPath(pathname: string): string {
  if (TITLE_BY_PATH[pathname]) {
    return TITLE_BY_PATH[pathname];
  }

  if (pathname.startsWith("/portal/tickets/")) {
    return "Ticket";
  }
  if (pathname.startsWith("/portal/catalog/")) {
    return "Catalog item";
  }
  if (pathname.startsWith("/portal/knowledge/")) {
    return "Article";
  }
  if (pathname.startsWith("/agent/tickets/")) {
    return "Ticket";
  }
  if (pathname.startsWith("/admin/catalog/")) {
    return "Catalog item";
  }
  if (pathname.startsWith("/admin/knowledge/")) {
    return "Article";
  }
  if (pathname.startsWith("/admin/automation/")) {
    return "Automation";
  }

  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) {
    return "Dashboard";
  }
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

export function shellParentForPath(pathname: string): { title: string; href: string } | null {
  if (pathname.startsWith("/portal/tickets/") && pathname !== "/portal/tickets/new") {
    return { title: "My tickets", href: "/portal/tickets" };
  }
  if (pathname.startsWith("/portal/catalog/")) {
    return { title: "Catalog", href: "/portal/catalog" };
  }
  if (pathname.startsWith("/portal/knowledge/")) {
    return { title: "Help / Knowledge", href: "/portal/knowledge" };
  }
  if (pathname.startsWith("/agent/tickets/")) {
    return { title: "Queue", href: "/agent" };
  }
  if (pathname.startsWith("/admin/catalog/")) {
    return { title: "Catalog", href: "/admin/catalog" };
  }
  if (pathname.startsWith("/admin/knowledge/")) {
    return { title: "Knowledge", href: "/admin/knowledge" };
  }
  if (pathname.startsWith("/admin/automation/")) {
    return { title: "Automation", href: "/admin/automation" };
  }
  return null;
}

export function isShellNavItemActive(pathname: string, url: string): boolean {
  if (url === "/portal" || url === "/agent") {
    return pathname === url;
  }
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function defaultProductName(surface: ShellSurface): string {
  switch (surface) {
    case "portal":
      return "Service Portal";
    case "agent":
      return "Agent Workspace";
    case "admin":
      return "Admin";
  }
}
