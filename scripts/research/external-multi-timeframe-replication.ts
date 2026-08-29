/** Thin I/O shell for TC-255's preregistered clean-room replication. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { OHLCV } from '@tradeclaw/core';
import {
  EXTERNAL_REPLICATION_CONFIGS,
  EXTERNAL_REPLICATION_EXPECTED_SHA256,
  EXTERNAL_REPLICATION_SYMBOLS,
  assembleExternalMultiTimeframeReplication,
  type ExternalMultiTimeframeArtifact,
  type ExternalReplicationInput,
  type ExternalReplicationSymbol,
  type FrozenSeriesInput,
  type Timeframe,
} from './external-multi-timeframe-assembly';

export const EXTERNAL_MULTI_TIMEFRAME_ARTIFACT =
  'docs/research/experiments/external-multi-timeframe-BTCUSD_ETHUSD-H1-D1-2018-12-01-2026-07-17-f4.json';

interface CandleDump {
  symbol: string;
  timeframe: string;
  source?: string;
  candles: OHLCV[];
}

export function decodeFrozenSeries(
  bytes: Buffer,
  symbol: ExternalReplicationSymbol,
  timeframe: Timeframe,
  expectedSha256: string,
): FrozenSeriesInput {
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
    throw new Error(`${symbol}-${timeframe} expected SHA-256 must be 64 lowercase hex characters`);
  }
  const actualSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `${symbol}-${timeframe} source SHA-256 mismatch: expected ${expectedSha256}, received ${actualSha256}`,
    );
  }

  let parsed: CandleDump;
  try {
    parsed = JSON.parse(bytes.toString('utf8')) as CandleDump;
  } catch (error) {
    throw new Error(
      `${symbol}-${timeframe} candle dump is not valid JSON: `
      + (error instanceof Error ? error.message : String(error)),
    );
  }
  if (
    parsed.symbol !== symbol
    || parsed.timeframe !== timeframe
    || parsed.source !== 'binance'
    || !Array.isArray(parsed.candles)
  ) {
    throw new Error(`candle dump does not match frozen binance ${symbol}-${timeframe}`);
  }
  return {
    source: parsed.source,
    sourceSha256: actualSha256,
    candles: parsed.candles,
  };
}

export function serializeExternalReplicationArtifact(artifact: unknown): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

interface CliArgs {
  candlesDir: string;
  outPath: string;
}

function parseArgs(argv: string[]): CliArgs {
  if (argv.length % 2 !== 0) throw new Error(`missing value for ${argv[argv.length - 1]}`);
  const allowed = new Set(['--candles-dir', '--out']);
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(name)) throw new Error(`unknown option: ${name}`);
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${name}`);
    if (values.has(name)) throw new Error(`duplicate option: ${name}`);
    values.set(name, value);
  }
  return {
    candlesDir: values.get('--candles-dir') ?? path.join('data', 'research', 'candles'),
    outPath: values.get('--out') ?? EXTERNAL_MULTI_TIMEFRAME_ARTIFACT,
  };
}

function loadInput(candlesDir: string, symbol: ExternalReplicationSymbol): ExternalReplicationInput {
  function load(timeframe: Timeframe): FrozenSeriesInput {
    const dumpPath = path.join(candlesDir, `${symbol}-${timeframe}.json`);
    if (!fs.existsSync(dumpPath)) throw new Error(`frozen candle dump not found: ${dumpPath}`);
    return decodeFrozenSeries(
      fs.readFileSync(dumpPath),
      symbol,
      timeframe,
      EXTERNAL_REPLICATION_EXPECTED_SHA256[symbol][timeframe],
    );
  }
  return { symbol, H1: load('H1'), D1: load('D1') };
}

function percent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function compactResult(artifact: ExternalMultiTimeframeArtifact): string[] {
  const finalConfig = 'd1h1-macd-negative-bar-exit' as const;
  const lines = EXTERNAL_REPLICATION_SYMBOLS.map((symbol) => {
    const result = artifact.results.symbols[symbol].configurations[finalConfig];
    return `${symbol} final: net=${percent(result.full.netCompoundedReturn)}, `
      + `mean/trade=${percent(result.full.meanNetTradeReturn ?? 0)}, `
      + `t=${result.full.netTradeTStatistic ?? 'n/a'}, trades=${result.full.completedTrades}, `
      + `holdout=${percent(result.holdout.netCompoundedReturn)}`;
  });
  const portfolio = artifact.results.portfolio.strategy;
  lines.push(
    `50/50 final: net=${percent(portfolio.full.netCompoundedReturn)}, `
    + `holdout=${percent(portfolio.holdout.netCompoundedReturn)}, `
    + `DD=${percent(portfolio.full.maximumDrawdown)}, Calmar=${portfolio.full.calmar ?? 'n/a'}`,
  );
  return lines;
}

export function runExternalMultiTimeframeCli(
  argv = process.argv.slice(2),
): ExternalMultiTimeframeArtifact {
  const args = parseArgs(argv);
  const inputs = EXTERNAL_REPLICATION_SYMBOLS.map((symbol) => loadInput(args.candlesDir, symbol));
  const artifact = assembleExternalMultiTimeframeReplication(inputs);

  // Data-integrity failure is not an interpretable strategy result. Fail closed
  // before writing a strategy verdict into the experiment ledger.
  if (!artifact.qa.passed) {
    throw new Error(`standing QA failed; artifact not written: ${JSON.stringify(artifact.qa)}`);
  }

  const absoluteOut = path.resolve(args.outPath);
  fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
  fs.writeFileSync(absoluteOut, serializeExternalReplicationArtifact(artifact), 'utf8');

  console.log(
    `External multi-timeframe replication: BTC=${artifact.decision.btcReplication.verdict}, `
    + `portfolio=${artifact.decision.portfolioCandidate.verdict}`,
  );
  for (const line of compactResult(artifact)) console.log(line);
  console.log(`written: ${absoluteOut}`);
  console.log('Research only: activation, allocation, broadcast, and execution remain unapproved.');
  return artifact;
}

if (require.main === module) {
  try {
    runExternalMultiTimeframeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
