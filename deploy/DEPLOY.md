# Deploying to a Jetson Xavier NX

The server serves both the API (`POST /solve`) and the GUI from one origin,
so there is no CORS configuration and no separate static host.

Tested on: Ubuntu 20.04.6 aarch64 (JetPack), GHC 9.4.8, cabal 3.16.

## 1. Toolchain

ghcup installs entirely under `$HOME` and needs no root:

```sh
mkdir -p ~/.ghcup/bin
wget -q -O ~/.ghcup/bin/ghcup https://downloads.haskell.org/~ghcup/aarch64-linux-ghcup
chmod +x ~/.ghcup/bin/ghcup
export PATH="$HOME/.ghcup/bin:$PATH"

ghcup config set downloader Wget   # only needed if curl is absent
ghcup install ghc 9.4.8 && ghcup set ghc 9.4.8
ghcup install cabal --set
```

GHC links against `libgmp`, `libnuma` and `libtinfo`. If you have root, the
`-dev` packages provide them:

```sh
sudo apt-get install -y curl libgmp-dev libnuma-dev libncurses-dev pkg-config
```

**Without root**, the `-dev` packages are only supplying unversioned symlinks,
and you can create those yourself — the shared objects are already present on
a stock JetPack image:

```sh
mkdir -p ~/.local/lib
ln -sf /lib/aarch64-linux-gnu/libgmp.so.10  ~/.local/lib/libgmp.so
ln -sf /lib/aarch64-linux-gnu/libnuma.so.1  ~/.local/lib/libnuma.so
ln -sf /lib/aarch64-linux-gnu/libtinfo.so.6 ~/.local/lib/libtinfo.so
export LIBRARY_PATH="$HOME/.local/lib:$LIBRARY_PATH"
```

`LIBRARY_PATH` matters: `cabal build --extra-lib-dirs=...` applies only to the
local package, not to the ~90 dependencies, so it is not enough on its own.

## 2. Build

```sh
cd ~/kanoodle-solver/haskell-solver
cabal update
cabal build          # keep LIBRARY_PATH exported if you used the symlinks
cabal list-bin kanoodle-solver
```

Expect this to take a while on six Carmel cores.

## 3a. Install as a system service (needs root)

```sh
sudo bash ~/kanoodle-solver/deploy/install.sh
```

Copies the binary and GUI to `/opt/kanoodle`, installs `kanoodle.service` and
`cloudflared-quick.service`, starts both, and prints the public URL. This is
the only option that survives a reboot.

## 3b. Run without root

```sh
cd ~/kanoodle-solver/haskell-solver
export KANOODLE_STATIC_DIR="$HOME/kanoodle-solver/gui"
setsid nohup "$(cabal list-bin kanoodle-solver)" > ~/server.log 2>&1 < /dev/null &
setsid nohup ~/bin/cloudflared tunnel --url http://localhost:8080 > ~/tunnel.log 2>&1 < /dev/null &
grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' ~/tunnel.log | head -1
```

`setsid` and the stdin redirect matter — without them the processes die with
your ssh session, or hold it open so it never returns.

Verify locally either way:

```sh
wget -qO- http://127.0.0.1:8080/ | head -3
wget -qO- --header='Content-Type: application/json' \
  --post-data='{"board":[],"pieces":[]}' http://127.0.0.1:8080/solve
```

## 4. Exposing it

`cloudflared` runs fine as a plain user binary — the `.deb` is not required:

```sh
mkdir -p ~/bin
wget -q -O ~/bin/cloudflared \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64
chmod +x ~/bin/cloudflared
```

A **Quick Tunnel** needs no account and no domain, but its hostname is random
and changes on every restart:

```sh
journalctl -u cloudflared-quick | grep trycloudflare   # current URL
```

If you later buy a domain and delegate it to Cloudflare, switch to a **named**
tunnel for a stable hostname — see `cloudflared-config.yml`:

```sh
cloudflared tunnel login
cloudflared tunnel create kanoodle
cloudflared tunnel route dns kanoodle kanoodle.example.com
```

Neither form opens a router port or exposes your home IP.

## 5. Automatic redeploy on release

`install.sh` registers a timer that polls GitHub every five minutes and
watches the **`release` branch**, not `main`. On a new commit there it pulls,
rebuilds, and restarts the server — but only if the build succeeded, so a
commit that fails to compile leaves the running version up.

Day-to-day work on `main` never touches the live site. Publishing is a
deliberate act:

```sh
git checkout release && git merge main && git push origin release
```

Within five minutes the board picks it up. Note that compiling is the only
gate — nothing verifies the solver is correct, so test before promoting.

This requires the checkout on the board to be a real clone:

```sh
cd ~/kanoodle-solver
git init -q
git remote add origin https://github.com/Diyo24/kanoodle-solver.git
git fetch origin release
git checkout -B release origin/release
```

Watch it:

```sh
systemctl list-timers kanoodle-deploy   # when it next runs
journalctl -u kanoodle-deploy -n 30     # what it did
sudo systemctl start kanoodle-deploy    # force a run now
```

The tunnel is deliberately left alone during a redeploy. `cloudflared-quick`
uses `Wants=` rather than `Requires=` on the server, so restarting the server
does not stop the tunnel — otherwise every deploy would hand out a new
`trycloudflare.com` hostname.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `KANOODLE_HOST` | `127.0.0.1` | Bind address. Loopback keeps it off the LAN. |
| `KANOODLE_PORT` | `8080` | Listen port. |
| `KANOODLE_STATIC_DIR` | `../gui` | Directory served at `/`. |
| `KANOODLE_TIMEOUT_SECONDS` | `10` | Abandons a search that runs long. |

The solve timeout needs the threaded RTS; the executable is built with
`-threaded` for exactly this reason. Without it every request fails in
`getSystemTimerManager`.

## Updating

```sh
cd ~/kanoodle-solver && git pull
cd haskell-solver && cabal build
sudo bash ~/kanoodle-solver/deploy/install.sh    # re-installs and restarts
```
