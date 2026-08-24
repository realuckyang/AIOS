#!/bin/sh

set -eu

REPO_URL="${AIOS_REPO_URL:-https://github.com/valueriver/AIOS.git}"
REPO_REF="${AIOS_REPO_REF:-main}"
INSTALL_ROOT="${AIOS_INSTALL_ROOT:-$HOME/.aios}"
REPO_DIR="$INSTALL_ROOT/repo"
APP_DIR="$INSTALL_ROOT/app"
LOG_DIR="$INSTALL_ROOT/logs"
RUN_DIR="$INSTALL_ROOT/run"
SERVER_LOG="$LOG_DIR/server.log"
APPS_LOG="$LOG_DIR/apps.log"
SERVER_PID_FILE="$RUN_DIR/server.pid"
APPS_PID_FILE="$RUN_DIR/apps.pid"
SERVER_PORT="${AIOS_SERVER_PORT:-9502}"
APPS_PORT="${AIOS_APPS_PORT:-9503}"
NODE_MAJOR_REQUIRED=20

log() {
  printf '%s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

have() {
  command -v "$1" >/dev/null 2>&1
}

check_macos() {
  os_name="$(uname -s 2>/dev/null || true)"
  [ "$os_name" = "Darwin" ] || fail "This installer is for macOS only."
}

# === Homebrew ===
# 没装就装。Apple Silicon 默认在 /opt/homebrew,Intel 在 /usr/local
ensure_brew() {
  if have brew; then return; fi
  log "Installing Homebrew (will prompt for sudo password)"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" </dev/tty
  # 装完不一定在 PATH,补一下
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  have brew || fail "Homebrew install completed but 'brew' not on PATH."
}

ensure_command() {
  cmd="$1"
  pkg="${2:-$1}"
  if ! have "$cmd"; then
    log "Installing $pkg via brew"
    brew install "$pkg" >/dev/null
  fi
}

# === Node.js ===
node_major() {
  v="$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)"
  case "$v" in
    ''|*[!0-9]*) printf 0 ;;
    *)           printf '%s' "$v" ;;
  esac
}

ensure_node() {
  need=0
  if ! have node; then
    need=1
  elif [ "$(node_major)" -lt "$NODE_MAJOR_REQUIRED" ]; then
    log "Node.js $(node -v) too old, need >= $NODE_MAJOR_REQUIRED"
    need=1
  fi
  [ "$need" -eq 0 ] && return 0

  log "Installing Node.js $NODE_MAJOR_REQUIRED via brew"
  brew install "node@${NODE_MAJOR_REQUIRED}" >/dev/null
  # node@20 是 keg-only,得 link 或手动加 PATH
  brew_prefix="$(brew --prefix node@${NODE_MAJOR_REQUIRED} 2>/dev/null)"
  if [ -n "$brew_prefix" ] && [ -x "$brew_prefix/bin/node" ]; then
    PATH="$brew_prefix/bin:$PATH"
    export PATH
  fi

  if ! have node || [ "$(node_major)" -lt "$NODE_MAJOR_REQUIRED" ]; then
    fail "Node.js install completed but version check failed. Try: brew link --overwrite --force node@${NODE_MAJOR_REQUIRED}"
  fi
  log "Node.js: $(node -v)"
}

bootstrap_prereqs() {
  ensure_brew
  ensure_command curl
  ensure_command git
  ensure_command rsync
  ensure_node
}

ensure_dirs() {
  mkdir -p "$INSTALL_ROOT" "$LOG_DIR" "$RUN_DIR"
}

update_repo() {
  if [ -d "$REPO_DIR/.git" ]; then
    log "Updating repository in $REPO_DIR"
    git -C "$REPO_DIR" fetch origin "$REPO_REF"
    git -C "$REPO_DIR" checkout "$REPO_REF"
    git -C "$REPO_DIR" pull --ff-only origin "$REPO_REF"
  else
    log "Cloning repository into $REPO_DIR"
    git clone --branch "$REPO_REF" --depth 1 "$REPO_URL" "$REPO_DIR"
  fi
  [ -f "$REPO_DIR/package.json" ] || fail "AIOS source package.json not found: $REPO_DIR/package.json"
}

