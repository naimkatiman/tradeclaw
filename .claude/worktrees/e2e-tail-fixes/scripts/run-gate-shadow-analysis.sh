#!/usr/bin/env bash
# Wrapper for scripts/analyze-gate-shadow.js, intended to run once on
# 2026-04-21 (7 days after the full-risk gates shadow rollout) via cron.
#
# Behavior:
#   1. cd into the tradeclaw repo
#   2. Run the analyzer in dry-run mode
#   3. Save full output to data/gate-shadow-logs/analysis-YYYY-MM-DD.log
#   4. POST the recommendation line to the Telegram chat referenced in .env
#   5. Self-destruct: remove this cron entry from the user crontab so it
#      only fires once
#
# Exit codes:
#   0 = analyzer ran (regardless of recommendation)
#   1 = analyzer failed
#   2 = wrapper itself failed before invoking the analyzer
#
# Manual run: bash scripts/run-gate-shadow-analysis.sh

set -uo pipefail

REPO_ROOT="/home/naim/.openclaw/workspace/tradeclaw"
LOG_DIR="${REPO_ROOT}/data/gate-shadow-logs"
TODAY="$(date -u +%Y-%m-%d)"
LOG_FILE="${LOG_DIR}/analysis-${TODAY}.log"

# Date guard: don't fire before the planned start date (Apr 21 2026, one
# week after shadow rollout). Override with --force.
NOT_BEFORE="2026-04-21"
if [ "${1:-}" != "--force" ] && [ "$(date -u +%Y-%m-%d)" \< "${NOT_BEFORE}" ]; then
  echo "[run-gate-shadow-analysis] before NOT_BEFORE=${NOT_BEFORE}, skipping"
  exit 0
fi

cd "${REPO_ROOT}" || exit 2
mkdir -p "${LOG_DIR}"

{
  echo "=== Full-Risk Gates Shadow Analysis — ${TODAY} ==="
  echo "Started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
} > "${LOG_FILE}"

# Run the analyzer (dry-run; never auto-applies)
node scripts/analyze-gate-shadow.js >> "${LOG_FILE}" 2>&1
ANALYZER_RC=$?

echo "" >> "${LOG_FILE}"
echo "Analyzer exit code: ${ANALYZER_RC}" >> "${LOG_FILE}"

# Pull the recommendation line out of the log for the Telegram summary
RECOMMENDATION="$(grep -E '^(PROCEED|WAIT|INVESTIGATE)' "${LOG_FILE}" | tail -1 || true)"
if [ -z "${RECOMMENDATION}" ]; then
  RECOMMENDATION="(no recommendation line found — see ${LOG_FILE})"
fi

# ── Telegram notification ──
# Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from .env
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  MSG=$(printf '*Full-Risk Gates Shadow Analysis*\n%s\n\nRecommendation:\n%s\n\nFull log: %s' \
    "${TODAY}" "${RECOMMENDATION}" "${LOG_FILE}")
  curl -sS -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=${MSG}" \
    -d "parse_mode=Markdown" \
    >> "${LOG_FILE}" 2>&1 || true
fi

# ── Self-destruct: only on terminal recommendations ──
# WAIT means "not enough data, re-run in a few days" → leave the cron entry
# in place so it fires again next week. PROCEED / INVESTIGATE / failure →
# remove the cron entry; the user takes over from here.
SHOULD_REMOVE=0
if echo "${RECOMMENDATION}" | grep -qE '^(PROCEED|INVESTIGATE)'; then
  SHOULD_REMOVE=1
fi

if [ ${SHOULD_REMOVE} -eq 1 ] && command -v crontab > /dev/null 2>&1; then
  CURRENT_CRON="$(crontab -l 2>/dev/null || true)"
  NEW_CRON="$(printf '%s\n' "${CURRENT_CRON}" | grep -v 'run-gate-shadow-analysis.sh' || true)"
  if [ "${CURRENT_CRON}" != "${NEW_CRON}" ]; then
    printf '%s\n' "${NEW_CRON}" | crontab -
    echo "self-destruct: removed cron entry (terminal recommendation)" >> "${LOG_FILE}"
  fi
elif [ ${SHOULD_REMOVE} -eq 0 ]; then
  echo "self-destruct: SKIPPED — recommendation was WAIT, will re-fire on next schedule" >> "${LOG_FILE}"
fi

exit ${ANALYZER_RC}
