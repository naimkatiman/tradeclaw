#!/usr/bin/env bash
set -o pipefail
cd /home/naim/.openclaw/workspace/tradeclaw || exit 1
LOG=/home/naim/.openclaw/workspace/tradeclaw/scripts/signal-errors.log
STATE=/home/naim/.openclaw/workspace/tradeclaw/scripts/.signal-engine-failure-count
TMP=$(mktemp)
if python3 scripts/scanner-engine.py >"$TMP" 2>&1; then
  printf "0" > "$STATE"
  rm -f "$TMP"
  exit 0
else
  status=$?
  count=$(cat "$STATE" 2>/dev/null || printf "0")
  case "$count" in
    ''|*[!0-9]*) count=0 ;;
  esac
  count=$((count + 1))
  printf "%s" "$count" > "$STATE"
  ts=$(TZ=Asia/Kuala_Lumpur date +"%Y-%m-%dT%H:%M:%S%z")
  {
    printf "[%s] FAIL #%s — scanner-engine.py exited %s\n" "$ts" "$count" "$status"
    cat "$TMP"
    printf "\n"
  } >> "$LOG"
  cat "$TMP"
  rm -f "$TMP"
  exit "$status"
fi
