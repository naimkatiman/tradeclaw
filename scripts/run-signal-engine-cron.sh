#!/usr/bin/env bash
set -uo pipefail
cd /home/naim/.openclaw/workspace/tradeclaw || exit 1
COUNT_FILE="scripts/.signal-engine-failure-count"
LOG_FILE="scripts/signal-errors.log"
python3 scripts/scanner-engine.py 2>&1
status=$?
if [ "$status" -eq 0 ]; then
  printf "0" > "$COUNT_FILE"
  echo "STATUS=success"
  exit 0
fi
count=0
if [ -f "$COUNT_FILE" ]; then
  count=$(cat "$COUNT_FILE" 2>/dev/null || echo 0)
fi
case "$count" in
  ''|*[!0-9]*) count=0 ;;
esac
count=$((count + 1))
printf "%s" "$count" > "$COUNT_FILE"
ts=$(TZ=Asia/Singapore date "+%Y-%m-%d %H:%M:%S %Z")
printf "[%s] scanner-engine.py failed (exit %s)\n" "$ts" "$status" >> "$LOG_FILE"
echo "STATUS=failure"
echo "FAIL_COUNT=$count"
echo "EXIT_CODE=$status"
exit 0
