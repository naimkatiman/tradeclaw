#!/usr/bin/env bash
# Track 1 — Binance Futures Testnet demo launcher.
#
# One-shot bootstrap of the operator-side steps in
# docs/plans/2026-05-08-demo-track1-launch-runbook.md §2-§5.
#
# What it does:
#   §2  Apply migration 018_pilot_executions.sql (idempotent runner)
#   §2v Verify executions.signal_id is `text`, not `uuid`
#   §3  Push 5 env vars to Railway (web service)
#   §4  Run binance-handshake.ts to verify keys + permissions
#   §5  Deploy and tail the first 60s of logs
#
# What it does NOT do:
#   - Create your Binance testnet API key (you do this once at
#     testnet.binancefuture.com → API Key)
#   - Authenticate Railway CLI (you've already run `railway login`)
#   - Place any order (handshake is read-only)
#
# Required env (export before running):
#   BINANCE_API_KEY      — futures testnet apiKey
#   BINANCE_API_SECRET   — futures testnet apiSecret
#
# Optional env (sensible defaults applied):
#   RAILWAY_SERVICE         default: web
#   BINANCE_BASE_URL        default: https://testnet.binancefuture.com
#   BINANCE_MARKET_DATA_URL default: https://fapi.binance.com   (mainnet for real liquidity)
#   EXECUTION_MODE          default: testnet
#   SKIP_DEPLOY=1           apply migration + env + handshake, but do not deploy
#
# Usage:
#   export BINANCE_API_KEY=xxxx
#   export BINANCE_API_SECRET=xxxx
#   bash scripts/launch-binance-testnet.sh
#
# Re-runnable. Each step is idempotent: migration runner skips applied files,
# env vars overwrite cleanly, deploy is just `railway up`.

set -euo pipefail

# ─── Colours (auto-disable on dumb terminals) ───────────────────────────
if [ -t 1 ] && [ "${TERM:-}" != "dumb" ]; then
  C_RED=$'\033[31m'; C_GRN=$'\033[32m'; C_YEL=$'\033[33m'
  C_CYN=$'\033[36m'; C_DIM=$'\033[2m'; C_RST=$'\033[0m'
else
  C_RED=''; C_GRN=''; C_YEL=''; C_CYN=''; C_DIM=''; C_RST=''
fi

step()  { printf '\n%s▸ %s%s\n' "$C_CYN" "$1" "$C_RST"; }
ok()    { printf '%s  ✓ %s%s\n' "$C_GRN" "$1" "$C_RST"; }
warn()  { printf '%s  ⚠ %s%s\n' "$C_YEL" "$1" "$C_RST"; }
fail()  { printf '%s  ✗ %s%s\n' "$C_RED" "$1" "$C_RST"; exit 1; }

# ─── Defaults ───────────────────────────────────────────────────────────
RAILWAY_SERVICE="${RAILWAY_SERVICE:-web}"
BINANCE_BASE_URL="${BINANCE_BASE_URL:-https://testnet.binancefuture.com}"
BINANCE_MARKET_DATA_URL="${BINANCE_MARKET_DATA_URL:-https://fapi.binance.com}"
EXECUTION_MODE="${EXECUTION_MODE:-testnet}"

# ─── Pre-flight ─────────────────────────────────────────────────────────
step "Pre-flight"

command -v railway >/dev/null 2>&1 || fail "railway CLI not on PATH"
command -v node    >/dev/null 2>&1 || fail "node not on PATH"
command -v npx     >/dev/null 2>&1 || fail "npx not on PATH"

if ! railway whoami >/dev/null 2>&1; then
  fail "railway whoami failed — run 'railway login' first"
fi
WHOAMI=$(railway whoami 2>&1 | tail -n1)
ok "Railway: $WHOAMI"

# Don't try to inspect linked project — `railway status` JSON shape varies
# across CLI versions. If env push later fails, the user will see it.

[ -n "${BINANCE_API_KEY:-}"    ] || fail "BINANCE_API_KEY not exported"
[ -n "${BINANCE_API_SECRET:-}" ] || fail "BINANCE_API_SECRET not exported"
ok "Binance API key + secret present (lengths: ${#BINANCE_API_KEY}, ${#BINANCE_API_SECRET})"

[ "$EXECUTION_MODE" = "testnet" ] \
  || warn "EXECUTION_MODE=$EXECUTION_MODE (expected 'testnet' for this script)"

case "$BINANCE_BASE_URL" in
  *testnet.binancefuture.com*) ok "BINANCE_BASE_URL points at futures testnet" ;;
  *testnet.binance.vision*)
    fail "BINANCE_BASE_URL points at SPOT testnet — futures testnet is testnet.binancefuture.com" ;;
  *) warn "BINANCE_BASE_URL=$BINANCE_BASE_URL (unusual; continuing)" ;;
esac

# ─── §2: Migration ──────────────────────────────────────────────────────
step "§2  Apply migrations (idempotent)"

# Preview first so re-runs are visibly no-ops
echo "$C_DIM  preview:$C_RST"
railway run --service "$RAILWAY_SERVICE" -- node scripts/run-migrations.mjs --pretend \
  | sed 's/^/    /'

