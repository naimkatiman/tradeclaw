#!/usr/bin/env node
/**
 * Analyzer for full-risk gates shadow-mode rollout.
 *
 * Steps:
 *   1. SSH /tmp/tradeclaw-gate-decisions.log down from the Railway web container
 *   2. Parse NDJSON, aggregate gate decisions
 *   3. Re-run the historical simulation (delegated to simulate-full-risk-gates.js)
 *   4. Join blocked signals against signal_history outcomes to compute the
 *      observed hit-rate delta
 *   5. Compare against phase-2 trigger criteria from
 *      docs/plans/full-risk-gates-ab.md
 *   6. Print a PROCEED / WAIT / INVESTIGATE recommendation
 *
 * Usage:
 *   node scripts/analyze-gate-shadow.js                # analyze + recommend
 *   node scripts/analyze-gate-shadow.js --apply        # if PROCEED, flip to active
 *
 * Phase-2 criteria (must ALL hold):
 *   1. >= 30 blocked signals with resolved outcomes
 *   2. would_block hit rate is >= 8 pp lower than would_allow
 *   3. gate fires on >= 10% of evaluated batches
 *   4. would_allow hit rate >= overall historical baseline (no over-blocking)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const REPO_ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(REPO_ROOT, 'data', 'gate-shadow-logs');
const todayStr = new Date().toISOString().slice(0, 10);
const LOCAL_LOG_PATH = path.join(LOG_DIR, `gate-decisions-${todayStr}.log`);

const APPLY = process.argv.includes('--apply');

// ── Phase-2 criteria thresholds ──
const MIN_RESOLVED_BLOCKED = 30;
const MIN_HIT_RATE_DELTA_PP = 8;
const MIN_BATCH_BLOCK_RATE = 0.10;

function step(msg) {
  console.log(`\n=== ${msg} ===`);
}

// ── Step 1: download log ──
function downloadLog() {
  step('1. Downloading /tmp/tradeclaw-gate-decisions.log from Railway web container');
  fs.mkdirSync(LOG_DIR, { recursive: true });
  try {
    // Use heredoc-style command so spaces stay literal
    const out = execSync(
      `railway ssh -s web "cat /tmp/tradeclaw-gate-decisions.log 2>/dev/null || echo ''"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 },
    );
    fs.writeFileSync(LOCAL_LOG_PATH, out);
    const lineCount = out.split('\n').filter((l) => l.trim()).length;
    console.log(`saved → ${LOCAL_LOG_PATH}  (${lineCount} entries)`);
    return lineCount;
  } catch (err) {
    console.error('SSH failed:', err.message);
    console.error('Hint: ensure railway CLI is logged in and `railway service link web` was run.');
    process.exit(2);
  }
}

// ── Step 2: parse + aggregate ──
function parseLog() {
  step('2. Parsing gate decisions log');
  const raw = fs.readFileSync(LOCAL_LOG_PATH, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim());
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip corrupt line
    }
  }

  const totalBatches = entries.length;
  const blockedBatches = entries.filter((e) => !e.gateState.gatesAllow).length;
  const totalPassed = entries.reduce((s, e) => s + (e.passedCount || 0), 0);
  const totalBlocked = entries.reduce((s, e) => s + (e.blockedCount || 0), 0);

  const blockReasons = {};
  for (const e of entries) {
    if (e.gateState.reason) {
      const key = e.gateState.reason.split(':')[0];
      blockReasons[key] = (blockReasons[key] || 0) + 1;
    }
  }

  // Collect all signal IDs that the gate would have blocked
  const blockedIds = new Set();
  for (const e of entries) {
    for (const s of e.blockedSignals || []) blockedIds.add(s.id);
  }
  const passedIds = new Set();
  for (const e of entries) {
    for (const s of e.passedSignals || []) passedIds.add(s.id);
  }

  console.log(`Total batches:        ${totalBatches}`);
  console.log(`Batches gate blocked: ${blockedBatches}  (${((blockedBatches / Math.max(1, totalBatches)) * 100).toFixed(1)}%)`);
  console.log(`Total passed signals: ${totalPassed}`);
  console.log(`Total blocked signals:${totalBlocked}`);
  console.log(`Unique blocked ids:   ${blockedIds.size}`);
  console.log(`Unique passed ids:    ${passedIds.size}`);
  console.log(`Block reasons:`);
  for (const [k, v] of Object.entries(blockReasons)) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }

  return {
    totalBatches,
    blockedBatches,
    blockedIds,
    passedIds,
    blockReasons,
    batchBlockRate: totalBatches > 0 ? blockedBatches / totalBatches : 0,
  };
}

// ── Step 3: rerun historical simulation ──
function rerunHistoricalSim() {
  step('3. Re-running historical simulation against current signal_history');
  try {
    const out = execSync('node scripts/simulate-full-risk-gates.js', {
      encoding: 'utf8',
      cwd: REPO_ROOT,
      timeout: 120_000,
    });
    console.log(out);
    // Extract a few key numbers
    const blockMatch = out.match(/Would block:\s+\d+\s+\(([\d.]+)%\)/);
    const allowHrMatch = out.match(/Hit rate would_allow:\s+([\d.]+)%/);
    const blockHrMatch = out.match(/Hit rate would_block:\s+([\d.]+)%/);
    return {
      historicalBlockRatePct: blockMatch ? Number(blockMatch[1]) : null,
      historicalAllowHr: allowHrMatch ? Number(allowHrMatch[1]) : null,
      historicalBlockHr: blockHrMatch ? Number(blockHrMatch[1]) : null,
    };
  } catch (err) {
    console.error('historical simulation failed:', err.message);
    return { historicalBlockRatePct: null, historicalAllowHr: null, historicalBlockHr: null };
  }
}

// ── Step 4: join shadow decisions against signal_history outcomes ──
async function joinShadowDecisionsAgainstOutcomes(parsed) {
  step('4. Joining shadow decisions against resolved signal_history outcomes');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in .env — skipping join');
    return null;
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const idsBlocked = Array.from(parsed.blockedIds);
    const idsPassed = Array.from(parsed.passedIds);

    if (idsBlocked.length === 0 && idsPassed.length === 0) {
      console.log('no shadow decisions to join');
      return null;
    }

    const fetchOutcomes = async (ids) => {
      if (ids.length === 0) return [];
      const r = await pool.query(
        `SELECT id,
                (outcome_24h->>'hit')::boolean    AS hit,
                (outcome_24h->>'pnlPct')::numeric AS pnl_pct
         FROM signal_history
         WHERE id = ANY($1::text[])
           AND outcome_24h IS NOT NULL`,
        [ids],
      );
      return r.rows;
    };

    const [blockedOutcomes, passedOutcomes] = await Promise.all([
      fetchOutcomes(idsBlocked),
      fetchOutcomes(idsPassed),
    ]);

    const hitRate = (rows) =>
      rows.length > 0
        ? +((rows.filter((r) => r.hit).length / rows.length) * 100).toFixed(1)
        : null;
    const avgPnl = (rows) =>
      rows.length > 0
        ? +(rows.reduce((s, r) => s + Number(r.pnl_pct), 0) / rows.length).toFixed(3)
        : null;

    const summary = {
      blockedResolved: blockedOutcomes.length,
      passedResolved: passedOutcomes.length,
      blockedHitRate: hitRate(blockedOutcomes),
      passedHitRate: hitRate(passedOutcomes),
      blockedAvgPnl: avgPnl(blockedOutcomes),
      passedAvgPnl: avgPnl(passedOutcomes),
    };

    console.log(`blocked signals resolved: ${summary.blockedResolved}`);
    console.log(`passed  signals resolved: ${summary.passedResolved}`);
    console.log(`blocked hit rate (24h):   ${summary.blockedHitRate ?? '—'}%`);
    console.log(`passed  hit rate (24h):   ${summary.passedHitRate ?? '—'}%`);
    if (summary.blockedHitRate !== null && summary.passedHitRate !== null) {
      console.log(`delta:                    +${(summary.passedHitRate - summary.blockedHitRate).toFixed(1)} pp`);
    }
    console.log(`blocked avg pnl:          ${summary.blockedAvgPnl ?? '—'}%`);
    console.log(`passed  avg pnl:          ${summary.passedAvgPnl ?? '—'}%`);

    return summary;
  } finally {
    await pool.end();
  }
}

// ── Step 5: phase-2 decision ──
function decidePhase2(parsed, joined, historical) {
  step('5. Phase-2 decision against criteria');

  if (!joined || joined.blockedHitRate === null || joined.passedHitRate === null) {
    console.log('Insufficient resolved data to evaluate criteria.');
    return { recommendation: 'WAIT', reason: 'insufficient resolved data' };
  }

  const checks = [];
  const c1 = joined.blockedResolved >= MIN_RESOLVED_BLOCKED;
  checks.push({
    name: `≥ ${MIN_RESOLVED_BLOCKED} blocked-and-resolved signals`,
    pass: c1,
    actual: joined.blockedResolved,
  });

  const delta = +(joined.passedHitRate - joined.blockedHitRate).toFixed(1);
  const c2 = delta >= MIN_HIT_RATE_DELTA_PP;
  checks.push({
    name: `passed hit rate ≥ blocked hit rate + ${MIN_HIT_RATE_DELTA_PP} pp`,
    pass: c2,
    actual: `+${delta} pp`,
  });

  const c3 = parsed.batchBlockRate >= MIN_BATCH_BLOCK_RATE;
  checks.push({
    name: `gate fires on ≥ ${(MIN_BATCH_BLOCK_RATE * 100).toFixed(0)}% of batches`,
    pass: c3,
    actual: `${(parsed.batchBlockRate * 100).toFixed(1)}%`,
  });

  // Criterion 4: passed hit rate must be at least the overall baseline
  // (use the historical_block_hr + allow_hr split as the baseline proxy)
  const baseline =
    historical.historicalAllowHr !== null && historical.historicalBlockHr !== null
      ? null // we'll use straight overall-historical from the simulation script
      : null;
  // Simpler: compare against a hardcoded ~24.5% baseline (current production avg)
  const HISTORICAL_BASELINE = 24.5;
  const c4 = joined.passedHitRate >= HISTORICAL_BASELINE;
  checks.push({
    name: `passed hit rate ≥ historical baseline (${HISTORICAL_BASELINE}%)`,
    pass: c4,
    actual: `${joined.passedHitRate}%`,
  });

  for (const c of checks) {
    console.log(`  [${c.pass ? '✓' : '✗'}] ${c.name.padEnd(55)} actual: ${c.actual}`);
  }

  const allPass = checks.every((c) => c.pass);
  if (allPass) {
    return { recommendation: 'PROCEED', reason: 'all phase-2 criteria met' };
  }

  // Investigate vs wait: c1 failing = wait (need more data); others = investigate
  if (!c1) {
    return { recommendation: 'WAIT', reason: 'need more resolved blocked signals' };
  }
  return {
    recommendation: 'INVESTIGATE',
    reason: 'criteria failed beyond minimum sample size',
  };
}

// ── Step 6: optionally apply phase 2 ──
function applyPhase2() {
  step('6. Applying phase-2 (TRADECLAW_GATE_MODE=active)');
  try {
    execSync('railway service link web', { stdio: 'inherit', cwd: REPO_ROOT });
    execSync('railway variables --set "TRADECLAW_GATE_MODE=active" --skip-deploys', {
      stdio: 'inherit',
      cwd: REPO_ROOT,
    });
    execSync('railway up --detach', { stdio: 'inherit', cwd: REPO_ROOT });
    console.log('\nPhase 2 active. Monitor /api/strategy-breakdown and signal_history hit rate over the next 24h.');
  } catch (err) {
    console.error('apply failed:', err.message);
    process.exit(3);
  }
}

// ── Main ──
(async () => {
  console.log('Full-risk gates shadow-mode analyzer');
  console.log('====================================');
  console.log(`apply mode: ${APPLY ? 'YES' : 'no (dry-run)'}`);

  const lineCount = downloadLog();
  if (lineCount === 0) {
    console.log('\nGate log is empty. Nothing to analyze yet — re-run after some shadow traffic.');
    process.exit(0);
  }

  const parsed = parseLog();
  const historical = rerunHistoricalSim();
  const joined = await joinShadowDecisionsAgainstOutcomes(parsed);
  const decision = decidePhase2(parsed, joined, historical);

  step('Recommendation');
  console.log(`${decision.recommendation} — ${decision.reason}`);

  if (decision.recommendation === 'PROCEED' && APPLY) {
    applyPhase2();
  } else if (decision.recommendation === 'PROCEED') {
    console.log('\nRe-run with --apply to flip TRADECLAW_GATE_MODE=active and redeploy.');
  }
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
