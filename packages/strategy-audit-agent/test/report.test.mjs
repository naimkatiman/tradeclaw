import test from "node:test";
import assert from "node:assert/strict";
import { buildMarkdownReport, classifyRun, summarizeResults } from "../src/report.mjs";

const promising = {
  id: "one",
  symbol: "BTCUSD",
  timeframe: "H1",
  period: "90D",
  strategy: "Classic",
  status: "completed",
  mode: "deterministic",
  metrics: {
    totalReturnPercent: 10,
    maxDrawdownPercent: 12,
    profitFactor: 1.25,
    winRatePercent: 43,
    totalTrades: 30,
  },
};

test("classifyRun uses conservative screening thresholds", () => {
  assert.equal(classifyRun(promising), "promising");
  assert.equal(
    classifyRun({ ...promising, metrics: { ...promising.metrics, totalTrades: 12 } }),
    "insufficient-sample",
  );
  assert.equal(
    classifyRun({ ...promising, metrics: { ...promising.metrics, profitFactor: 0.9 } }),
    "weak",
  );
});

test("summarizeResults and report expose failures and disclaimers", () => {
  const failed = { ...promising, id: "two", status: "failed", error: "timeout" };
  const summary = summarizeResults([promising, failed]);
  assert.equal(summary.completedRuns, 1);
  assert.equal(summary.failedRuns, 1);
  assert.equal(summary.promisingRuns, 1);

  const report = buildMarkdownReport({
    request: {
      customer: { name: "Test" },
      objective: "Test robustness",
      strategyRules: "Frozen rules",
      initialBalance: 10_000,
      riskPerTradePercent: 1,
      includeSlippage: true,
    },
    results: [promising, failed],
    generatedAt: "2026-06-24T00:00:00.000Z",
  });
  assert.match(report, /not investment advice/i);
  assert.match(report, /two: timeout/);
  assert.match(report, /promising/);
});
