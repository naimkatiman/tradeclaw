#!/usr/bin/env node
/**
 * Historical sanity simulation for the full-risk gates A/B plan.
 *
 * Walks signal_history rows ordered by created_at ASC, applies the streak
 * and drawdown gates from packages/strategies/run-backtest.ts to a rolling
 * window of the prior 20 RESOLVED outcomes for each new row, and reports
 * how often the gates would have fired plus the hit-rate delta between
 * would-allow and would-block buckets.
 *
 * Phase-1 gating decision is whether to actually ship the gates. Per
 * docs/plans/full-risk-gates-ab.md:
 *   - block rate < 5% → not worth shipping
 *   - block rate >= 5% AND would_block hit rate ≥ 8 pp lower than
 *     would_allow → ship phase 1 shadow mode
 *   - otherwise → investigate
 *
 * Read-only. Does not mutate signal_history. Run from repo root:
 *   node scripts/simulate-full-risk-gates.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

// ── Gate constants (mirror packages/strategies/run-backtest.ts) ──
const LOOKBACK_RESOLVED = 20;
const STREAK_N = 3;
const DRAWDOWN_THRESHOLD = 0.10;
const START_BALANCE = 10_000;

/**
 * @param {Array<{hit: boolean, pnlPct: number}>} resolved  newest-first slice of resolved outcomes
 */
