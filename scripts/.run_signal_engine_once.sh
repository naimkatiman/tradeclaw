#!/usr/bin/env bash
set -u
cd /home/naim/.openclaw/workspace/tradeclaw || exit 98
TMP_OUT=$(mktemp)
COUNT_FILES=("scripts/consecutive-failures.txt" "scripts/signal-failure-count.txt" "scripts/.signal-engine-failures")

if python3 scripts/scanner-engine.py >"$TMP_OUT" 2>&1; then
  for f in "${COUNT_FILES[@]}"; do printf "0" > "$f"; done
  python3 scripts/.update_signal_engine_state.py success 0
  rm -f "$TMP_OUT"
  exit 0
fi

status=$?
prev=0
if [ -f "scripts/consecutive-failures.txt" ]; then
  prev=$(cat "scripts/consecutive-failures.txt" 2>/dev/null || echo 0)
fi
case "$prev" in
  ""|*[!0-9]*) prev=0 ;;
esac
count=$((prev + 1))
for f in "${COUNT_FILES[@]}"; do printf "%s" "$count" > "$f"; done

ts=$(TZ=Asia/Singapore date +"%Y-%m-%dT%H:%M:%S%z")
{
  printf "[%s] FAIL #%s — scanner-engine.py exited with status %s\n" "$ts" "$count" "$status"
  cat "$TMP_OUT"
  printf "\n"
} >> scripts/signal-errors.log
python3 scripts/.update_signal_engine_state.py fail "$status"
rm -f "$TMP_OUT"

if [ "$count" -ge 3 ]; then
  printf "Signal engine failed %s consecutive times. Logged to scripts/signal-errors.log\n" "$count"
  exit "$status"
fi

exit 0
