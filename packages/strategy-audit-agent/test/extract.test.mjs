import test from "node:test";
import assert from "node:assert/strict";
import { extractBacktestMetrics, hasUsefulMetrics } from "../src/extract.mjs";

test("extractBacktestMetrics parses common TradeClaw result labels", () => {
  const metrics = extractBacktestMetrics(`
    Total Return\n+12.45%\n
    Win Rate: 44.8%\n
    Maximum Drawdown -9.20%\n
    Profit Factor 1.31\n
    Total Trades 52
  `);
  assert.equal(metrics.totalReturnPercent, 12.45);
  assert.equal(metrics.winRatePercent, 44.8);
  assert.equal(metrics.maxDrawdownPercent, -9.2);
  assert.equal(metrics.profitFactor, 1.31);
  assert.equal(metrics.totalTrades, 52);
  assert.equal(hasUsefulMetrics(metrics), true);
});
