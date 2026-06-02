#!/usr/bin/env bash
set -o pipefail
# Resolve pending signal outcomes (TP/SL/expired) for the Next.js signal history.
# Run this hourly via cron for self-hosted instances without Vercel cron:
#   0 * * * * /path/to/tradeclaw/scripts/resolve-signal-outcomes.sh

cd "$(dirname "$0")/.." || exit 1
LOG="$(pwd)/scripts/signal-errors.log"

echo "[$(date -Iseconds)] Resolving signal outcomes..." >> "$LOG"

npx tsx -e "
import { resolveRealOutcomes } from './apps/web/lib/signal-history.ts';
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
