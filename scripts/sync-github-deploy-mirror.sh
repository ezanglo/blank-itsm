#!/usr/bin/env bash
# One-way deploy mirror: Origin SoT → GitHub (Vercel build input).
#   Origin (canonical): ezraanglo/tmp-24caffaea01e301c
#   GitHub (mirror):    ezanglo/blank-itsm
#
# Usage: ./scripts/sync-github-deploy-mirror.sh [ref]
#   ref defaults to origin/main (e.g. origin/main or a local branch name)
set -euo pipefail

GITHUB_MIRROR_URL="https://github.com/ezanglo/blank-itsm.git"
REMOTE_NAME="github-deploy"
SOURCE_REF="${1:-origin/main}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! git remote get-url origin &>/dev/null; then
  echo "sync-github-deploy-mirror: origin remote missing — clone from Origin SoT first." >&2
  exit 1
fi

echo "Fetching origin..."
git fetch origin

if git remote get-url "$REMOTE_NAME" &>/dev/null; then
  current="$(git remote get-url "$REMOTE_NAME")"
  if [[ "$current" != "$GITHUB_MIRROR_URL" ]]; then
    echo "sync-github-deploy-mirror: updating $REMOTE_NAME URL to ezanglo/blank-itsm." >&2
    git remote set-url "$REMOTE_NAME" "$GITHUB_MIRROR_URL"
  fi
else
  echo "Adding remote $REMOTE_NAME → ezanglo/blank-itsm"
  git remote add "$REMOTE_NAME" "$GITHUB_MIRROR_URL"
fi

if ! git rev-parse --verify "$SOURCE_REF" &>/dev/null; then
  echo "sync-github-deploy-mirror: ref '$SOURCE_REF' not found." >&2
  exit 1
fi

SHA="$(git rev-parse "$SOURCE_REF")"
echo "Pushing $SOURCE_REF ($SHA) → github-deploy main (fast-forward only)..."
git push "$REMOTE_NAME" "${SHA}:refs/heads/main"

echo "Done. GitHub main should be at $SHA"
echo "Verify: git ls-remote $GITHUB_MIRROR_URL refs/heads/main"
