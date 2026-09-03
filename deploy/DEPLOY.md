# Deploying to a Jetson Xavier NX

The server serves both the API (`POST /solve`) and the GUI from one origin, so
there is no CORS configuration and no separate static host.

## 1. Toolchain on the Xavier (aarch64)

```sh
curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | sh
ghcup install ghc 9.4.8 && ghcup set ghc 9.4.8
ghcup install cabal --set
```

Needs ~10 GB free. Check with `df -h /` before starting — the stock eMMC is
tight. Building the servant/warp tree on Carmel cores takes noticeably longer
than on a desktop.

## 2. Build

```sh
git clone <your-repo> ~/kanoodle-solver && cd ~/kanoodle-solver/haskell-solver
cabal update
cabal build
cabal list-bin kanoodle-solver   # prints the binary path
```

## 3. Install

```sh
sudo mkdir -p /opt/kanoodle/bin
sudo cp "$(cabal list-bin kanoodle-solver)" /opt/kanoodle/bin/
sudo cp -r ~/kanoodle-solver/gui /opt/kanoodle/gui

sudo cp ~/kanoodle-solver/deploy/kanoodle.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kanoodle
systemctl status kanoodle
```

Verify locally before exposing it:

```sh
curl -sS localhost:8080/ | head -5          # GUI
curl -sS -X POST localhost:8080/solve \
  -H 'Content-Type: application/json' \
  -d '{"board":[],"pieces":[]}'             # API
```

## 4. Expose via Cloudflare Tunnel

No router ports are opened and your home IP stays private. TLS terminates at
Cloudflare, which is what makes the browser accept the page at all.

```sh
# arm64 build
curl -L -o cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb

cloudflared tunnel login
cloudflared tunnel create kanoodle
cloudflared tunnel route dns kanoodle kanoodle.example.com
```

Copy `deploy/cloudflared-config.yml` to `/etc/cloudflared/config.yml`, fill in
the tunnel ID and hostname, then:

```sh
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

## Configuration

The server reads these at startup; the systemd unit sets all four.

| Variable | Default | Purpose |
|---|---|---|
| `KANOODLE_HOST` | `127.0.0.1` | Bind address. Loopback keeps it off the LAN. |
| `KANOODLE_PORT` | `8080` | Listen port. |
| `KANOODLE_STATIC_DIR` | `../gui` | Directory served at `/`. |
| `KANOODLE_TIMEOUT_SECONDS` | `10` | Abandons a search that runs long. |

## Updating

```sh
cd ~/kanoodle-solver && git pull
cd haskell-solver && cabal build
sudo systemctl stop kanoodle
sudo cp "$(cabal list-bin kanoodle-solver)" /opt/kanoodle/bin/
sudo cp -r ~/kanoodle-solver/gui/. /opt/kanoodle/gui/
sudo systemctl start kanoodle
```
