#!/usr/bin/env bash
# StaticsForEngineers: one-shot installer / updater for Ubuntu 22.04 or 24.04.
#
# Run from the unpacked app folder:
#     cd ~/statics-for-engineers && sudo bash deploy/setup.sh
#
# What it does (it is safe to run again to update the app):
#   1. Installs Node.js 24 LTS (NodeSource) if Node 22+ isn't already installed.
#   2. Creates a locked-down system user "staticsforengineers".
#   3. Copies the app to /opt/staticsforengineers (keeps an existing .env and data/).
#   4. Creates .env with a random SESSION_SECRET and asks for the first username/password.
#   5. Installs dependencies, then installs and starts the systemd service.
#   6. Copies the Nginx snippet to /etc/nginx/snippets/staticsforengineers.conf.
# What it does NOT do: edit your existing Nginx site, reload Nginx, or run certbot.
# You add one include line by hand (it prints the steps at the end).
set -euo pipefail

APP_NAME=staticsforengineers
APP_USER=staticsforengineers
APP_DIR=/opt/staticsforengineers
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNIPPET=/etc/nginx/snippets/${APP_NAME}.conf

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Please run with sudo:  sudo bash deploy/setup.sh"
[ -f "$SRC_DIR/server.js" ] || die "Run this from inside the unpacked app folder (server.js not found in $SRC_DIR)."

# ---------------------------------------------------------------- 1. Node.js
say "Checking Node.js"
need_node=1
if command -v node >/dev/null 2>&1; then
  major=$(node -p 'process.versions.node.split(".")[0]')
  if [ "$major" -ge 22 ]; then need_node=0; echo "Found Node $(node -v), OK."; fi
fi
if [ "$need_node" -eq 1 ]; then
  say "Installing Node.js 24 LTS from NodeSource"
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
  echo "Installed Node $(node -v), npm $(npm -v)."
fi
# Compiler tools, used only if better-sqlite3 has to build from source.
if ! command -v g++ >/dev/null 2>&1 || ! command -v make >/dev/null 2>&1; then
  say "Installing build tools (build-essential, python3)"
  apt-get install -y build-essential python3
fi
NODE_BIN="$(command -v node)"

# ---------------------------------------------------------------- 2. user
say "Creating system user '$APP_USER' (if needed)"
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$APP_DIR" --no-create-home --shell /usr/sbin/nologin "$APP_USER"
fi

# ---------------------------------------------------------------- 3. copy app
say "Copying app to $APP_DIR"
mkdir -p "$APP_DIR"
if [ "$(readlink -f "$SRC_DIR")" != "$(readlink -f "$APP_DIR")" ]; then
  # Copy everything except local-only things; never overwrite .env or data/.
  tar -C "$SRC_DIR" --exclude=./node_modules --exclude=./data --exclude=./.env --exclude='./*.db*' -cf - . | tar -C "$APP_DIR" -xf -
fi
mkdir -p "$APP_DIR/data"

# ---------------------------------------------------------------- 4. .env
if [ -f "$APP_DIR/.env" ]; then
  say "Keeping existing $APP_DIR/.env"