echo "$C_DIM  applying:$C_RST"
railway run --service "$RAILWAY_SERVICE" -- node scripts/run-migrations.mjs \
  | sed 's/^/    /'
ok "Migration runner completed"

# ─── §2v: Verify executions schema ──────────────────────────────────────
step "§2v Verify executions schema"

VERIFY_SQL=$(cat <<'SQL'
SELECT
  (SELECT data_type FROM information_schema.columns
     WHERE table_name='executions' AND column_name='signal_id') AS signal_id_type,
  (SELECT data_type FROM information_schema.columns
     WHERE table_name='executions' AND column_name='client_order_id') AS coid_type,
  (SELECT count(*) FROM information_schema.tables
     WHERE table_name IN ('executions','execution_errors','universe_snapshots')) AS table_count;
SQL
)

VERIFY_OUT=$(railway run --service "$RAILWAY_SERVICE" -- \
  node -e "
    const { Client } = require('pg');
    const c = new Client({ connectionString: process.env.DATABASE_URL,
                           ssl: { rejectUnauthorized: false } });
    (async () => {
      await c.connect();
      const r = await c.query(\`$VERIFY_SQL\`);
      console.log(JSON.stringify(r.rows[0]));
      await c.end();
    })().catch(e => { console.error(e.message); process.exit(1); });
  " 2>&1 | tail -n1)

echo "    $VERIFY_OUT"

# Pull fields without jq dependency
SIGID_TYPE=$(printf '%s' "$VERIFY_OUT" | sed -n 's/.*"signal_id_type":"\([^"]*\)".*/\1/p')
TABLE_COUNT=$(printf '%s' "$VERIFY_OUT" | sed -n 's/.*"table_count":"\?\([0-9]*\).*/\1/p')

[ "$SIGID_TYPE" = "text" ] \
  || fail "executions.signal_id is '$SIGID_TYPE' (expected 'text') — gate-zero FK fix not applied"
[ "$TABLE_COUNT" = "3" ] \
  || fail "expected 3 tables (executions/execution_errors/universe_snapshots), found $TABLE_COUNT"
ok "Schema verified: signal_id=text, all 3 tables present"

# ─── §3: Env vars ───────────────────────────────────────────────────────
step "§3  Push env vars to Railway service '$RAILWAY_SERVICE'"

railway variables --service "$RAILWAY_SERVICE" \
  --set "EXECUTION_MODE=$EXECUTION_MODE" \
  --set "BINANCE_BASE_URL=$BINANCE_BASE_URL" \
  --set "BINANCE_MARKET_DATA_URL=$BINANCE_MARKET_DATA_URL" \
  --set "BINANCE_API_KEY=$BINANCE_API_KEY" \
  --set "BINANCE_API_SECRET=$BINANCE_API_SECRET" \
  >/dev/null
ok "Set: EXECUTION_MODE BINANCE_BASE_URL BINANCE_MARKET_DATA_URL BINANCE_API_KEY BINANCE_API_SECRET"
warn "BINANCE_API_KEY/SECRET written to Railway. Anyone with project access can read them."

# ─── §4: Handshake ──────────────────────────────────────────────────────
step "§4  Handshake — read-only key + permission check"

if railway run --service "$RAILWAY_SERVICE" -- npx tsx apps/web/scripts/binance-handshake.ts; then
  ok "Handshake passed"
else
  fail "Handshake failed — see error above. Common causes: wrong testnet site, key permissions, clock drift"
fi

# ─── §5: Deploy ─────────────────────────────────────────────────────────
if [ "${SKIP_DEPLOY:-}" = "1" ]; then
  warn "SKIP_DEPLOY=1 — stopping before deploy"
  echo
  echo "  Next: run 'railway up --detach --service $RAILWAY_SERVICE' when ready."
  exit 0
fi

step "§5  Deploy"
railway up --detach --service "$RAILWAY_SERVICE"
ok "Deploy submitted (detached)"

step "Tail first 60s of deployment logs"
echo "$C_DIM  Ctrl-C is safe — deploy continues in the background.$C_RST"
( railway logs --service "$RAILWAY_SERVICE" --deployment & LOG_PID=$!
  sleep 60
  kill "$LOG_PID" 2>/dev/null || true
) | sed 's/^/    /' || true

# ─── Done ───────────────────────────────────────────────────────────────
echo
ok "Track 1 launched."
cat <<EOF

  Watch first executions (24h horizon):
    railway logs --service $RAILWAY_SERVICE --tail | grep -E "executor|execution_errors"

  SQL for trades + errors:
    railway run --service $RAILWAY_SERVICE -- psql "\$DATABASE_URL" \\
      -c "SELECT created_at, symbol, side, qty, status FROM executions ORDER BY created_at DESC LIMIT 20;"

  Kill switch (no redeploy needed):
    railway variables --service $RAILWAY_SERVICE --set EXECUTION_MODE=disabled

  Failure-mode triage:
    docs/plans/2026-05-08-demo-track1-launch-runbook.md §7
EOF
