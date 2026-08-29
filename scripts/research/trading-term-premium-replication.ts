/** Thin, fail-closed I/O shell for TC-259's frozen term-premium replication. */

import fs from 'fs';
import path from 'path';
import {
  assembleTradingTermPremiumReplication,
  serializeTradingTermPremiumArtifact,
  type TradingTermPremiumArtifact,
} from './trading-term-premium-assembly';

export const TRADING_TERM_PREMIUM_ARTIFACT =
  'docs/research/experiments/trading-term-premium-US-NOMINAL-MA40-1968-01-2026-07-f4.json';

const INPUT_PATHS = {
  input:
    'docs/research/data/trading-term-premium/fed-nominal-month-end-1961-06-30-2026-07-31.csv',
  sourceAudit: 'docs/research/2026-08-29-trading-term-premium-source-audit.md',
  preregistration: 'docs/plans/2026-08-29-trading-term-premium-replication.md',
} as const;

function readFrozenText(relativePath: string): string {
  const absolute = path.resolve(relativePath);
  if (!fs.existsSync(absolute)) throw new Error(`frozen research input not found: ${relativePath}`);
  return fs.readFileSync(absolute, 'utf8');
}

function parseArgs(argv: string[]): { outPath: string } {
  if (argv.length === 0) return { outPath: TRADING_TERM_PREMIUM_ARTIFACT };
  if (argv.length !== 2 || argv[0] !== '--out' || !argv[1] || argv[1].startsWith('--')) {
    throw new Error('usage: trading-term-premium-replication.ts [--out <path>]');
  }
  return { outPath: argv[1] };
}

function signedPercent(value: number): string {
  const percent = value * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

function fixed(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : 'null';
}

export function runTradingTermPremiumReplication(
  argv = process.argv.slice(2),
): TradingTermPremiumArtifact {
  const { outPath } = parseArgs(argv);
  const artifact = assembleTradingTermPremiumReplication({
    inputText: readFrozenText(INPUT_PATHS.input),
    sourceAuditText: readFrozenText(INPUT_PATHS.sourceAudit),
    preregistrationText: readFrozenText(INPUT_PATHS.preregistration),
  });

  const absoluteOut = path.resolve(outPath);
  fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
  fs.writeFileSync(absoluteOut, serializeTradingTermPremiumArtifact(artifact), 'utf8');

  if (!artifact.qa.passed || artifact.results === null) {
    console.log('Trading the Term Premium replication verdict: INCONCLUSIVE');
    console.log(`Standing QA failed: ${artifact.decision.qaFailureReasons.join('; ')}`);
    console.log(`written: ${absoluteOut}`);
    console.log(
      'Research only: no performance verdict, publication, activation, allocation, broadcast, or execution.',
    );
    return artifact;
  }

  const full = artifact.results.full;
  const holdout = artifact.results.holdout;
  console.log(`Trading the Term Premium replication verdict: ${artifact.decision.verdict}`);
  console.log(
    `full headline: canonical=${signedPercent(full.canonical.headline.compoundedReturn)}, `
      + `always-10y=${signedPercent(full.alwaysTenYear.headline.compoundedReturn)}, `
      + `always-1m=${signedPercent(full.alwaysOneMonth.headline.compoundedReturn)}, `
      + `Sharpe=${fixed(full.canonical.headline.annualizedSharpe)}`,
  );
  console.log(
    `holdout headline: canonical=${signedPercent(holdout.canonical.headline.compoundedReturn)}, `
      + `always-10y=${signedPercent(holdout.alwaysTenYear.headline.compoundedReturn)}, `
      + `always-1m=${signedPercent(holdout.alwaysOneMonth.headline.compoundedReturn)}, `
      + `Sharpe=${fixed(holdout.canonical.headline.annualizedSharpe)}`,
  );
  console.log(
    `paper-fold stability: ${artifact.decision.passingPaperFoldCount}/4; `
      + `failed gates: ${artifact.decision.failedPerformanceGates.join(', ') || 'none'}`,
  );
  console.log(`written: ${absoluteOut}`);
  console.log(
    'Research only: publication, activation, allocation, broadcast, and execution remain unapproved.',
  );
  return artifact;
}

if (require.main === module) {
  try {
    runTradingTermPremiumReplication();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