else
  say "Creating $APP_DIR/.env"
  echo "Choose the login for the first account (you can add more later)."
  read -r -p "  Username [student]: " U; U=${U:-student}
  while true; do
    read -r -s -p "  Password (min 8 characters): " P1; echo
    read -r -s -p "  Repeat password: " P2; echo
    [ "$P1" = "$P2" ] || { warn "Passwords don't match, try again."; continue; }
    [ ${#P1} -ge 8 ] || { warn "Too short, try again."; continue; }
    case "$P1" in *"'"*) warn "Please don't use the ' (apostrophe) character."; continue;; esac
    break
  done
  # Write .env with Node so any characters in the password are handled safely.
  SFE_U="$U" SFE_P="$P1" "$NODE_BIN" -e '
    const fs = require("fs"), crypto = require("crypto");
    const src = fs.readFileSync(process.argv[1], "utf8");
    const set = { SESSION_SECRET: crypto.randomBytes(48).toString("hex"), DEFAULT_USER: process.env.SFE_U,
                  DEFAULT_PASS: process.env.SFE_P, COOKIE_SECURE: "true" };
    const q = (v) => (/^[A-Za-z0-9._@%+:,\/-]*$/.test(v) ? v : "\x27" + v + "\x27");
    const out = src.split("\n").map((l) => { const m = /^([A-Z_]+)=/.exec(l); return m && m[1] in set ? m[1] + "=" + q(set[m[1]]) : l; }).join("\n");
    fs.writeFileSync(process.argv[2], out, { mode: 0o600 });
  ' "$APP_DIR/.env.example" "$APP_DIR/.env"
  unset P1 P2 SFE_P
  echo "Wrote .env (the password is only used to create the account on first start;"
  echo "you may delete the DEFAULT_PASS line afterwards)."
fi

# ---------------------------------------------------------------- 5. deps + service
say "Installing dependencies (npm ci --omit=dev)"
cd "$APP_DIR"
if ! npm ci --omit=dev --no-audit --no-fund; then
  warn "npm ci failed; retrying with a source build of better-sqlite3"
  npm ci --omit=dev --no-audit --no-fund --build-from-source
fi
"$NODE_BIN" -e 'require("better-sqlite3")(":memory:").close()' || die "better-sqlite3 did not load. See README > Troubleshooting."

chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 600 "$APP_DIR/.env"
chmod 700 "$APP_DIR/data"

say "Installing systemd service"
sed "s#/usr/bin/node#${NODE_BIN}#" "$APP_DIR/deploy/${APP_NAME}.service" > /etc/systemd/system/${APP_NAME}.service
systemctl daemon-reload
systemctl enable ${APP_NAME} >/dev/null
systemctl restart ${APP_NAME}

PORT=$(grep -E '^PORT=' "$APP_DIR/.env" | tail -1 | cut -d= -f2); PORT=${PORT:-3117}
BASE=$(grep -E '^BASE_PATH=' "$APP_DIR/.env" | tail -1 | cut -d= -f2-); BASE=${BASE:-/StaticsForEngineers}
ok=0
for i in $(seq 1 40); do
  if curl -sf -o /dev/null "http://127.0.0.1:${PORT}${BASE}/healthz"; then ok=1; break; fi
  sleep 0.5
done
if [ "$ok" -eq 1 ]; then echo "App is running on http://127.0.0.1:${PORT}${BASE}/"
else warn "App didn't answer yet. Check:  sudo journalctl -u ${APP_NAME} -n 50"; fi

# ---------------------------------------------------------------- 6. nginx snippet
if [ "${SFE_SKIP_PROXY:-0}" = "1" ]; then
  : # web-server hookup handled by the caller (install-staticsforengineers.sh)
elif [ -d /etc/nginx ]; then
  say "Installing Nginx snippet to $SNIPPET (your site config is NOT changed)"
  mkdir -p /etc/nginx/snippets
  sed -e "s#127.0.0.1:3117#127.0.0.1:${PORT}#" "$APP_DIR/deploy/nginx.conf" > "$SNIPPET"
  if grep -rqs "snippets/${APP_NAME}.conf" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null; then
    echo "The include line is already in your Nginx config. Reloading after a config test..."
    nginx -t && systemctl reload nginx && echo "Nginx reloaded."
  else
    cat <<MSG

------------------------------------------------------------------------
LAST STEP (by hand, about 2 minutes). See README section "Connect Nginx".

  1. Back up your site config:
       sudo cp /etc/nginx/sites-available/performance-video.com ~/nginx-backup-\$(date +%F).conf
     (Not sure of the file name? Run:  grep -rl "server_name.*performance-video.com" /etc/nginx/)

  2. Edit it:   sudo nano /etc/nginx/sites-available/performance-video.com
     In the server { ... } block that has "listen 443 ssl", add this line
     next to the other "location" lines:

         include snippets/${APP_NAME}.conf;

  3. Test, then reload (only reload if the test says "successful"):
       sudo nginx -t && sudo systemctl reload nginx

  4. Visit  https://performance-video.com${BASE}/
------------------------------------------------------------------------
MSG
  fi
else
  warn "Nginx is not installed here; skipped the snippet. See README."
fi
say "Done."
