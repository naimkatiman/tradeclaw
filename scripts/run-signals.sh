#!/bin/bash
# TradeClaw Signal Cron Script
# Run every 15 minutes via cron:
#   */15 * * * * /home/naim/.openclaw/workspace/tradeclaw/scripts/run-signals.sh >> /var/log/tradeclaw-signals.log 2>&1
#
# For outcome checking (hourly):
#   0 * * * * /home/naim/.openclaw/workspace/tradeclaw/scripts/run-signals.sh --check-outcomes >> /var/log/tradeclaw-signals.log 2>&1

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON="python3"

# Log header
echo ""
echo "=============================================="
echo "TradeClaw Signal Engine - $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=============================================="

# Change to project directory
cd "$PROJECT_DIR"

# Check if we should run outcome checker instead
if [[ "$1" == "--check-outcomes" ]]; then
    echo "Running outcome checker..."
    $PYTHON "$SCRIPT_DIR/signal-outcome-checker.py"
    exit $?
fi

# Run signal engine
echo "Running signal engine..."
$PYTHON "$SCRIPT_DIR/signal-engine.py"

# Check if signals file was created
if [[ -f "$PROJECT_DIR/data/signals-live.json" ]]; then
    SIGNAL_COUNT=$(grep -o '"confidence"' "$PROJECT_DIR/data/signals-live.json" | wc -l)
    echo ""
    echo "Signals generated: $SIGNAL_COUNT"
    echo "Output: $PROJECT_DIR/data/signals-live.json"
else
    echo "WARNING: No signals file created" >&2
fi

echo ""
echo "Completed at: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
