export type ShellSurface = "portal" | "agent" | "admin";

/** Serializable icon key — resolved on the client (Lucide components cannot cross RSC boundaries). */
export type ShellNavIconKey =
  | "home"
  | "ticket"
  | "plusCircle"
  | "layoutGrid"
  | "bookOpen"
  | "inbox"
  | "barChart3"
  | "users"
  | "shield"
  | "bot"
  | "palette"
  | "scrollText"
  | "clipboardList";

export type ShellNavItem = {
  title: string;
  url: string;
  icon: ShellNavIconKey;
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

/** Canonical admin shell entry (sidebar brand, breadcrumbs, `/admin` redirect). */
export const ADMIN_SHELL_HOME = "/admin/reports";

export function shellSurfaceHome(surface: ShellSurface): string {
  switch (surface) {
    case "portal":
      return "/portal";
    case "agent":
      return "/agent";
    case "admin":
      return ADMIN_SHELL_HOME;
  }
}

const portalMain: ShellNavItem[] = [
  { title: "Home", url: "/portal", icon: "home" },
  { title: "My tickets", url: "/portal/tickets", icon: "ticket" },
  { title: "New request", url: "/portal/tickets/new", icon: "plusCircle" },
  { title: "Catalog", url: "/portal/catalog", icon: "layoutGrid" },
  { title: "Help / Knowledge", url: "/portal/knowledge", icon: "bookOpen" },
];

const agentMain: ShellNavItem[] = [
  { title: "Queue", url: "/agent", icon: "inbox" },
  { title: "Reports", url: "/agent/reports", icon: "barChart3" },
];

const adminSections: ShellNavSection[] = [
  {
    label: "Workspace",
    items: [{ title: "Reports", url: "/admin/reports", icon: "barChart3" }],
  },
  {
    label: "People",
    items: [
      { title: "Users", url: "/admin/users", icon: "users" },
      { title: "Roles", url: "/admin/roles", icon: "shield" },
    ],
  },
  {
    label: "Service",
    items: [
      { title: "Catalog", url: "/admin/catalog", icon: "layoutGrid" },
      { title: "Knowledge", url: "/admin/knowledge", icon: "bookOpen" },
      { title: "SLA", url: "/admin/sla", icon: "clipboardList" },
    ],
  },
  {
    label: "Automation",
    items: [{ title: "Automation", url: "/admin/automation", icon: "bot" }],
  },
  {
    label: "Org",
    items: [
      { title: "Branding", url: "/admin/branding", icon: "palette" },
      { title: "Audit", url: "/admin/audit", icon: "scrollText" },
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
        icon: "inbox",
      });
    }
    if (permissions.canAdmin) {
      secondary.push({ title: "Admin", url: ADMIN_SHELL_HOME, icon: "shield" });
    }
    return {
      surface,
      sections: [{ label: "Main", items: portalMain }],
      secondary,
    };
  }

  if (surface === "agent") {
    secondary.push({ title: "Portal", url: "/portal", icon: "home" });
    if (permissions.canAdmin) {
      secondary.push({ title: "Admin", url: ADMIN_SHELL_HOME, icon: "shield" });
    }
    return {
      surface,
      sections: [{ label: "Main", items: agentMain }],
      secondary,
    };
  }

  secondary.push({ title: "Agent workspace", url: "/agent", icon: "inbox" });
  secondary.push({ title: "Portal", url: "/portal", icon: "home" });

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
