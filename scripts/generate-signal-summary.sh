#!/usr/bin/env bash
# generate-signal-summary.sh
# Reads data/signal-log.json and produces data/SIGNAL-LOG.md
# Used by the signal-log GitHub Action, but can also be run locally.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

INPUT="${ROOT_DIR}/data/signal-log.json"
OUTPUT="${ROOT_DIR}/data/SIGNAL-LOG.md"

if [ ! -s "$INPUT" ]; then
  echo "No signal data at $INPUT — skipping summary generation."
  exit 0
fi

# ── Stats ──────────────────────────────────────────────────────────────────

TOTAL=$(jq 'length' "$INPUT")
VERIFIED=$(jq '[.[] | select(.outcome != null and .outcome != "")] | length' "$INPUT")
WINS=$(jq '[.[] | select(.outcome == "win")] | length' "$INPUT")

if [ "$VERIFIED" -gt 0 ]; then
  WIN_RATE=$(echo "scale=1; $WINS * 100 / $VERIFIED" | bc)
else
  WIN_RATE="N/A"
fi

AVG_PNL=$(jq '
  [.[] | select(.pnl != null) | .pnl] |
  if length > 0 then (add / length * 100 | . * 10 | round / 10) else 0 end
' "$INPUT")

# ── 24h cutoff ─────────────────────────────────────────────────────────────

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CUTOFF=$(date -u -d '24 hours ago' +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
         || date -u -v-24H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
         || echo "")

# ── Write markdown ─────────────────────────────────────────────────────────

cat > "$OUTPUT" <<EOF
# TradeClaw Signal Log

> Auto-updated every 6 hours. Each git commit proves signals existed before outcomes were known.
> Verify with: \`git log --oneline data/signal-log.json\`

## Stats
- **Total Signals:** $TOTAL
- **Verified:** $VERIFIED
- **Win Rate:** ${WIN_RATE}%
- **Avg P&L:** ${AVG_PNL}%

## Recent Signals (last 24h)
EOF

# Table header
echo "| Time (UTC) | Symbol | Dir | Entry | TP1 | SL | Outcome | P&L |" >> "$OUTPUT"
echo "|------------|--------|-----|-------|-----|----|---------|-----|" >> "$OUTPUT"

# Table rows
if [ -n "$CUTOFF" ]; then
  jq -r --arg cutoff "$CUTOFF" '
    sort_by(.timestamp) | reverse |
    [.[] | select(.timestamp >= $cutoff)] |
    .[:50][] |
    "| \(.timestamp // "-" | split("T") | .[1] | split(".")[0] // "-") | \(.symbol // "-") | \(.direction // "-") | \(.entry // "-") | \(.tp1 // .targets[0] // "-") | \(.sl // .stopLoss // "-") | \(.outcome // "pending") | \(.pnl // "-") |"
  ' "$INPUT" >> "$OUTPUT" 2>/dev/null || echo "| - | - | - | - | - | - | - | - |" >> "$OUTPUT"
else
  jq -r '
    sort_by(.timestamp) | reverse |
    .[:20][] |
    "| \(.timestamp // "-" | split("T") | .[1] | split(".")[0] // "-") | \(.symbol // "-") | \(.direction // "-") | \(.entry // "-") | \(.tp1 // .targets[0] // "-") | \(.sl // .stopLoss // "-") | \(.outcome // "pending") | \(.pnl // "-") |"
  ' "$INPUT" >> "$OUTPUT" 2>/dev/null || echo "| - | - | - | - | - | - | - | - |" >> "$OUTPUT"
fi

echo "" >> "$OUTPUT"
echo "---" >> "$OUTPUT"
echo "Last updated: $NOW" >> "$OUTPUT"

echo "Summary written to $OUTPUT"