function computeGateState(resolved) {
  if (resolved.length === 0) {
    return { gatesAllow: true, reason: null, streakLossCount: 0, currentDrawdownPct: 0, dataPoints: 0 };
  }

  // Streak gate: last STREAK_N entries all losses → block
  const lastN = resolved.slice(0, STREAK_N);
  const streakLossCount = lastN.filter(r => !r.hit).length;
  const streakBlocked = lastN.length === STREAK_N && streakLossCount >= STREAK_N;

  // Drawdown gate: simulate balance over last LOOKBACK_RESOLVED outcomes
  // iterating oldest-first, track peak, compute current drawdown after loop.
  const window = resolved.slice(0, LOOKBACK_RESOLVED).reverse(); // oldest first
  let balance = START_BALANCE;
  let peak = START_BALANCE;
  for (const r of window) {
    balance *= 1 + (r.pnlPct ?? 0) / 100;
    if (balance > peak) peak = balance;
  }
  const currentDrawdown = peak > 0 ? (peak - balance) / peak : 0;
  const ddBlocked = currentDrawdown > DRAWDOWN_THRESHOLD;

  if (streakBlocked) {
    return {
      gatesAllow: false,
      reason: `streak_blocked: ${streakLossCount}/${STREAK_N} consecutive losses`,
      streakLossCount,
      currentDrawdownPct: +(currentDrawdown * 100).toFixed(2),
      dataPoints: resolved.length,
    };
  }
  if (ddBlocked) {
    return {
      gatesAllow: false,
      reason: `drawdown_blocked: ${(currentDrawdown * 100).toFixed(1)}% > 10%`,
      streakLossCount,
      currentDrawdownPct: +(currentDrawdown * 100).toFixed(2),
      dataPoints: resolved.length,
    };
  }
  return {
    gatesAllow: true,
    reason: null,
    streakLossCount,
    currentDrawdownPct: +(currentDrawdown * 100).toFixed(2),
    dataPoints: resolved.length,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set in .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Loading signal_history (resolved hmm-top3 only)...');
  const { rows } = await pool.query(`
    SELECT id, pair, direction, created_at,
           (outcome_24h->>'hit')::boolean    AS hit,
           (outcome_24h->>'pnlPct')::numeric AS pnl_pct
    FROM signal_history
    WHERE strategy_id = 'hmm-top3'
      AND is_simulated = FALSE
      AND outcome_24h IS NOT NULL
    ORDER BY created_at ASC
  `);
  console.log(`Loaded ${rows.length} resolved signals.\n`);

  if (rows.length < 50) {
    console.error('Not enough resolved signals for a meaningful simulation.');
    process.exit(1);
  }

  // For each row i (skipping the first STREAK_N so we have prior data),
  // build the prior resolved window (newest-first) and compute gate state.
  const decisions = [];
  let warmup = STREAK_N;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const pnl = Number(r.pnl_pct);

    if (i < warmup) {
      decisions.push({
        index: i,
        id: r.id,
        pair: r.pair,
        hit: r.hit,
        pnlPct: pnl,
        gateAction: 'warmup',
        gateReason: null,
      });
      continue;
    }

    // Prior resolved rows, newest first
    const prior = [];
    for (let j = i - 1; j >= 0 && prior.length < LOOKBACK_RESOLVED; j--) {
      prior.push({ hit: rows[j].hit, pnlPct: Number(rows[j].pnl_pct) });
    }

    const state = computeGateState(prior);
    decisions.push({
      index: i,
      id: r.id,
      pair: r.pair,
      hit: r.hit,
      pnlPct: pnl,
      gateAction: state.gatesAllow ? 'would_allow' : 'would_block',
      gateReason: state.reason,
    });
  }

  // ── Aggregate ────────────────────────────────────────────────
  const evaluated = decisions.filter(d => d.gateAction !== 'warmup');
  const wouldAllow = evaluated.filter(d => d.gateAction === 'would_allow');
  const wouldBlock = evaluated.filter(d => d.gateAction === 'would_block');

  const hitRate = arr => arr.length > 0
    ? +((arr.filter(d => d.hit).length / arr.length) * 100).toFixed(1)
    : 0;
  const avgPnl = arr => arr.length > 0
    ? +(arr.reduce((s, d) => s + d.pnlPct, 0) / arr.length).toFixed(3)
    : 0;

  const blockReasons = {};
  for (const d of wouldBlock) {
    const key = d.gateReason ? d.gateReason.split(':')[0] : 'unknown';
    blockReasons[key] = (blockReasons[key] || 0) + 1;
  }

  const blockRatePct = +((wouldBlock.length / evaluated.length) * 100).toFixed(1);
  const allowHr = hitRate(wouldAllow);
  const blockHr = hitRate(wouldBlock);
  const hrDeltaPp = +(allowHr - blockHr).toFixed(1);

  console.log('=== Full-Risk Gate Simulation Results ===\n');
  console.log(`Total rows:        ${rows.length}`);
  console.log(`Warmup rows:       ${decisions.length - evaluated.length}`);
  console.log(`Evaluated:         ${evaluated.length}`);
  console.log(`Would allow:       ${wouldAllow.length}`);
  console.log(`Would block:       ${wouldBlock.length}  (${blockRatePct}%)`);
  console.log();
  console.log(`Block reasons:`);
  for (const [k, v] of Object.entries(blockReasons)) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }
  console.log();
  console.log(`Hit rate would_allow: ${allowHr}%`);
  console.log(`Hit rate would_block: ${blockHr}%`);
  console.log(`Delta:                ${hrDeltaPp >= 0 ? '+' : ''}${hrDeltaPp} pp`);
  console.log();
  console.log(`Avg PnL would_allow:  ${avgPnl(wouldAllow) >= 0 ? '+' : ''}${avgPnl(wouldAllow)}%`);
  console.log(`Avg PnL would_block:  ${avgPnl(wouldBlock) >= 0 ? '+' : ''}${avgPnl(wouldBlock)}%`);
  console.log();

  // ── Decision per the plan ────────────────────────────────────
  console.log('=== Recommendation ===\n');
  if (blockRatePct < 5) {
    console.log(`block rate ${blockRatePct}% < 5% threshold — gate fires too rarely to matter.`);
    console.log('Recommendation: do NOT proceed with the A/B. The gates would block almost no signals.');
  } else if (hrDeltaPp >= 8) {
    console.log(`block rate ${blockRatePct}% (>= 5%) AND would_allow hit rate is ${hrDeltaPp} pp higher than would_block (>= 8 pp threshold)`);
    console.log('Recommendation: PROCEED with phase 1 (shadow mode) per docs/plans/full-risk-gates-ab.md');
  } else if (hrDeltaPp >= 0) {
    console.log(`block rate ${blockRatePct}% but hit-rate delta only ${hrDeltaPp} pp (below 8 pp threshold)`);
    console.log('Recommendation: marginal value — gates filter some losses but not enough to justify the complexity.');
  } else {
    console.log(`block rate ${blockRatePct}% but would_block actually has HIGHER hit rate than would_allow (${hrDeltaPp} pp delta)`);
    console.log('Recommendation: do NOT proceed — gates would suppress winners. Logic may be miscalibrated.');
  }

  await pool.end();
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
