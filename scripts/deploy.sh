#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
DEPLOY_DEFAULT="portfolio:/var/www/portfolio/"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MANIFEST="$PROJECT_ROOT/deploy.manifest.json"

# --- Parse flags & positional args ---
DRY_RUN=true
DEPLOY_TARGET="$DEPLOY_DEFAULT"
for arg in "$@"; do
  if [[ "$arg" == "--confirm" ]]; then
    DRY_RUN=false
  elif [[ "$arg" != -* ]]; then
    DEPLOY_TARGET="$arg"
  fi
done

# --- Validate ---
if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: deploy.manifest.json not found at $MANIFEST" >&2
  exit 1
fi

if ! command -v ssh &>/dev/null; then
  echo "ERROR: ssh not found. Install Git for Windows or OpenSSH." >&2
  exit 1
fi

# --- Parse deploy target ---
REMOTE_HOST="${DEPLOY_TARGET%%:*}"
REMOTE_PATH="${DEPLOY_TARGET#*:}"

# --- Build asset file list from manifest ---
ASSET_LIST=$(mktemp)
trap 'rm -f "$ASSET_LIST"' EXIT

echo "[1/6] Reading manifest..."

IN_ARRAY=false
while IFS= read -r line; do
  if [[ "$line" =~ \"assets\" ]]; then
    IN_ARRAY=true
    continue
  fi
  if $IN_ARRAY; then
    [[ "$line" == *']'* ]] && IN_ARRAY=false && continue
    val=$(echo "$line" | sed -n 's/.*"\([^"]*\)".*/\1/p')
    [[ -z "$val" ]] && continue
    if [[ "$val" == */'**' ]]; then
      DIR="${val%/**}"
      if [[ -d "$PROJECT_ROOT/$DIR" ]]; then
        (cd "$PROJECT_ROOT" && find "$DIR" -type f) >> "$ASSET_LIST"
      else
        echo "  WARNING: directory not found: $DIR" >&2
      fi
    else
      echo "$val" >> "$ASSET_LIST"
    fi
  fi
done < "$MANIFEST"

ASSET_COUNT=$(wc -l < "$ASSET_LIST" | tr -d ' ')
if [[ "$ASSET_COUNT" -eq 0 ]]; then
  echo "ERROR: No files found in manifest. Check deploy.manifest.json" >&2
  exit 1
fi

echo "      $ASSET_COUNT asset files in manifest"
echo ""

echo "[2/6] Target: $DEPLOY_TARGET"
echo ""

if $DRY_RUN; then
  echo "[3/6] DRY RUN — preview of changes:"
  echo ""
  echo "--- Project source files (excluding node_modules, .next, .git, public/models, public/HDRI): ---"
  (cd "$PROJECT_ROOT" && tar \
    --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='.env*.local' \
    --exclude='public/models' --exclude='public/HDRI' \
    -cf - . | tar -tf -) 2>/dev/null | head -60
  echo ""
  echo "--- Built output (.next/): ---"
  if [[ -d "$PROJECT_ROOT/.next" ]]; then
    echo "  (built output will be synced)"
  else
    echo "  WARNING: .next/ not found — run 'pnpm build' first"
  fi
  echo ""
  echo "--- Manifest asset files ($ASSET_COUNT files): ---"
  (cd "$PROJECT_ROOT" && tar -cf - -T "$ASSET_LIST" | tar -tf -) 2>/dev/null
  echo ""
  echo "[4/6] Local build: pnpm build"
  echo "[5/6] Post-deploy on server: cd $REMOTE_PATH && pnpm install && pm2 restart portfolio"
  echo ""
  echo "[6/6] Dry run complete. No changes made."
  echo "      Run with --confirm to deploy."
else
  echo "[3/6] Building locally..."
  (cd "$PROJECT_ROOT" && pnpm build) || { echo "ERROR: Build failed" >&2; exit 1; }
  echo ""

  echo "[4/6] Syncing project source..."
  (cd "$PROJECT_ROOT" && tar \
    --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='.env*.local' \
    --exclude='public/models' --exclude='public/HDRI' \
    -cf - .) | ssh "$REMOTE_HOST" "cd '$REMOTE_PATH' && tar -xf -"

  echo "      Syncing built output (.next/)..."
  (cd "$PROJECT_ROOT" && tar \
    --exclude='node_modules' --exclude='.git' \
    -cf - .next) | ssh "$REMOTE_HOST" "cd '$REMOTE_PATH' && tar -xf -"

  echo "[5/6] Syncing $ASSET_COUNT asset files..."
  ssh "$REMOTE_HOST" "rm -rf '$REMOTE_PATH/public/models' '$REMOTE_PATH/public/HDRI'"
  (cd "$PROJECT_ROOT" && tar -cf - -T "$ASSET_LIST") | ssh "$REMOTE_HOST" "cd '$REMOTE_PATH' && tar -xf -"

  echo "      Installing dependencies on server..."
  ssh "$REMOTE_HOST" "cd '$REMOTE_PATH' && pnpm install --prod --ignore-scripts"
  echo "      Restarting portfolio..."
  ssh "$REMOTE_HOST" "cd '$REMOTE_PATH' && pm2 restart portfolio 2>/dev/null || pm2 start node_modules/next/dist/bin/next --name portfolio -- start && pm2 save"
  echo ""
  echo "[6/6] Deploy complete."
fi
