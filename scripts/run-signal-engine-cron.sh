#!/usr/bin/env bash
set -u
cd /home/naim/.openclaw/workspace/tradeclaw || exit 1
streak_file="scripts/.signal-engine-failure-streak"
log_file="scripts/signal-errors.log"
out_file="$(mktemp)"
if python3 scripts/scanner-engine.py >"$out_file" 2>&1; then
  printf "0" > "$streak_file"
  rm -f "$out_file"
  exit 0
else
  status=$?
  ts="$(TZ=Asia/Singapore date "+%Y-%m-%d %H:%M:%S %Z")"
  {
    printf "[%s] scanner-engine failed with exit %s\n" "$ts" "$status"
    cat "$out_file"
    printf "\n"
  } >> "$log_file"
  prev=0
  if [ -f "$streak_file" ]; then
    prev="$(cat "$streak_file" 2>/dev/null || printf 0)"
  fi
  case "$prev" in
    ''|*[!0-9]*) prev=0 ;;
  esac
  streak=$((prev + 1))
  printf "%s" "$streak" > "$streak_file"
  cat "$out_file"
  rm -f "$out_file"
  if [ "$streak" -ge 3 ]; then
    printf "\nCONSECUTIVE_FAILURES=%s\n" "$streak"
  fi
  exit "$status"
fi
