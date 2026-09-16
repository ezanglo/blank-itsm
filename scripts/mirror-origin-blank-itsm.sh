#!/usr/bin/env bash
# Mirror ezraanglo/tmp-24caffaea01e301c → ezraanglo/blank-itsm on Origin.
set -euo pipefail

OLD_REPO="ezraanglo/tmp-24caffaea01e301c"
NEW_REPO="ezraanglo/blank-itsm"
NEW_URL="https://origin.cursor.com/git/${NEW_REPO}.git"

if ! origin repo view "$NEW_REPO" &>/dev/null; then
  echo "Creating Origin repository ${NEW_REPO}..."
  origin repo create blank-itsm --repo "$NEW_REPO" --default-branch main
fi

git fetch origin
git remote remove blank-itsm 2>/dev/null || true
git remote add blank-itsm "$NEW_URL"

echo "Pushing main..."
git push blank-itsm "refs/remotes/origin/main:refs/heads/main"

while read -r ref; do
  branch="${ref#origin/}"
  [[ "$branch" == "HEAD" ]] && continue
  [[ "$branch" == "main" ]] && continue
  echo "Pushing ${branch}..."
  git push blank-itsm "refs/remotes/origin/${branch}:refs/heads/${branch}"
done < <(git for-each-ref --format='%(refname:short)' refs/remotes/origin/)

echo "Done. main tip: $(git rev-parse origin/main)"
