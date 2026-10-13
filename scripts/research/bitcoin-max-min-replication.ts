/** Thin I/O shell for TC-258's frozen Bitcoin MAX10/MIN10 replication. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  BITCOIN_MAX_MIN_EXPECTED_INPUT_SHA256,
  BITCOIN_MAX_MIN_SYMBOLS,
  assembleBitcoinMaxMinReplication,
  type BitcoinMaxMinArtifact,
  type BitcoinMaxMinSourceFile,
  type BitcoinMaxMinSymbol,
  type FrozenBitcoinMaxMinInput,
} from './bitcoin-max-min-assembly';

export const BITCOIN_MAX_MIN_ARTIFACT =
  'docs/research/experiments/bitcoin-max-min-BTCUSD_ETHUSD-D1-2015-11-26-2026-07-31-f4.json';

export function decodeBitcoinMaxMinInput(
  bytes: Buffer,
  symbol: BitcoinMaxMinSymbol,
  expectedSha256: string,
): FrozenBitcoinMaxMinInput {
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
    throw new Error(`${symbol} expected SHA-256 must be 64 lowercase hexadecimal characters`);
  }
  const actualSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actualSha256 !== expectedSha256) {
    throw new Error(`${symbol} source SHA-256 mismatch: expected ${expectedSha256}, received ${actualSha256}`);
  }
  let data: BitcoinMaxMinSourceFile;
  try {
    data = JSON.parse(bytes.toString('utf8')) as BitcoinMaxMinSourceFile;
  } catch (error) {
    throw new Error(
      `${symbol} input is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (data.symbol !== symbol || !Array.isArray(data.candles)) {
    throw new Error(`${symbol} input does not match its frozen source identity`);
  }
  return { sourceSha256: actualSha256, data };
}

export function serializeBitcoinMaxMinArtifact(artifact: unknown): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

interface CliArgs {
  inputsDir: string;
  outPath: string;
}

function parseArgs(argv: string[]): CliArgs {
  if (argv.length % 2 !== 0) throw new Error(`missing value for ${argv.at(-1)}`);
  const allowed = new Set(['--inputs-dir', '--out']);
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
    inputsDir: values.get('--inputs-dir') ?? path.join('data', 'research', 'bitcoin-seasonality'),
    outPath: values.get('--out') ?? BITCOIN_MAX_MIN_ARTIFACT,
  };
}

function loadInput(inputsDir: string, symbol: BitcoinMaxMinSymbol): FrozenBitcoinMaxMinInput {
  const inputPath = path.join(inputsDir, `${symbol}-D1.json`);
  if (!fs.existsSync(inputPath)) throw new Error(`frozen source input not found: ${inputPath}`);
  return decodeBitcoinMaxMinInput(
    fs.readFileSync(inputPath),
    symbol,
    BITCOIN_MAX_MIN_EXPECTED_INPUT_SHA256[symbol],
  );
}

function signedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

function compactResult(artifact: BitcoinMaxMinArtifact): string[] {
  if (!artifact.results) return ['Performance gates were not evaluated because standing QA failed.'];
  return BITCOIN_MAX_MIN_SYMBOLS.map((symbol) => {
    const result = artifact.results!.symbols[symbol].configurations['composite-10'];
    return `${symbol}: gross=${signedPercent(result.full.gross.compoundedReturn)}, `
      + `net=${signedPercent(result.full.headline.compoundedReturn)}, `
      + `episodes=${result.full.headline.completedEpisodes}, `
      + `holdout=${signedPercent(result.holdout.headline.compoundedReturn)}, `
      + `positive-folds=${result.folds.filter((fold) => fold.readings.headline.compoundedReturn > 0).length}/4`;
  });
}

export function runBitcoinMaxMinCli(
  argv = process.argv.slice(2),
): BitcoinMaxMinArtifact {
  const args = parseArgs(argv);
  const inputs = BITCOIN_MAX_MIN_SYMBOLS.map((symbol) => loadInput(args.inputsDir, symbol));
  const artifact = assembleBitcoinMaxMinReplication(inputs);
  const absoluteOut = path.resolve(args.outPath);
  fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
  fs.writeFileSync(absoluteOut, serializeBitcoinMaxMinArtifact(artifact), 'utf8');
  console.log(
    `Bitcoin MAX10/MIN10 replication: verdict=${artifact.decision.verdict}, `
    + `BTC=${artifact.decision.btcReplicationPassed ? 'PASS' : 'FAIL'}, `
    + `ETH-confirmation=${artifact.decision.crossAssetConfirmationPassed ? 'PASS' : 'FAIL'}`,
  );
  for (const line of compactResult(artifact)) console.log(line);
  console.log(`written: ${absoluteOut}`);
  console.log('Research only: publication, activation, allocation, broadcast, and execution remain unapproved.');
  return artifact;
}

if (require.main === module) {
  try {
    runBitcoinMaxMinCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
