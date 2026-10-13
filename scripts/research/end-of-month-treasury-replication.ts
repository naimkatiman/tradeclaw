/** Thin, fail-closed I/O shell for TC-257's frozen Treasury replication. */

import fs from 'fs';
import path from 'path';
import {
  END_OF_MONTH_TREASURY_PREREGISTRATION_SHA256,
  END_OF_MONTH_TREASURY_SOURCE_AUDIT_SHA256,
  assembleEndOfMonthTreasuryReplication,
  canonicalResearchSha256,
  type EndOfMonthTreasuryArtifact,
} from './end-of-month-treasury-assembly';

export const END_OF_MONTH_TREASURY_ARTIFACT =
  'docs/research/experiments/end-of-month-treasury-US-NOMINAL-DTWEXBGS-1990-01-2026-07-f4.json';

const INPUT_PATHS = {
  nominal:
    'docs/research/data/end-of-month-treasury/fed-nominal-svensson-1989-12-01-2026-07-31.csv',
  financing: 'docs/research/data/end-of-month-treasury/DFF-1989-12-01-2026-07-31.csv',
  dollar: 'docs/research/data/end-of-month-treasury/DTWEXBGS-2006-01-02-2026-07-31.csv',
  preregistration: 'docs/plans/2026-08-29-end-of-month-treasury-replication.md',
  sourceAudit: 'docs/research/2026-08-29-predictable-end-of-month-treasury-source-audit.md',
} as const;

export function serializeEndOfMonthTreasuryArtifact(artifact: unknown): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

function readFrozenText(relativePath: string): string {
  const absolute = path.resolve(relativePath);
  if (!fs.existsSync(absolute)) throw new Error(`frozen research input not found: ${relativePath}`);
  return fs.readFileSync(absolute, 'utf8');
}

function requireDocumentHash(relativePath: string, expectedSha256: string): void {
  const actual = canonicalResearchSha256(readFrozenText(relativePath));
  if (actual !== expectedSha256) {
    throw new Error(
      `${relativePath} canonical SHA-256 mismatch: expected ${expectedSha256}, received ${actual}`,
    );
  }
}

function parseArgs(argv: string[]): { outPath: string } {
  if (argv.length === 0) return { outPath: END_OF_MONTH_TREASURY_ARTIFACT };
  if (argv.length !== 2 || argv[0] !== '--out' || !argv[1] || argv[1].startsWith('--')) {
    throw new Error('usage: end-of-month-treasury-replication.ts [--out <path>]');
  }
  return { outPath: argv[1] };
}

function signedPercent(value: number): string {
  const pct = value * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

function basisPointsFromLog(value: number): string {
  const bps = value * 10_000;
  return `${bps >= 0 ? '+' : ''}${bps.toFixed(2)}bp`;
}

export function runEndOfMonthTreasuryReplication(
  argv = process.argv.slice(2),
): EndOfMonthTreasuryArtifact {
  const { outPath } = parseArgs(argv);
  requireDocumentHash(
    INPUT_PATHS.preregistration,
    END_OF_MONTH_TREASURY_PREREGISTRATION_SHA256,
  );
  requireDocumentHash(INPUT_PATHS.sourceAudit, END_OF_MONTH_TREASURY_SOURCE_AUDIT_SHA256);

  const artifact = assembleEndOfMonthTreasuryReplication({
    nominalText: readFrozenText(INPUT_PATHS.nominal),
    financingText: readFrozenText(INPUT_PATHS.financing),
    dollarText: readFrozenText(INPUT_PATHS.dollar),
  });

  const absoluteOut = path.resolve(outPath);
  fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
  fs.writeFileSync(absoluteOut, serializeEndOfMonthTreasuryArtifact(artifact), 'utf8');

  if (!artifact.qa.passed || artifact.results === null) {
    console.log('End-of-month Treasury replication verdict: INCONCLUSIVE');
    console.log(
      `Standing QA failed before performance gates: ${artifact.decision.qaFailureReasons.join('; ')}`,
    );
    console.log(`written: ${absoluteOut}`);
    console.log(
      'Research only: no performance verdict, publication, activation, allocation, broadcast, or execution.',
    );
    return artifact;
  }

  const five = artifact.results.fiveYearMonthEnd;
  const ten = artifact.results.tenYearMonthEnd;
  console.log(`End-of-month Treasury replication verdict: ${artifact.decision.verdict}`);
  console.log(
    `5y full: net=${signedPercent(five.full.headlineCompoundedReturn)}, `
      + `mean=${basisPointsFromLog(five.full.meanHeadlineNetLog)}, `
      + `stress mean=${basisPointsFromLog(five.full.meanStressNetLog)}, `
      + `holdout mean=${basisPointsFromLog(five.holdout.meanHeadlineNetLog)}, `
      + `folds=${artifact.decision.fiveYearPositiveFoldCount}/4 positive`,
  );
  console.log(
    `10y paper/holdout mean=${basisPointsFromLog(ten.paperWindow.meanHeadlineNetLog)}`
      + `/${basisPointsFromLog(ten.holdout.meanHeadlineNetLog)}; `
      + `break-even 5y paper/holdout=${five.paperWindow.breakEvenRoundTripCostBps.toFixed(2)}`
      + `/${five.holdout.breakEvenRoundTripCostBps.toFixed(2)}bp`,
  );
  console.log(`written: ${absoluteOut}`);
  console.log(
    'Research only: publication, activation, allocation, broadcast, and execution remain unapproved.',
  );
  return artifact;
}

if (require.main === module) {
  try {
    runEndOfMonthTreasuryReplication();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
