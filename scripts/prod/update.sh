#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_SCRIPT="$ROOT_DIR/scripts/prod/deploy.sh"
BRANCH="${BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)}"

cd "$ROOT_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required but not installed." >&2
  exit 1
fi

if [[ ! -x "$DEPLOY_SCRIPT" ]]; then
  echo "Error: deploy script is missing or not executable: $DEPLOY_SCRIPT" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: git working tree is dirty. Commit/stash changes before update." >&2
  exit 1
fi

echo "[update] Fetching latest changes for branch '$BRANCH'..."
git fetch --all --prune

git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[update] Running deployment..."
"$DEPLOY_SCRIPT"

echo "[update] Pruning dangling images..."
docker image prune -f >/dev/null || true

echo "[update] Done."
