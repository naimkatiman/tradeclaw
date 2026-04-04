#!/bin/bash
cd /home/naim/.openclaw/workspace/tradeclaw
LOG_FILE="scripts/signal-errors.log"
OUTPUT=$(python3 scripts/scanner-engine.py 2>&1)
EXIT_CODE=$?
TIMESTAMP=$(date -Iseconds)
if [ $EXIT_CODE -ne 0 ]; then
    echo "[$TIMESTAMP] exit $EXIT_CODE: $OUTPUT" >> "$LOG_FILE"
    # Check consecutive failures
    FAIL_COUNT=$(grep -c "\[$TIMESTAMP_DATE\]" "$LOG_FILE" | head -1)  # Not accurate, but we can implement later
else
    # Reset consecutive failures? Not needed for now
    echo "Success at $TIMESTAMP" > /dev/null
fi
exit $EXIT_CODE