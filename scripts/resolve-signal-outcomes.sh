#!/usr/bin/env bash
set -o pipefail
# Resolve pending signal outcomes (TP/SL/expired) for the Next.js signal history.
# Run this hourly via cron for self-hosted instances without Vercel cron:
#   0 * * * * /path/to/tradeclaw/scripts/resolve-signal-outcomes.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$ROOT/scripts/signal-errors.log"

echo "[$(date -Iseconds)] Resolving signal outcomes..." >> "$LOG"

# lib/signal-history.ts uses process.cwd() to locate data/signal-history.json.
# Next.js workspace scripts run with cwd = apps/web/, so the resolver must also
# run from that directory or it will read/write the wrong path (root/data/).
cd "$ROOT/apps/web" || exit 1

npx tsx -e "
import { resolveRealOutcomes } from './lib/signal-history.ts';
resolveRealOutcomes()
  .then(() => {
    console.log('Signal outcomes resolved successfully');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Failed to resolve outcomes:', e);
    process.exit(1);
  });
" >> "$LOG" 2>&1

EXIT_CODE=$?
if [ "$EXIT_CODE" -ne 0 ]; then
  echo "[$(date -Iseconds)] ERROR: resolveRealOutcomes exited $EXIT_CODE" >> "$LOG"
fi

exit $EXIT_CODE
