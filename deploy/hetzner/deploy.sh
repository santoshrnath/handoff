#!/usr/bin/env bash
# =============================================================================
# ContextBridge — Hetzner one-shot deploy
# =============================================================================
# Run from the project root on your laptop:
#
#   CONTEXTHANDOFF_SSH_HOST=root@1.2.3.4 ./deploy/hetzner/deploy.sh
#
# Optional overrides:
#   CONTEXTHANDOFF_PORT=3071              host port on the server
#   CONTEXTHANDOFF_ENV_FILE=.env.local    where the secrets live on your laptop
#   REMOTE_DIR=/opt/contexthandoff        target dir on the server
#   CONTEXTHANDOFF_REPO=https://github.com/santoshrnath/contexthandoff.git
#   CONTEXTHANDOFF_BRANCH=main
#
# What it does:
#   1. SSH to the server and `git clone` (or fetch + reset) the project.
#   2. scp's your local .env.local to the server as .env.
#   3. docker compose up -d --build on the server.
#   4. prisma db push to apply the schema.
# =============================================================================
set -euo pipefail

: "${CONTEXTHANDOFF_SSH_HOST:?Set CONTEXTHANDOFF_SSH_HOST=user@ip (e.g. root@1.2.3.4)}"
CONTEXTHANDOFF_PORT="${CONTEXTHANDOFF_PORT:-3071}"
CONTEXTHANDOFF_ENV_FILE="${CONTEXTHANDOFF_ENV_FILE:-.env.local}"
REMOTE_DIR="${REMOTE_DIR:-/opt/contexthandoff}"
CONTEXTHANDOFF_REPO="${CONTEXTHANDOFF_REPO:-https://github.com/santoshrnath/handoff.git}"
CONTEXTHANDOFF_BRANCH="${CONTEXTHANDOFF_BRANCH:-main}"

if [ ! -f "$CONTEXTHANDOFF_ENV_FILE" ]; then
  echo "✗ Missing env file at $CONTEXTHANDOFF_ENV_FILE" >&2
  echo "  Copy .env.example to .env.local and fill in keys at minimum." >&2
  exit 1
fi

echo "→ Project: contexthandoff"
echo "→ Target:  $CONTEXTHANDOFF_SSH_HOST:$REMOTE_DIR"
echo "→ Port:    $CONTEXTHANDOFF_PORT"
echo "→ Repo:    $CONTEXTHANDOFF_REPO ($CONTEXTHANDOFF_BRANCH)"
echo

echo "▸ git sync on server"
ssh "$CONTEXTHANDOFF_SSH_HOST" "set -e; \
  mkdir -p $REMOTE_DIR; \
  cd $REMOTE_DIR; \
  if [ -d .git ]; then \
    echo '  [update]'; \
    git fetch --depth=1 origin $CONTEXTHANDOFF_BRANCH && git reset --hard origin/$CONTEXTHANDOFF_BRANCH; \
  else \
    echo '  [clone]'; \
    git clone --depth=1 -b $CONTEXTHANDOFF_BRANCH $CONTEXTHANDOFF_REPO .; \
  fi; \
  git log -1 --oneline"

echo "▸ writing .env on server (from $CONTEXTHANDOFF_ENV_FILE)"
scp "$CONTEXTHANDOFF_ENV_FILE" "$CONTEXTHANDOFF_SSH_HOST:$REMOTE_DIR/.env"

echo "▸ docker compose up -d --build"
ssh "$CONTEXTHANDOFF_SSH_HOST" \
  "cd $REMOTE_DIR && CONTEXTHANDOFF_PORT=$CONTEXTHANDOFF_PORT docker compose up -d --build"

echo "▸ prisma db push"
# Invoke prisma via `node node_modules/prisma/build/index.js` rather than
# `.bin/prisma` — the bin shim can't resolve its sibling .wasm files in the
# slim runner image.
ssh "$CONTEXTHANDOFF_SSH_HOST" \
  "cd $REMOTE_DIR && docker compose exec -T contexthandoff-app node node_modules/prisma/build/index.js db push --skip-generate || true"

HOST_IP="${CONTEXTHANDOFF_SSH_HOST#*@}"
PUBLIC_HOST=$(grep -E '^PUBLIC_HOSTNAME=' "$CONTEXTHANDOFF_ENV_FILE" | head -n1 | cut -d= -f2-)
PUBLIC_HOST="${PUBLIC_HOST:-handover.oneplaceplatform.com}"

echo
echo "✓ Deployed."
echo "  Public (via Traefik): https://${PUBLIC_HOST}"
echo "  Direct (smoke test):  http://${HOST_IP}:${CONTEXTHANDOFF_PORT}"
echo
echo "  Tail logs with:  ssh ${CONTEXTHANDOFF_SSH_HOST} 'cd ${REMOTE_DIR} && docker compose logs -f'"
