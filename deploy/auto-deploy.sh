#!/usr/bin/env bash
# Pull the latest commit, rebuild, and restart the server if the build works.
# Run as root (via kanoodle-deploy.service); git and cabal run as BUILD_USER,
# whose home holds the ghcup toolchain and the cabal store.
set -euo pipefail

BUILD_USER="${BUILD_USER:-esel}"
BRANCH="${BRANCH:-release}"
USER_HOME="$(getent passwd "$BUILD_USER" | cut -d: -f6)"
SRC="${SRC:-$USER_HOME/kanoodle-solver}"

# runuser keeps the caller's environment, so HOME would still be /root and
# git would look for ssh keys and config in the wrong place.
as_user() { runuser -u "$BUILD_USER" -- env HOME="$USER_HOME" "$@"; }

[ -d "$SRC/.git" ] || { echo "$SRC is not a git clone"; exit 1; }

as_user git -C "$SRC" fetch --quiet origin "$BRANCH"
LOCAL="$(as_user git -C "$SRC" rev-parse HEAD)"
REMOTE="$(as_user git -C "$SRC" rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "already at ${LOCAL:0:8}, nothing to do"
  exit 0
fi

echo "deploying ${LOCAL:0:8} -> ${REMOTE:0:8}"
as_user git -C "$SRC" reset --hard "origin/$BRANCH"

# Build first. If this fails the running service is left untouched, so a
# broken commit takes the site down only if it also compiles.
echo "building..."
if ! as_user env HOME="$USER_HOME" bash -lc \
      "export PATH=\"$USER_HOME/.ghcup/bin:\$PATH\"; cd '$SRC/haskell-solver' && cabal build"; then
  echo "BUILD FAILED at ${REMOTE:0:8} -- keeping the running version"
  exit 1
fi

BIN_SRC="$(as_user env HOME="$USER_HOME" bash -lc \
  "export PATH=\"$USER_HOME/.ghcup/bin:\$PATH\"; cd '$SRC/haskell-solver' && cabal list-bin kanoodle-solver" | tail -1)"
[ -x "$BIN_SRC" ] || { echo "no binary at $BIN_SRC"; exit 1; }

install -d /opt/kanoodle/bin
install -m 0755 "$BIN_SRC" /opt/kanoodle/bin/kanoodle-solver
rm -rf /opt/kanoodle/gui
cp -r "$SRC/gui" /opt/kanoodle/gui
chmod -R a+rX /opt/kanoodle

# Only the server. Restarting cloudflared would change the public URL.
systemctl restart kanoodle.service
sleep 3
systemctl is-active --quiet kanoodle.service \
  && echo "deployed ${REMOTE:0:8}" \
  || { echo "service failed to start after deploy"; journalctl -u kanoodle -n 15 --no-pager; exit 1; }
