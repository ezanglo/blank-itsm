# Design skills (Founder 2026-09-16)

Required for blank-itsm UI/UX work (Designer + implementing agents):

## Impeccable — https://impeccable.style/
- Installed in repo: `.agents/skills/impeccable/` (and Cursor copy).
- Use for critique, polish, typeset, distill, harden, anti-slop, design vocabulary.
- Prefer project DESIGN.md / PRODUCT.md when present; respect shadcn + locked baselines.

## Taste
- **Profile product:** https://buildwithtaste.com/ — personal taste profile for Cursor/Codex/Claude. Optional but preferred once Founder builds/exports a profile.
- **Agent skill (installed):** `design-taste-frontend` from Leonxlnx/taste-skill — `.agents/skills/design-taste-frontend/`.
- Docs/install also: https://www.tasteskill.dev/docs

## Project constraints that still win
- shadcn/ui + Create preset; official sidebar/dashboard shell blocks
- Inter for dashboard refresh
- White-label tokens; no extra UI libraries without Founder approval
- Never copy proprietary third-party UIs

## Install (already done on Mac clone `blank-itsm-origin-sync`)
```bash
npx skills add pbakaus/impeccable -a cursor
npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend -a cursor
```

Mirror copies for studio SoT agents: `design/skills/` (SKILL.md extracts).
