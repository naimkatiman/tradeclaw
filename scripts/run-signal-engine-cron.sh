#!/usr/bin/env bash
set -uo pipefail
cd /home/naim/.openclaw/workspace/tradeclaw || exit 98
STATE_FILE="scripts/.signal-engine-failures"
LOG_FILE="scripts/signal-errors.log"
TMP_OUT=$(mktemp)
if python3 scripts/scanner-engine.py >"$TMP_OUT" 2>&1; then
  printf "0" > "$STATE_FILE"
  echo "STATUS=success"
else
  status=$?
  prev=0
  if [ -f "$STATE_FILE" ]; then
    prev=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
  fi
  case "$prev" in
    ''|*[!0-9]*) prev=0 ;;
  esac
  count=$((prev + 1))
  printf "%s" "$count" > "$STATE_FILE"
  ts=$(TZ=Asia/Singapore date +"%Y-%m-%dT%H:%M:%S%z")
  {
    printf "[%s] FAIL #%s — scanner-engine.py exited with status %s\n" "$ts" "$count" "$status"
    cat "$TMP_OUT"
    printf "\n"
  } >> "$LOG_FILE"
  echo "STATUS=fail"
  echo "FAIL_COUNT=$count"
  echo "EXIT_CODE=$status"
fi
rm -f "$TMP_OUT"
