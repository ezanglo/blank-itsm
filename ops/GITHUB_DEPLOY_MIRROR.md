# One-way deploy mirror: Origin → GitHub → Vercel

**Purpose:** Founder-authorized **free smoke only** (see `decisions/FOUNDER_FREE_DEPLOY_2026-09-16.md`).  
**Source of truth:** **Origin** `ezraanglo/tmp-24caffaea01e301c` — all product work and Cloud Agents target Origin first.  
**Deploy mirror (GitHub only):** [`ezanglo/blank-itsm`](https://github.com/ezanglo/blank-itsm) — existing repo linked to **Vercel Hobby**; receives one-way pushes for builds only.

GitHub is **not** canonical. Do not open feature branches on GitHub as primary. Do not treat PRs on GitHub as the product workflow unless explicitly re-authorized.

| System | Repo |
|--------|------|
| **Origin (SoT)** | `ezraanglo/tmp-24caffaea01e301c` |
| **GitHub (mirror)** | `ezanglo/blank-itsm` |
| **Mirror URL** | `https://github.com/ezanglo/blank-itsm.git` |

---

## Prerequisites

- Push access to `ezanglo/blank-itsm` (Founder or delegated deploy token via GitHub — never commit tokens).
- Vercel Hobby project imports `ezanglo/blank-itsm` (repository root, Next.js).
- Origin branch to mirror (typically `main` after merge, or a deploy-prep branch tip for smoke) is at the SHA you intend to deploy.

---

## Scripted sync (recommended)

From an **Origin** clone of `ezraanglo/tmp-24caffaea01e301c`:

```bash
./scripts/sync-github-deploy-mirror.sh
```

Optional: mirror a specific local/remote ref to GitHub `main`:

```bash
./scripts/sync-github-deploy-mirror.sh origin/main
# or after merge: ./scripts/sync-github-deploy-mirror.sh cursor/free-deploy-prep-d4bc
```

The script fetches Origin, adds/uses remote `github-deploy` → `https://github.com/ezanglo/blank-itsm.git`, and **fast-forward pushes** to `main` (no force).

---

## Manual sync

```bash
git remote add github-deploy "https://github.com/ezanglo/blank-itsm.git"  # one-time
git fetch origin main
git push github-deploy origin/main:main
```

---

## First-time / history conflicts

If GitHub `main` has **no commits** yet, a normal push is sufficient.

If GitHub `main` already has **unrelated** history, **do not force-push** to destroy GitHub history unless the repo is intentionally empty/disposable. Prefer:

1. Align with CoS on whether the GitHub repo can be reset to empty, **or**
2. Push to a new branch on GitHub, point Vercel to that branch temporarily, **or**
3. Merge Origin `main` into GitHub `main` via a one-time PR on GitHub (mirror-only), understanding GitHub remains non-canonical.

This doc does **not** recommend `git push --force` to rewrite shared GitHub history.

---

## Re-sync for later deploys

After new commits land on **Origin** `main` (merge prep branches there first):

```bash
git fetch origin main
git push github-deploy origin/main:main
```

Or run `./scripts/sync-github-deploy-mirror.sh origin/main`.

Vercel builds from updated GitHub `main` (or the branch configured in the Vercel project).

Deploy a specific SHA (CoS-approved one-off):

```bash
git push github-deploy <sha>:main
```

---

## What not to do

| Avoid | Why |
|-------|-----|
| Pull “fixes” from GitHub back into Origin as SoT | Inverts authority |
| Add bidirectional remotes “for convenience” | Creates a second SoT |
| Force-push GitHub `main` over existing shared history | Destructive; only if repo is empty and CoS approves |
| Create extra mirror repos | Founder authorized `ezanglo/blank-itsm` only |
| Commit secrets or Neon URLs to either remote | Security / policy |

---

## Other scripts

`scripts/mirror-origin-blank-itsm.sh` mirrors Origin temp → another **Origin** repo (`ezraanglo/blank-itsm` on Origin). That is **not** the GitHub deploy mirror.

---

## Verification after push

1. GitHub `main` tip matches intended Origin SHA:  
   `git ls-remote https://github.com/ezanglo/blank-itsm.git refs/heads/main`
2. Vercel deployment triggers (or manual redeploy).
3. Production/Preview env vars match the deployment URL (`BETTER_AUTH_*` — see `ops/DEPLOY_FREE_NEON_VERCEL.md`).

---

## Related

- `architecture/DEPLOY_FREE_TIER.md` §3  
- `ops/DEPLOY_FREE_NEON_VERCEL.md`
