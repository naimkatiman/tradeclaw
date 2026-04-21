#!/usr/bin/env bash
set -uo pipefail
cd /home/naim/.openclaw/workspace/tradeclaw
LOG_FILE=/home/naim/.openclaw/workspace/tradeclaw/scripts/signal-errors.log
STATE_FILE=/home/naim/.openclaw/workspace/tradeclaw/scripts/.signal-engine-failure-count
TMP_OUT=$(mktemp)
if python3 scripts/scanner-engine.py >"$TMP_OUT" 2>&1; then
  printf "0" > "$STATE_FILE"
  rm -f "$TMP_OUT"
  echo "SUCCESS"
else
  status=$?
  count=0
  if [ -f "$STATE_FILE" ]; then
    count=$(cat "$STATE_FILE" 2>/dev/null || printf "0")
  fi
  count=$((count + 1))
  printf "%s" "$count" > "$STATE_FILE"
  {
    printf "[%s] scanner-engine failure #%s (exit %s)\n" "$(TZ=Asia/Singapore date "+%Y-%m-%d %H:%M:%S %Z")" "$count" "$status"
    cat "$TMP_OUT"
    printf "\n"
  } >> "$LOG_FILE"
  cat "$TMP_OUT"
  rm -f "$TMP_OUT"
  echo "__FAIL_COUNT__=$count"
  exit "$status"
fi
