#!/usr/bin/env bash
set -u
cd /home/naim/.openclaw/workspace/tradeclaw || exit 99
STATE_FILE="scripts/.scanner-engine-failcount"
LOG_FILE="scripts/signal-errors.log"
TMP_OUT=$(mktemp)
if python3 scripts/scanner-engine.py >"$TMP_OUT" 2>&1; then
  printf "0" > "$STATE_FILE"
  rm -f "$TMP_OUT"
  exit 0
else
  status=$?
  count=0
  if [ -f "$STATE_FILE" ]; then
    count=$(cat "$STATE_FILE" 2>/dev/null || printf "0")
  fi
  case "$count" in ''|*[!0-9]*) count=0 ;; esac
  count=$((count+1))
  printf "%s" "$count" > "$STATE_FILE"
  ts=$(TZ=Asia/Singapore date "+%Y-%m-%d %H:%M:%S %Z")
  {
    printf "[%s] scanner-engine failed (exit %s, consecutive %s)\n" "$ts" "$status" "$count"
    cat "$TMP_OUT"
    printf "\n"
  } >> "$LOG_FILE"
  cat "$TMP_OUT"
  rm -f "$TMP_OUT"
  exit "$status"
fi
