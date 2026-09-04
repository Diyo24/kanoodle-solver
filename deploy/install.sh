#!/usr/bin/env bash
# Install the Kanoodle solver as a system service on the Jetson.
#
#   sudo bash deploy/install.sh
#
# Installs the built binary and GUI to /opt/kanoodle, registers systemd
# units for the server and a Cloudflare Quick Tunnel, and starts both.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "This script needs root. Run: sudo bash $0" >&2
  exit 1
fi

TARGET_USER="${SUDO_USER:-$(logname 2>/dev/null || echo root)}"
USER_HOME="$(getent passwd "$TARGET_USER" | cut -d: -f6)"
SRC="${SRC:-$USER_HOME/kanoodle-solver}"

echo "==> user=$TARGET_USER  source=$SRC"

# --- locate the built binary -------------------------------------------------
BIN_SRC="$(find "$SRC/haskell-solver/dist-newstyle" -type f -name kanoodle-solver -perm -u+x 2>/dev/null | head -1)"
if [ -z "$BIN_SRC" ]; then
  echo "No built binary under $SRC/haskell-solver/dist-newstyle." >&2
  echo "Build it first:  cd $SRC/haskell-solver && cabal build" >&2
  exit 1
fi
echo "==> binary: $BIN_SRC"

# --- the -dev packages, so builds no longer rely on ~/.local/lib symlinks ----
if command -v apt-get >/dev/null; then
  echo "==> installing build dependencies"
  apt-get update -qq
  apt-get install -y -qq curl libgmp-dev libnuma-dev libncurses-dev pkg-config
fi

# --- install files -----------------------------------------------------------
install -d /opt/kanoodle/bin
install -m 0755 "$BIN_SRC" /opt/kanoodle/bin/kanoodle-solver
rm -rf /opt/kanoodle/gui
cp -r "$SRC/gui" /opt/kanoodle/gui
chmod -R a+rX /opt/kanoodle

if [ -x "$USER_HOME/bin/cloudflared" ]; then
  install -m 0755 "$USER_HOME/bin/cloudflared" /usr/local/bin/cloudflared
fi

# --- services ----------------------------------------------------------------
install -m 0644 "$SRC/deploy/kanoodle.service" /etc/systemd/system/kanoodle.service
install -m 0644 "$SRC/deploy/cloudflared-quick.service" /etc/systemd/system/cloudflared-quick.service

# Auto-deploy: poll git, rebuild, restart the server on a new commit.
if [ -d "$SRC/.git" ]; then
  install -m 0755 "$SRC/deploy/auto-deploy.sh" /opt/kanoodle/auto-deploy.sh
  sed "s/^Environment=BUILD_USER=.*/Environment=BUILD_USER=$TARGET_USER/"     "$SRC/deploy/kanoodle-deploy.service" > /etc/systemd/system/kanoodle-deploy.service
  install -m 0644 "$SRC/deploy/kanoodle-deploy.timer" /etc/systemd/system/kanoodle-deploy.timer
  DEPLOY_TIMER=yes
else
  echo "==> $SRC is not a git clone; skipping the auto-deploy timer"
  DEPLOY_TIMER=no
fi

systemctl daemon-reload
systemctl enable --now kanoodle.service
systemctl enable --now cloudflared-quick.service
[ "$DEPLOY_TIMER" = yes ] && systemctl enable --now kanoodle-deploy.timer

echo
echo "==> waiting for the tunnel to register..."
for _ in $(seq 1 20); do
  URL="$(journalctl -u cloudflared-quick -n 200 --no-pager 2>/dev/null \
        | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1 || true)"
  [ -n "$URL" ] && break
  sleep 2
done

echo
systemctl --no-pager --lines=0 status kanoodle.service      | head -4 || true
systemctl --no-pager --lines=0 status cloudflared-quick.service | head -4 || true
echo
if [ -n "${URL:-}" ]; then
  echo "PUBLIC URL: $URL"
else
  echo "Tunnel URL not found yet. Check: journalctl -u cloudflared-quick | grep trycloudflare"
fi
