import { describe, expect, it } from "vitest";

import { buildShellNav, type ShellNavIconKey } from "@/lib/navigation/shell-nav";

const ICON_KEYS = new Set<ShellNavIconKey>([
  "home",
  "ticket",
  "plusCircle",
  "layoutGrid",
  "bookOpen",
  "inbox",
  "barChart3",
  "users",
  "shield",
  "bot",
  "palette",
  "scrollText",
  "clipboardList",
]);

function collectIcons(nav: ReturnType<typeof buildShellNav>): ShellNavIconKey[] {
  const icons: ShellNavIconKey[] = [];
  for (const section of nav.sections) {
    for (const item of section.items) {
      icons.push(item.icon);
    }
  }
  for (const item of nav.secondary) {
    icons.push(item.icon);
  }
  return icons;
}

describe("buildShellNav RSC-safe icons", () => {
  it("uses string icon keys only (no Lucide components in nav config)", () => {
    const surfaces = [
      buildShellNav("portal", { canAgent: true, canAdmin: true }),
      buildShellNav("agent", { canAgent: true, canAdmin: false }),
      buildShellNav("admin", { canAgent: true, canAdmin: true }),
    ];

    for (const nav of surfaces) {
      for (const icon of collectIcons(nav)) {
        expect(typeof icon).toBe("string");
        expect(ICON_KEYS.has(icon)).toBe(true);
      }
      expect(JSON.stringify(nav)).not.toContain("$$typeof");
    }
  });
});
