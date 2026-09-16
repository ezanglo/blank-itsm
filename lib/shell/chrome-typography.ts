/**
 * Fixed type roles for dashboard shell chrome (DASHBOARD_SHELL_SPEC §3).
 * Use only in shell components — not feature pages.
 */
export const shellChromeType = {
  groupLabel: "text-xs font-medium text-sidebar-foreground/70",
  navItem: "text-sm font-medium",
  navIcon: "size-4 shrink-0",
  headerTitle: "text-base font-semibold text-foreground",
  headerCrumb: "text-sm font-medium text-muted-foreground",
  sidebarOrgName: "truncate text-sm font-medium",
  sidebarOrgMeta: "truncate text-xs font-normal text-muted-foreground",
  accountName: "truncate text-sm font-medium",
  accountEmail: "truncate text-xs font-normal text-muted-foreground",
} as const;
