# shadcn Create preset (UI baseline)

| Field | Value |
|-------|--------|
| **Preset ID** | `b1HYXIuXY` |
| **CLI style** | `base-rhea` (see `components.json`) |
| **Token source** | `app/globals.css` (`:root` / `.dark`) |
| **Shell SoT** | `design/DASHBOARD_SHELL_SPEC.md` |

The dashboard shell refresh (AC-SHELL-013) retains this preset’s color and radius tokens. Shell-only additions are documented in `reviews/DASHBOARD_SHELL_PR.md` (`--sidebar-width`, `--header-height`, Inter `--font-sans`).

Do not change preset colors/radius in shell work without Founder/Architect approval. White-label overrides continue via org branding CSS variables on surface layouts.
