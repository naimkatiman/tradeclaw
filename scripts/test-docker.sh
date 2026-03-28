#!/usr/bin/env bash
set -euo pipefail

# TradeClaw Docker Health Check Script
# Usage: bash scripts/test-docker.sh [--no-build] [--cleanup]

HEALTH_URL="http://localhost:3000/api/health"
TIMEOUT=60
INTERVAL=2
NO_BUILD=false
CLEANUP=false

for arg in "$@"; do
  case $arg in
    --no-build) NO_BUILD=true ;;
    --cleanup)  CLEANUP=true ;;
    --help|-h)
      echo "Usage: bash scripts/test-docker.sh [--no-build] [--cleanup]"
      echo "  --no-build  Skip docker build (use cached images)"
      echo "  --cleanup   Run docker compose down after test"
      exit 0
      ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
  if [ "$CLEANUP" = true ]; then
    echo -e "${YELLOW}Cleaning up...${NC}"
    docker compose down -v --remove-orphans 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Check for .env file
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found.${NC}"
  echo "Run: cp .env.example .env && edit .env to set DB_PASSWORD and AUTH_SECRET"
  exit 1
fi

# Start containers
echo -e "${YELLOW}Starting TradeClaw...${NC}"
if [ "$NO_BUILD" = true ]; then
  docker compose up -d
else
  docker compose up --build -d
fi

# Poll health endpoint
echo -e "${YELLOW}Waiting for health check (timeout: ${TIMEOUT}s)...${NC}"
elapsed=0
while [ $elapsed -lt $TIMEOUT ]; do
  response=$(curl -sf "$HEALTH_URL" 2>/dev/null) && {
    echo ""
    echo -e "${GREEN}TradeClaw is running at http://localhost:3000${NC}"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    exit 0
  }
  printf "."
  sleep $INTERVAL
  elapsed=$((elapsed + INTERVAL))
done

# Failure
echo ""
echo -e "${RED}Health check failed after ${TIMEOUT}s${NC}"
echo ""
echo "--- docker compose logs (last 50 lines) ---"
docker compose logs --tail=50 app
exit 1
