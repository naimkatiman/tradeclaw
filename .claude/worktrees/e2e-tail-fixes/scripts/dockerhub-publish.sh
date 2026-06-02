#!/usr/bin/env bash
# TradeClaw Docker Hub publish script
# Builds multi-platform image and pushes to Docker Hub
# Usage: ./scripts/dockerhub-publish.sh [--dry-run] [--help]

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
info() { echo -e "${YELLOW}→${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; }
head() { echo -e "\n${BOLD}${CYAN}$*${NC}"; }

# ── Defaults ─────────────────────────────────────────────────────────────────
DRY_RUN=false
IMAGE_NAME="tradeclaw/tradeclaw"
PLATFORMS="linux/amd64,linux/arm64"
DATE_TAG=$(date +%Y-%m-%d)
DOCKERFILE="apps/web/Dockerfile"
BUILDER_NAME="tradeclaw-builder"

# ── Args ──────────────────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      echo "Usage: $0 [--dry-run] [--help]"
      echo ""
      echo "Options:"
      echo "  --dry-run   Build image but skip push (test only)"
      echo "  --help      Show this help message"
      echo ""
      echo "Environment:"
      echo "  IMAGE_NAME    Docker image name (default: tradeclaw/tradeclaw)"
      echo "  PLATFORMS     Target platforms (default: linux/amd64,linux/arm64)"
      echo ""
      echo "Examples:"
      echo "  $0                   # Build and push latest + date tag"
      echo "  $0 --dry-run         # Build only, no push"
      exit 0
      ;;
    *) err "Unknown argument: $arg"; exit 1 ;;
  esac
done

head "⚡ TradeClaw Docker Hub Publisher"
echo "  Image:     ${IMAGE_NAME}"
echo "  Platforms: ${PLATFORMS}"
echo "  Tags:      latest, ${DATE_TAG}"
if $DRY_RUN; then
  echo -e "  Mode:      ${YELLOW}DRY RUN (no push)${NC}"
fi

# ── Prerequisites ──────────────────────────────────────────────────────────────
head "1/5  Checking prerequisites"

if ! command -v docker &>/dev/null; then
  err "Docker not found. Install Docker Desktop or Docker Engine."
  exit 1
fi
ok "Docker found: $(docker --version | head -1)"

if ! docker buildx version &>/dev/null; then
  err "Docker Buildx not found. Upgrade to Docker 20.10+."
  exit 1
fi
ok "Docker Buildx available"

if [[ ! -f "$DOCKERFILE" ]]; then
  err "Dockerfile not found at $DOCKERFILE"
  err "Run this script from the tradeclaw repo root."
  exit 1
fi
ok "Dockerfile found: $DOCKERFILE"

if ! $DRY_RUN; then
  if ! docker info 2>/dev/null | grep -q "Username"; then
    info "Not logged in to Docker Hub. Run: docker login"
    if ! docker login; then
      err "Docker login failed."
      exit 1
    fi
  fi
  ok "Authenticated to Docker Hub"
fi

# ── Builder ────────────────────────────────────────────────────────────────────
head "2/5  Setting up multi-platform builder"

if docker buildx inspect "$BUILDER_NAME" &>/dev/null; then
  info "Using existing builder: $BUILDER_NAME"
else
  info "Creating new buildx builder: $BUILDER_NAME"
  docker buildx create --name "$BUILDER_NAME" --driver docker-container --bootstrap
  ok "Builder created"
fi
docker buildx use "$BUILDER_NAME"
ok "Builder active: $BUILDER_NAME"

# ── Build ──────────────────────────────────────────────────────────────────────
head "3/5  Building multi-platform image"
info "Platforms: $PLATFORMS"
info "This may take 5–15 minutes on first build (arm64 emulation)..."

BUILD_ARGS=(
  buildx build
  --platform "$PLATFORMS"
  --file "$DOCKERFILE"
  --tag "${IMAGE_NAME}:latest"
  --tag "${IMAGE_NAME}:${DATE_TAG}"
  --cache-from "type=registry,ref=${IMAGE_NAME}:cache"
  --label "org.opencontainers.image.title=TradeClaw"
  --label "org.opencontainers.image.description=Open-source AI trading signal platform"
  --label "org.opencontainers.image.url=https://github.com/naimkatiman/tradeclaw"
  --label "org.opencontainers.image.source=https://github.com/naimkatiman/tradeclaw"
  --label "org.opencontainers.image.version=${DATE_TAG}"
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
)

if $DRY_RUN; then
  info "DRY RUN: Build without push"
  docker "${BUILD_ARGS[@]}" --load . || {
    err "Build failed. Fix errors above and retry."
    exit 1
  }
  ok "Build succeeded (dry run — not pushed)"
else
  docker "${BUILD_ARGS[@]}" \
    --cache-to "type=registry,ref=${IMAGE_NAME}:cache,mode=max" \
    --push . || {
    err "Build/push failed. Fix errors above and retry."
    exit 1
  }
  ok "Build and push complete"
fi

# ── Verify ─────────────────────────────────────────────────────────────────────
head "4/5  Verifying image"

if ! $DRY_RUN; then
  info "Pulling manifest to verify..."
  if docker manifest inspect "${IMAGE_NAME}:latest" &>/dev/null; then
    ok "Image verified on Docker Hub"
    docker manifest inspect "${IMAGE_NAME}:latest" | python3 -c "
import json, sys
m = json.load(sys.stdin)
manifests = m.get('manifests', [])
for mf in manifests:
    plat = mf.get('platform', {})
    size = mf.get('size', 0)
    print(f'  {plat.get(\"os\",\"?\")} / {plat.get(\"architecture\",\"?\")} — {size // 1024 // 1024} MB')
" 2>/dev/null || true
  else
    info "Manifest check skipped (may take a moment to propagate)"
  fi
fi

# ── Summary ────────────────────────────────────────────────────────────────────
head "5/5  Done"
echo ""
if $DRY_RUN; then
  echo -e "${YELLOW}DRY RUN complete — image NOT pushed.${NC}"
  echo "Remove --dry-run to publish."
else
  echo -e "${GREEN}${BOLD}Successfully published to Docker Hub!${NC}"
  echo ""
  echo "  Pull:    docker pull ${IMAGE_NAME}:latest"
  echo "  Run:     docker run -p 3000:3000 ${IMAGE_NAME}:latest"
  echo "  Hub:     https://hub.docker.com/r/${IMAGE_NAME}"
  echo ""
  echo -e "${CYAN}⭐ If you find TradeClaw useful, please star the repo:${NC}"
  echo "  https://github.com/naimkatiman/tradeclaw"
fi
