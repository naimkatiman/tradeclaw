#!/usr/bin/env bash
# TradeClaw Docker smoke test
# Usage: bash scripts/test-docker.sh
# Or one-liner: curl -fsSL https://raw.githubusercontent.com/naimkatiman/tradeclaw/main/scripts/test-docker.sh | bash

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'
BOLD='\033[1m'

PASS="${GREEN}✅ PASS${RESET}"
FAIL="${RED}❌ FAIL${RESET}"

BASE_URL="${TRADECLAW_URL:-http://localhost:3000}"
COMPOSE_CMD="docker compose"
CLEANUP=${CLEANUP:-true}
TIMEOUT=${TIMEOUT:-90}

echo ""
echo -e "${CYAN}${BOLD}  ╔══════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}  ║   TradeClaw Docker Test      ║${RESET}"
echo -e "${CYAN}${BOLD}  ╚══════════════════════════════╝${RESET}"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

check() {
  local name="$1"
  local result="$2"
  local detail="${3:-}"
  if [ "$result" = "ok" ]; then
    echo -e "  $PASS  $name"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "  $FAIL  $name${detail:+: $detail}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# ── Prerequisites ─────────────────────────────────────────────────────────────

echo -e "${BOLD}1. Checking prerequisites${RESET}"

if command -v docker &>/dev/null; then
  check "docker installed" "ok"
else
  check "docker installed" "fail" "Install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

if docker info &>/dev/null 2>&1; then
  check "docker daemon running" "ok"
else
  check "docker daemon running" "fail" "Start Docker Desktop or 'sudo systemctl start docker'"
  exit 1
fi

if docker compose version &>/dev/null 2>&1; then
  check "docker compose available" "ok"
elif docker-compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
  check "docker compose available (legacy)" "ok"
else
  check "docker compose available" "fail" "Install docker compose plugin"
  exit 1
fi

if [ -f "docker-compose.yml" ] || [ -f "compose.yml" ]; then
  check "docker-compose.yml exists" "ok"
else
  check "docker-compose.yml exists" "fail" "Run from tradeclaw root directory"
  exit 1
fi

echo ""

# ── Build & Start ─────────────────────────────────────────────────────────────

echo -e "${BOLD}2. Building and starting containers${RESET}"
echo -e "   ${YELLOW}(this may take 2-5 minutes on first run)${RESET}"
echo ""

if $COMPOSE_CMD up -d --build 2>&1 | while IFS= read -r line; do
  echo -e "   ${CYAN}>${RESET} $line"
done; then
  check "docker compose up --build" "ok"
else
  check "docker compose up --build" "fail" "See output above"
  exit 1
fi

echo ""

# ── Cleanup trap ──────────────────────────────────────────────────────────────

cleanup() {
  if [ "$CLEANUP" = "true" ]; then
    echo ""
    echo -e "${BOLD}Cleaning up...${RESET}"
    $COMPOSE_CMD down --volumes --remove-orphans 2>/dev/null || true
    echo -e "  ${GREEN}Containers removed${RESET}"
  fi
}
trap cleanup EXIT

# ── Wait for health ───────────────────────────────────────────────────────────

echo -e "${BOLD}3. Waiting for service to be healthy${RESET}"
echo -e "   Polling ${BASE_URL}/api/health (timeout ${TIMEOUT}s)"

ELAPSED=0
HEALTHY=false
while [ $ELAPSED -lt $TIMEOUT ]; do
  if curl -sf "${BASE_URL}/api/health" -o /dev/null 2>/dev/null; then
    HEALTHY=true
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  printf "   ."
done
echo ""

if [ "$HEALTHY" = "true" ]; then
  check "Service health endpoint reachable (${ELAPSED}s)" "ok"
else
  check "Service health endpoint" "fail" "Timed out after ${TIMEOUT}s. Check 'docker compose logs'"
  exit 1
fi

echo ""

# ── API Checks ────────────────────────────────────────────────────────────────

echo -e "${BOLD}4. Running API smoke tests${RESET}"

# /api/health
HEALTH_RESP=$(curl -sf "${BASE_URL}/api/health" 2>/dev/null || echo "")
if echo "$HEALTH_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get('status') in ('ok','healthy','up')" 2>/dev/null; then
  check "/api/health returns status ok" "ok"
else
  # Try checking for any status field
  if echo "$HEALTH_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d)" 2>/dev/null; then
    check "/api/health returns valid JSON" "ok"
  else
    check "/api/health" "fail" "Response: ${HEALTH_RESP:0:100}"
  fi
fi

# /api/signals
SIGNALS_RESP=$(curl -sf "${BASE_URL}/api/signals" 2>/dev/null || echo "")
if echo "$SIGNALS_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); sigs=d.get('signals',[]); assert isinstance(sigs,list) and len(sigs)>0" 2>/dev/null; then
  SIG_COUNT=$(echo "$SIGNALS_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('signals',[])))" 2>/dev/null || echo "?")
  check "/api/signals returns signals array (${SIG_COUNT} signals)" "ok"
else
  check "/api/signals" "fail" "Response: ${SIGNALS_RESP:0:100}"
fi

# /api/v1/health
V1_RESP=$(curl -sf "${BASE_URL}/api/v1/health" 2>/dev/null || echo "")
if echo "$V1_RESP" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
  check "/api/v1/health returns valid JSON" "ok"
else
  check "/api/v1/health" "fail" "Response: ${V1_RESP:0:100}"
fi

# Home page
HOME_STATUS=$(curl -so /dev/null -w "%{http_code}" "${BASE_URL}/" 2>/dev/null || echo "000")
if [ "$HOME_STATUS" = "200" ]; then
  check "Homepage returns HTTP 200" "ok"
else
  check "Homepage HTTP status" "fail" "Got: ${HOME_STATUS}"
fi

# Dashboard page
DASH_STATUS=$(curl -so /dev/null -w "%{http_code}" "${BASE_URL}/dashboard" 2>/dev/null || echo "000")
if [ "$DASH_STATUS" = "200" ]; then
  check "Dashboard page returns HTTP 200" "ok"
else
  check "Dashboard page HTTP status" "fail" "Got: ${DASH_STATUS}"
fi

echo ""

# ── Summary ───────────────────────────────────────────────────────────────────

echo -e "${BOLD}═══════════════════════════════${RESET}"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo -e "  Results: ${GREEN}${PASS_COUNT} passed${RESET} / ${RED}${FAIL_COUNT} failed${RESET} (${TOTAL} total)"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}🎉 All checks passed! TradeClaw is running.${RESET}"
  echo -e "  ${CYAN}  Dashboard: ${BASE_URL}/dashboard${RESET}"
  echo -e "  ${CYAN}  Signals:   ${BASE_URL}/api/signals${RESET}"
  echo ""
  echo -e "  ${YELLOW}⭐ If this helped you, please star the repo:${RESET}"
  echo -e "  ${CYAN}  https://github.com/naimkatiman/tradeclaw${RESET}"
  EXIT_CODE=0
else
  echo -e "  ${RED}${BOLD}Some checks failed. Check 'docker compose logs' for details.${RESET}"
  EXIT_CODE=1
fi

echo ""
exit $EXIT_CODE
