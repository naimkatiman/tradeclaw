#!/usr/bin/env bash
set -o pipefail
cd /home/naim/.openclaw/workspace/tradeclaw || exit 1
LOG_FILE="/home/naim/.openclaw/workspace/tradeclaw/scripts/signal-errors.log"
COUNT_FILE="/home/naim/.openclaw/workspace/tradeclaw/scripts/.signal-engine-failure-count"
TMP_OUT=$(mktemp)
if python3 scripts/scanner-engine.py >"$TMP_OUT" 2>&1; then
  printf "0" > "$COUNT_FILE"
  cat "$TMP_OUT"
  rm -f "$TMP_OUT"
  exit 0
else
  status=$?
  ts="$(TZ=Asia/Singapore date '+%Y-%m-%d %H:%M:%S %Z')"
  prev=0
  if [ -f "$COUNT_FILE" ]; then
    prev=$(cat "$COUNT_FILE" 2>/dev/null || printf "0")
  fi
  case "$prev" in
    ''|*[!0-9]*) prev=0 ;;
  esac
  count=$((prev + 1))
  printf "%s" "$count" > "$COUNT_FILE"
  {
    printf "[%s] scanner-engine failure #%s (exit %s)\n" "$ts" "$count" "$status"
    cat "$TMP_OUT"
    printf "\n"
  } >> "$LOG_FILE"
  cat "$TMP_OUT"
  rm -f "$TMP_OUT"
  exit "$status"
fi
