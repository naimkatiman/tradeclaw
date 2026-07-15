#!/usr/bin/env node
/**
 * Parse the Jest snapshot at
 * `packages/strategies/src/__tests__/__snapshots__/integration-snapshot.test.ts.snap`
 * and emit a compact summary JSON for the backtest PR comment.
 *
 * The snapshot is a deterministic record of per-strategy modeled results on
 * a fixed test fixture. It is suitable for code-regression diagnostics only;
 * it is not live, out-of-sample, broker, account, or portfolio performance.
 *
 *   { winRate, totalReturn, profitFactor, maxDrawdown, totalTrades, strategies }
 *
 * Emits an explicit unavailable summary if the snapshot is missing.
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOT_PATH = path.join(
  'packages',
  'strategies',
  'src',
  '__tests__',
  '__snapshots__',
  'integration-snapshot.test.ts.snap',
);

function readSnapshot() {
  try { return fs.readFileSync(SNAPSHOT_PATH, 'utf8'); }
  catch { return ''; }
}

function avg(arr) {
  const nums = arr.filter(n => Number.isFinite(n));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function parseSnapshot(text) {
  // The snapshot stores numbers as bare values (`"winRate": 0.1333,`) and
  // "inf" as a string. Pull each metric per strategy block.
  const winRateRe = /"winRate":\s*([\-0-9.]+)/g;
  const returnRe = /"totalReturn":\s*([\-0-9.]+)/g;
  const profitFactorRe = /"profitFactor":\s*([\-0-9.]+|"inf")/g;
  const ddRe = /"maxDrawdown":\s*([\-0-9.]+)/g;
  const tradesRe = /"totalTrades":\s*([0-9]+)/g;

  const collect = (re) => {
    const out = [];
    let m;
    while ((m = re.exec(text))) {
      const v = m[1] === '"inf"' ? Infinity : parseFloat(m[1]);
      out.push(v);
    }
    return out;
  };

  const winRates = collect(winRateRe);
  const returns = collect(returnRe);
  const profitFactors = collect(profitFactorRe).filter(Number.isFinite);
  const drawdowns = collect(ddRe);
  const trades = [];
  let m;
  while ((m = tradesRe.exec(text))) trades.push(parseInt(m[1], 10));

  return {
    available: winRates.length > 0,
    fixture: 'packages/strategies/src/__tests__/fixtures/candles-100.json',
    aggregation: 'unweighted mean across preset snapshots; totalTrades is summed',
    winRate: nullOr(avg(winRates), v => v * 100),
    totalReturn: nullOr(avg(returns), v => v * 100),
    profitFactor: avg(profitFactors),
    maxDrawdown: nullOr(avg(drawdowns), v => v * 100),
    totalTrades: trades.length ? trades.reduce((a, b) => a + b, 0) : null,
    strategies: winRates.length,
  };
}

function nullOr(v, transform) {
  return v == null ? null : transform(v);
}

const text = readSnapshot();
const summary = text
  ? parseSnapshot(text)
  : {
      available: false,
      fixture: 'packages/strategies/src/__tests__/fixtures/candles-100.json',
      aggregation: 'unweighted mean across preset snapshots; totalTrades is summed',
      winRate: null,
      totalReturn: null,
      profitFactor: null,
      maxDrawdown: null,
      totalTrades: null,
      strategies: 0,
    };
process.stdout.write(JSON.stringify(summary, null, 2));
