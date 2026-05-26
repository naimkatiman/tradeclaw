#!/usr/bin/env node
/**
 * Parse the strategy test output (the Jest-style log produced by
 * `npm test --workspace=@tradeclaw/strategies`) and emit a compact
 * summary JSON suitable for posting as a PR comment.
 *
 * The current strategies test suite writes BacktestResult objects to
 * console.log via the integration snapshot test. We pull every
 * `winRate`, `totalReturn`, `sharpeRatio`, `maxDrawdown`, and
 * `totalTrades` line, average them across strategies, and emit:
 *
 *   { winRate, totalReturn, sharpe, maxDrawdown, totalTrades, strategies }
 *
 * Falls back to a "no-data" summary if no values are found so the PR
 * comment never blocks a doc-only change.
 */

const fs = require('fs');

const LOG_PATH = '.cache/backtest-pr/output.log';

function readLog() {
  try { return fs.readFileSync(LOG_PATH, 'utf8'); }
  catch { return ''; }
}

function avg(arr) {
  const nums = arr.filter(n => Number.isFinite(n));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function extractMetrics(log) {
  const winRates = [];
  const returns = [];
  const sharpes = [];
  const drawdowns = [];
  const tradeCounts = [];

  // Match "winRate: 56.3" or "winRate=0.563" type patterns.
  const winRateRe = /winRate[:=\s]+([0-9.]+)/gi;
  const returnRe = /totalReturn[:=\s]+(-?[0-9.]+)/gi;
  const sharpeRe = /sharpeRatio[:=\s]+(-?[0-9.]+)/gi;
  const ddRe = /maxDrawdown[:=\s]+([0-9.]+)/gi;
  const tradesRe = /totalTrades[:=\s]+([0-9]+)/gi;

  let m;
  while ((m = winRateRe.exec(log))) winRates.push(parseFloat(m[1]));
  while ((m = returnRe.exec(log))) returns.push(parseFloat(m[1]));
  while ((m = sharpeRe.exec(log))) sharpes.push(parseFloat(m[1]));
  while ((m = ddRe.exec(log))) drawdowns.push(parseFloat(m[1]));
  while ((m = tradesRe.exec(log))) tradeCounts.push(parseInt(m[1], 10));

  // Normalize: win rate could be a fraction or a percent.
  const normWin = avg(winRates.map(v => (v <= 1 ? v * 100 : v)));
  const normRet = avg(returns.map(v => (Math.abs(v) <= 1 ? v * 100 : v)));
  const normDD = avg(drawdowns.map(v => (v <= 1 ? v * 100 : v)));
  const totalTrades = tradeCounts.reduce((a, b) => a + b, 0) || null;

  return {
    winRate: normWin,
    totalReturn: normRet,
    sharpe: avg(sharpes),
    maxDrawdown: normDD,
    totalTrades,
    strategies: winRates.length,
  };
}

const log = readLog();
const summary = log ? extractMetrics(log) : { winRate: null, totalReturn: null, sharpe: null, maxDrawdown: null, totalTrades: null, strategies: 0 };
process.stdout.write(JSON.stringify(summary, null, 2));
