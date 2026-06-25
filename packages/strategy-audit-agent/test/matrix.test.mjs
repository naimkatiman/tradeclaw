import test from "node:test";
import assert from "node:assert/strict";
import { buildAuditMatrix } from "../src/matrix.mjs";

const request = {
  symbols: ["BTCUSD", "ETHUSD"],
  timeframes: ["H1", "H4"],
  periods: ["90D"],
  strategies: ["Classic", "ATR Trend Follow"],
  initialBalance: 10_000,
  riskPerTradePercent: 1,
  includeSlippage: true,
  maxRuns: 8,
};

test("buildAuditMatrix creates the full bounded cartesian product", () => {
  const runs = buildAuditMatrix(request);
  assert.equal(runs.length, 8);
  assert.equal(new Set(runs.map((run) => run.id)).size, 8);
  assert.deepEqual(runs[0], {
    id: "btcusd__h1__90d__classic",
    symbol: "BTCUSD",
    timeframe: "H1",
    period: "90D",
    strategy: "Classic",
    initialBalance: 10_000,
    riskPerTradePercent: 1,
    includeSlippage: true,
  });
});

test("buildAuditMatrix rejects broad searches above the declared cap", () => {
  assert.throws(
    () => buildAuditMatrix({ ...request, maxRuns: 7 }),
    /above maxRuns=7/,
  );
});

test("buildAuditMatrix caps expensive computer-only matrices", () => {
  assert.throws(
    () => buildAuditMatrix({ ...request, mode: "computer", maxRuns: 48, symbols: ["BTCUSD", "ETHUSD", "XAUUSD"] }),
    /Computer-only mode is capped at 8 runs/,
  );
});
