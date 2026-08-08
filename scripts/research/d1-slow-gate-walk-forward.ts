/** Thin I/O shell for the preregistered D1 slow-gate walk-forward. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { OHLCV } from '@tradeclaw/core';
import {
  D1_SLOW_GATE_EXPECTED_SOURCE_SHA256,
  D1_SLOW_GATE_WALK_FORWARD_END_TS,
  D1_SLOW_GATE_WALK_FORWARD_START_TS,
  D1_SLOW_GATE_WALK_FORWARD_SYMBOLS,
  assembleD1SlowGateWalkForward,
  type D1SlowGateWalkForwardArtifact,
  type D1SlowGateWalkForwardSymbol,
  type WalkForwardInput,
} from './d1-slow-gate-walk-forward-assembly';

export const D1_SLOW_GATE_WALK_FORWARD_ARTIFACT =
  'docs/research/experiments/d1-slow-gate-walk-forward-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json';

interface CandleDump {
  symbol: string;
  timeframe: string;
  source?: string;
  candles: OHLCV[];
}

export function decodeFrozenCandleDump(
  bytes: Buffer,
  symbol: D1SlowGateWalkForwardSymbol,
  expectedSha256: string,
): WalkForwardInput {
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
    throw new Error(`${symbol} expected SHA-256 must be 64 lowercase hex characters`);
  }
  const actualSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `${symbol} source SHA-256 mismatch: expected ${expectedSha256}, received ${actualSha256}`,
    );
  }

  let parsed: CandleDump;
  try {
    parsed = JSON.parse(bytes.toString('utf8')) as CandleDump;
  } catch (error) {
    throw new Error(`${symbol} candle dump is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (parsed.symbol !== symbol || parsed.timeframe !== 'D1' || !Array.isArray(parsed.candles)) {
    throw new Error(`candle dump does not match ${symbol} D1`);
  }
  return { symbol, sourceSha256: actualSha256, candles: parsed.candles };
}

export function serializeWalkForwardArtifact(artifact: unknown): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

/** Hash identity remains the full dump; only evaluation candles are windowed. */
export function filterFrozenWalkForwardWindow(input: WalkForwardInput): WalkForwardInput {
  return {
    ...input,
    candles: input.candles.filter((candle) => (
      candle.timestamp >= D1_SLOW_GATE_WALK_FORWARD_START_TS &&
      candle.timestamp <= D1_SLOW_GATE_WALK_FORWARD_END_TS
    )),
  };
}

interface CliArgs {
  candlesDir: string;
  outPath: string;
}

function parseArgs(argv: string[]): CliArgs {
  const allowed = new Set(['--candles-dir', '--out']);
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(name)) throw new Error(`unknown option: ${name}`);
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${name}`);
    values.set(name, value);
  }
  return {
    candlesDir: values.get('--candles-dir') ?? path.join('data', 'research', 'candles'),
    outPath: values.get('--out') ?? D1_SLOW_GATE_WALK_FORWARD_ARTIFACT,
  };
}

function loadInput(candlesDir: string, symbol: D1SlowGateWalkForwardSymbol): WalkForwardInput {
  const dumpPath = path.join(candlesDir, `${symbol}-D1.json`);
  if (!fs.existsSync(dumpPath)) {
    throw new Error(`frozen candle dump not found: ${dumpPath}`);
  }
  return filterFrozenWalkForwardWindow(decodeFrozenCandleDump(
    fs.readFileSync(dumpPath),
    symbol,
    D1_SLOW_GATE_EXPECTED_SOURCE_SHA256[symbol],
  ));
}

function qaFailureSummary(artifact: D1SlowGateWalkForwardArtifact): string {
  return D1_SLOW_GATE_WALK_FORWARD_SYMBOLS.map((symbol) => {
    const reconciliation = artifact.qa.reconciliation[symbol];
    const lookahead = artifact.qa.lookahead[symbol];
    return `${symbol}: reconciliation=${reconciliation.actual}/${reconciliation.expected}, lookahead=${lookahead.passed}`;
  }).join('; ');
}

export function runD1SlowGateWalkForwardCli(argv = process.argv.slice(2)): D1SlowGateWalkForwardArtifact {
  const args = parseArgs(argv);
  const inputs = D1_SLOW_GATE_WALK_FORWARD_SYMBOLS.map((symbol) => loadInput(args.candlesDir, symbol));
  const artifact = assembleD1SlowGateWalkForward(inputs);

  // A data-integrity failure is not an interpretable strategy result. Do not
  // write or print a PASS/KILL verdict from unreconciled evidence.
  if (!artifact.qa.passed) {
    throw new Error(`standing QA failed; artifact not written (${qaFailureSummary(artifact)})`);
  }

  const absoluteOut = path.resolve(args.outPath);
  fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
  fs.writeFileSync(absoluteOut, serializeWalkForwardArtifact(artifact), 'utf8');

  const portfolio = artifact.results.portfolio.full;
  console.log(`D1 slow-gate walk-forward: ${artifact.decision.verdict}`);
  console.log(
    `portfolio strategy return=${(portfolio.strategy.totalReturn * 100).toFixed(2)}% ` +
    `Calmar=${portfolio.strategy.calmar ?? 'n/a'}; ` +
    `buy-hold return=${(portfolio.benchmark.totalReturn * 100).toFixed(2)}% ` +
    `Calmar=${portfolio.benchmark.calmar ?? 'n/a'}`,
  );
  console.log(`Calmar folds passed: ${artifact.decision.calmarFoldPasses}/4`);
  console.log(`written: ${absoluteOut}`);
  console.log('Activation remains unapproved; the lane is simulated.');
  return artifact;
}

if (require.main === module) {
  try {
    runD1SlowGateWalkForwardCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
