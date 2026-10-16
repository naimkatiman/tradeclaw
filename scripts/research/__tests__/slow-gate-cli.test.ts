/**
 * CLI input-boundary characterization for the read-only slow regime-gate sandbox.
 *
 * The real study still requires local candle dumps and the production HMM model,
 * but malformed flags should fail before any candle-file lookup or registry write.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.setTimeout(60_000);

const ROOT = path.resolve(__dirname, '..', '..', '..');
const TSX_CLI = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const DAY = 86_400_000;

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

function runSlowGate(args: string[]): CliResult {
  const result = spawnSync(process.execPath, [TSX_CLI, 'scripts/research/slow-gate-cli.ts', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      HMM_MODEL_DIR: '',
    },
    timeout: 30_000,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error,
  };
}

function outputOf(result: CliResult): string {
  return `${result.stdout}\n${result.stderr}`;
}

function makeDailyCandles(length = 300): Array<Record<string, unknown>> {
  return Array.from({ length }, (_, i) => ({
    timestamp: Date.parse('2020-01-01T00:00:00Z') + i * DAY,
    open: 100 + i,
    high: 101 + i,
    low: 99 + i,
    close: 100 + i,
    volume: 1,
  }));
}

function makeHourlyCandles(length = 400, startIso = '2019-12-01T00:00:00Z'): Array<Record<string, unknown>> {
  const start = Date.parse(startIso);
  return Array.from({ length }, (_, i) => ({
    timestamp: start + i * 3_600_000,
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1,
  }));
}

function makeHourlyCandlesEndingAt(length: number, endIso: string): Array<Record<string, unknown>> {
  const end = Date.parse(endIso);
  const start = end - (length - 1) * 3_600_000;
  return makeHourlyCandles(length, new Date(start).toISOString());
}

function candleDump(symbol: string, timeframe: 'D1' | 'H1', candles: unknown[]): Record<string, unknown> {
  return {
    symbol,
    timeframe,
    source: 'jest-fixture',
    candles,
  };
}

function writeCandleFixture(options: { d1?: unknown[]; h1?: unknown[] } = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-'));
  fs.writeFileSync(path.join(dir, 'BTCUSD-D1.json'), JSON.stringify(candleDump('BTCUSD', 'D1', options.d1 ?? makeDailyCandles())));
  fs.writeFileSync(path.join(dir, 'BTCUSD-H1.json'), JSON.stringify(candleDump('BTCUSD', 'H1', options.h1 ?? [])));
  return dir;
}

function writeTwoSymbolCandleFixture(options: {
  btcD1?: unknown[];
  btcH1?: unknown[];
  ethD1?: unknown[];
  ethH1?: unknown[];
} = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-'));
  fs.writeFileSync(path.join(dir, 'BTCUSD-D1.json'), JSON.stringify(candleDump('BTCUSD', 'D1', options.btcD1 ?? makeDailyCandles())));
  fs.writeFileSync(path.join(dir, 'BTCUSD-H1.json'), JSON.stringify(candleDump('BTCUSD', 'H1', options.btcH1 ?? [])));
  fs.writeFileSync(path.join(dir, 'ETHUSD-D1.json'), JSON.stringify(candleDump('ETHUSD', 'D1', options.ethD1 ?? makeDailyCandles())));
  fs.writeFileSync(path.join(dir, 'ETHUSD-H1.json'), JSON.stringify(candleDump('ETHUSD', 'H1', options.ethH1 ?? [])));
  return dir;
}

describe('slow-gate CLI parser - no-candle boundary', () => {
  it('prints usage without requiring candle dumps', () => {
    const result = runSlowGate(['--help']);
    const output = outputOf(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(output).toContain('Usage: npx tsx scripts/research/slow-gate-cli.ts');
    expect(output).toContain('--symbols BTCUSD,ETHUSD');
    expect(output).toContain('--folds N');
    expect(output).not.toMatch(/candle dump not found/);
    expect(output).not.toMatch(/\n\s+at\s/);
  });

  it.each([
    ['missing --folds value', ['--folds'], /Missing value for --folds\./],
    ['unknown flag', ['--bogus', '1'], /Unknown argument: --bogus\./],
    ['duplicate --from value', ['--from', '2020-01-01', '--from', '2021-01-01'], /Duplicate argument: --from\./],
    ['invalid --folds value', ['--folds', 'abc'], /Invalid --folds: expected a positive integer, got "abc"\./],
    ['decimal --folds value', ['--folds', '1.5'], /Invalid --folds: expected a positive integer, got "1\.5"\./],
    ['unsafe --folds value', ['--folds', String(Number.MAX_SAFE_INTEGER + 1)], /Invalid --folds: expected a positive integer, got "9007199254740992"\./],
    ['empty --symbols value', ['--symbols', ''], /Invalid --symbols: expected at least one symbol\./],
    ['empty --symbols segment', ['--symbols', 'BTCUSD,,ETHUSD'], /Invalid --symbols: empty symbol in comma-separated list\./],
    ['path-shaped --symbols token', ['--symbols', 'BTCUSD,../ETHUSD'], /Invalid --symbols: expected alphanumeric symbols, got "\.\.\/ETHUSD"\./],
    ['duplicate --symbols token', ['--symbols', 'BTCUSD,btcusd'], /Invalid --symbols: duplicate symbol "BTCUSD"\./],
    ['too many --symbols tokens', ['--symbols', 'BTCUSD,ETHUSD,SOLUSD'], /Invalid --symbols: expected one or two symbols, got 3\./],
    ['invalid --from calendar date', ['--from', '2020-02-30'], /Invalid --from: expected YYYY-MM-DD calendar date, got "2020-02-30"\./],
    ['invalid --to date shape', ['--to', '2020-1-01'], /Invalid --to: expected YYYY-MM-DD calendar date, got "2020-1-01"\./],
    ['whitespace --out path', ['--out', '   '], /Invalid --out: expected a non-empty path\./],
    ['existing file --out path', ['--out', 'package.json'], /Invalid --out: expected a directory path, got existing file "package\.json"\./],
    ['whitespace --candles-dir path', ['--candles-dir', '   '], /Invalid --candles-dir: expected a non-empty path\./],
    ['existing file --candles-dir path', ['--candles-dir', 'package.json'], /Invalid --candles-dir: expected a directory path, got existing file "package\.json"\./],
  ])('fails malformed input before candle-file lookup: %s', (_label, args, expected) => {
    const result = runSlowGate(args);
    const output = outputOf(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(output).toMatch(expected);
    expect(output).not.toMatch(/candle dump not found/);
    expect(output).not.toMatch(/\n\s+at\s/);
  });

  it.each([
    ['reversed date range', '2020-10-26', '2020-01-01'],
    ['same-day date range', '2020-10-26', '2020-10-26'],
  ])('rejects %s before candle-file lookup', (_label, from, to) => {
    const result = runSlowGate([
      '--symbols', 'BTCUSD',
      '--from', from,
      '--to', to,
      '--candles-dir', 'data/research/candles-that-do-not-exist',
      '--folds', '4',
    ]);
    const output = outputOf(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(output).toContain(`Invalid date range: --from ${from} --to ${to}`);
    expect(output).not.toMatch(/candle dump not found/);
    expect(output).not.toMatch(/classifying \d+ days/);
    expect(output).not.toMatch(/written:/);
    expect(output).not.toMatch(/\n\s+at\s/);
  });

  it('rejects fold counts that would leave fewer than two D1 bars per fold before HMM classification', () => {
    const candlesDir = writeCandleFixture();
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '151',
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Invalid --folds: expected at most 150 folds so each fold has at least 2 D1 bars for BTCUSD; got 151\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/Cannot read/);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
    }
  });

  it('rejects output paths under an existing file before HMM classification', () => {
    const candlesDir = writeCandleFixture({ h1: makeHourlyCandles(8_000) });
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', path.join('package.json', 'slow-gate-out'),
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Invalid --out: expected a directory path, got path under existing file "package\.json"\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
    }
  });

  it('rejects missing H1 regime coverage before writing study output', () => {
    const candlesDir = writeCandleFixture();
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Insufficient H1 bars for BTCUSD: 0; need at least \d+ bars for production HMM classification\./);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects stale H1 coverage before writing study output', () => {
    const candlesDir = writeCandleFixture({ h1: makeHourlyCandles() });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Insufficient H1 coverage for BTCUSD: latest H1 bar 2019-12-17 is before latest D1 bar 2020-10-26\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects latest-day partial H1 coverage before writing study output', () => {
    const candlesDir = writeCandleFixture({ h1: makeHourlyCandlesEndingAt(8_000, '2020-10-26T00:00:00.000Z') });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Insufficient H1 coverage for BTCUSD: latest H1 bar 2020-10-26 00:00 is before latest D1 day-close H1 bar 2020-10-26 23:00\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects late-starting H1 coverage before writing study output', () => {
    const candlesDir = writeCandleFixture({ h1: makeHourlyCandles(500, '2020-10-10T00:00:00Z') });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Insufficient H1 coverage for BTCUSD: first H1 bar 2020-10-10 is after first D1 bar 2020-01-01\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects mismatched two-symbol D1 tail dates before HMM classification or registry writes', () => {
    const h1 = makeHourlyCandles(8_500);
    const candlesDir = writeTwoSymbolCandleFixture({
      btcD1: makeDailyCandles(301),
      btcH1: h1,
      ethD1: makeDailyCandles(300),
      ethH1: h1,
    });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD,ETHUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-27',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Cannot build two-sleeve portfolio for BTCUSD\+ETHUSD: latest D1 dates differ \(BTCUSD=2020-10-27, ETHUSD=2020-10-26\)\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects mismatched two-symbol D1 start dates before HMM classification or registry writes', () => {
    const h1 = makeHourlyCandles(8_500);
    const ethD1 = makeDailyCandles(300).map((candle) => ({
      ...candle,
      timestamp: (candle.timestamp as number) + DAY,
    }));
    const candlesDir = writeTwoSymbolCandleFixture({
      btcD1: makeDailyCandles(301),
      btcH1: h1,
      ethD1,
      ethH1: h1,
    });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD,ETHUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-27',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Cannot build two-sleeve portfolio for BTCUSD\+ETHUSD: first D1 dates differ \(BTCUSD=2020-01-01, ETHUSD=2020-01-02\)\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects invalid candle dump JSON before writing study output', () => {
    const candlesDir = writeCandleFixture({ h1: makeHourlyCandles(8_000) });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    const d1Path = path.join(candlesDir, 'BTCUSD-D1.json');
    fs.writeFileSync(d1Path, '{not-valid-json');
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/BTCUSD-D1\.json is not valid JSON\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects non-object candle dump JSON before writing study output', () => {
    const candlesDir = writeCandleFixture({ h1: makeHourlyCandles(8_000) });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    const d1Path = path.join(candlesDir, 'BTCUSD-D1.json');
    fs.writeFileSync(d1Path, 'null');
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/BTCUSD-D1\.json does not match BTCUSD D1\./);
      expect(output).not.toMatch(/Cannot read properties/);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects malformed candle rows before writing study output', () => {
    const d1 = makeDailyCandles();
    d1[42] = { ...d1[42], close: null };
    const candlesDir = writeCandleFixture({ d1, h1: makeHourlyCandles() });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/BTCUSD-D1\.json has invalid candle at index 42: expected finite timestamp\/open\/high\/low\/close\/volume\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects inconsistent OHLC ranges before writing study output', () => {
    const d1 = makeDailyCandles();
    d1[42] = { ...d1[42], close: 200 };
    const candlesDir = writeCandleFixture({ d1, h1: makeHourlyCandles() });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/BTCUSD-D1\.json has invalid candle at index 42: expected low <= open\/close <= high and high >= low\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects non-positive candle prices before writing study output', () => {
    const d1 = makeDailyCandles();
    d1[42] = { ...d1[42], open: 0, high: 0, low: 0, close: 0 };
    const candlesDir = writeCandleFixture({ d1, h1: makeHourlyCandles(8_000) });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/BTCUSD-D1\.json has invalid candle at index 42: expected positive open\/high\/low\/close prices\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects negative candle volume before writing study output', () => {
    const d1 = makeDailyCandles();
    d1[42] = { ...d1[42], volume: -1 };
    const candlesDir = writeCandleFixture({ d1, h1: makeHourlyCandles(8_000) });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/BTCUSD-D1\.json has invalid candle at index 42: expected non-negative volume\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects non-integer candle timestamps before writing study output', () => {
    const d1 = makeDailyCandles().map((candle) => ({
      ...candle,
      timestamp: (candle.timestamp as number) + 0.5,
    }));
    const candlesDir = writeCandleFixture({ d1, h1: makeHourlyCandles(8_000) });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-27',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/BTCUSD-D1\.json has invalid candle at index 0: expected safe integer millisecond timestamp\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects duplicate candle timestamps before writing study output', () => {
    const d1 = makeDailyCandles();
    const duplicateTimestamp = d1[41].timestamp as number;
    d1[42] = { ...d1[42], timestamp: duplicateTimestamp };
    const candlesDir = writeCandleFixture({ d1, h1: makeHourlyCandles() });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(new RegExp(`BTCUSD-D1\\.json has duplicate candle timestamp at index 42: ${duplicateTimestamp}\\.`));
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects non-increasing candle timestamps before sorting or writing study output', () => {
    const d1 = makeDailyCandles();
    const previousTimestamp = d1[41].timestamp as number;
    const outOfOrderTimestamp = previousTimestamp - 1;
    d1[42] = { ...d1[42], timestamp: outOfOrderTimestamp };
    const candlesDir = writeCandleFixture({ d1, h1: makeHourlyCandles() });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(
        new RegExp(
          `BTCUSD-D1\\.json has non-increasing candle timestamp at index 42: expected greater than ${previousTimestamp}, got ${outOfOrderTimestamp}\\.`,
        ),
      );
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects irregular D1 candle cadence before sorting or writing study output', () => {
    const d1 = makeDailyCandles();
    const previousTimestamp = d1[41].timestamp as number;
    const gappedTimestamp = previousTimestamp + DAY + DAY / 2;
    d1[42] = { ...d1[42], timestamp: gappedTimestamp };
    const candlesDir = writeCandleFixture({ d1, h1: makeHourlyCandles(8_000) });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/BTCUSD-D1\.json has irregular D1 candle cadence at index 42: expected 86400000ms after index 41, got 129600000ms\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects irregular H1 candle cadence before HMM classification or writing study output', () => {
    const h1 = makeHourlyCandles(8_000);
    const previousTimestamp = h1[41].timestamp as number;
    const gappedTimestamp = previousTimestamp + 5_400_000;
    h1[42] = { ...h1[42], timestamp: gappedTimestamp };
    const candlesDir = writeCandleFixture({ h1 });
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-slow-gate-out-'));
    try {
      const result = runSlowGate([
        '--symbols', 'BTCUSD',
        '--from', '2020-01-01',
        '--to', '2020-10-26',
        '--candles-dir', candlesDir,
        '--folds', '4',
        '--out', outDir,
      ]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/BTCUSD-H1\.json has irregular H1 candle cadence at index 42: expected 3600000ms after index 41, got 5400000ms\./);
      expect(output).not.toMatch(/classifying \d+ days/);
      expect(output).not.toMatch(/written:/);
      expect(fs.existsSync(path.join(outDir, 'REGISTRY.md'))).toBe(false);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(candlesDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('lets valid flags reach the missing-candle boundary', () => {
    const result = runSlowGate([
      '--symbols', 'BTCUSD',
      '--from', '2020-01-01',
      '--to', '2020-12-31',
      '--candles-dir', 'data/research/candles-that-do-not-exist',
      '--folds', '4',
    ]);
    const output = outputOf(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(output).toMatch(/candle dump not found:/);
    expect(output).not.toMatch(/Invalid --/);
    expect(output).not.toMatch(/Missing value for/);
    expect(output).not.toMatch(/Unknown argument/);
  });
});