sync_app() {
  log "Syncing runtime copy to $APP_DIR"
  mkdir -p "$APP_DIR"
  rsync -a --delete \
    --exclude '/.git' \
    --exclude '/node_modules' \
    --exclude '/database' \
    --exclude '/files' \
    --exclude '/.aios' \
    --exclude '.DS_Store' \
    "$REPO_DIR/" "$APP_DIR/"
  [ -f "$APP_DIR/package.json" ] || fail "AIOS runtime package.json not found: $APP_DIR/package.json"
}

clear_language_bake_marker() {
  rm -f "$APP_DIR/.aios/settings.json"
}

port_in_use() {
  port="$1"
  if have lsof; then
    if lsof -n -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

stop_pid_file() {
  pid_file="$1"
  name="$2"
  if [ ! -f "$pid_file" ]; then
    return 0
  fi
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
    log "Stopping previous $name process ($pid)"
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  fi
  rm -f "$pid_file"
}

verify_ports_free() {
  if port_in_use "$SERVER_PORT"; then
    fail "Port $SERVER_PORT is already in use. Stop the existing process and retry."
  fi
  if port_in_use "$APPS_PORT"; then
    fail "Port $APPS_PORT is already in use. Stop the existing process and retry."
  fi
}

install_dependencies() {
  log "Installing npm dependencies"
  (
    cd "$APP_DIR"
    npm install
  )
}

build_app() {
  log "Building UI"
  (
    cd "$APP_DIR"
    npm run build
  )
}

remove_runtime_language_sources() {
  rm -rf "$APP_DIR/language"
}

start_services() {
  log "Starting AIOS server"
  (
    cd "$APP_DIR"
    AIOS_APPS_PORT="$APPS_PORT" nohup node server/main/index.js --port="$SERVER_PORT" >"$SERVER_LOG" 2>&1 &
    printf '%s' "$!" >"$SERVER_PID_FILE"
  )

  log "Starting AIOS apps service"
  (
    cd "$APP_DIR"
    AIOS_MAIN_PORT="$SERVER_PORT" nohup node server/apps/index.js --port="$APPS_PORT" >"$APPS_LOG" 2>&1 &
    printf '%s' "$!" >"$APPS_PID_FILE"
  )
}

wait_for_http() {
  url="$1"
  name="$2"
  attempts=30
  i=0
  while [ "$i" -lt "$attempts" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  log "$name failed health check."
  return 1
}

print_failure_logs() {
  if [ -f "$SERVER_LOG" ]; then
    log "--- server.log ---"
    tail -n 40 "$SERVER_LOG" || true
  fi
  if [ -f "$APPS_LOG" ]; then
    log "--- apps.log ---"
    tail -n 40 "$APPS_LOG" || true
  fi
}

main() {
  check_macos
  bootstrap_prereqs
  ensure_dirs
  update_repo
  sync_app
  clear_language_bake_marker
  install_dependencies
  build_app
  remove_runtime_language_sources
  stop_pid_file "$SERVER_PID_FILE" "server"
  stop_pid_file "$APPS_PID_FILE" "apps"
  verify_ports_free
  start_services
  if ! wait_for_http "http://127.0.0.1:$SERVER_PORT/api/health" "AIOS server"; then
    print_failure_logs
    fail "Server did not become healthy."
  fi
  if ! wait_for_http "http://127.0.0.1:$APPS_PORT/apps/health" "AIOS apps service"; then
    print_failure_logs
    fail "Apps service did not become healthy."
  fi
  log ""
  log "AIOS installed successfully."
  log "Open: http://localhost:$SERVER_PORT"
  log "Repo: $REPO_DIR"
  log "Logs: $LOG_DIR"
}

main "$@"
