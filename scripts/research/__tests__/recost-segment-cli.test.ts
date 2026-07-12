/**
 * CLI input-boundary characterization for the read-only recost-segment probe.
 *
 * The production/research answer still requires an approved Postgres connection,
 * but parser defects should be caught without DB credentials. These tests execute
 * the script as a CLI, keep DATABASE_* empty so dotenv cannot accidentally open a
 * real database path, and prove malformed flags fail before the no-DB boundary.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.setTimeout(60_000);

const ROOT = path.resolve(__dirname, '..', '..', '..');
const TSX_CLI = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

function runRecost(args: string[]): CliResult {
  const result = spawnSync(process.execPath, [TSX_CLI, 'scripts/research/recost-segment.ts', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_PUBLIC_URL: '',
      DATABASE_URL: '',
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

describe('recost-segment CLI parser - no-DB guard boundaries', () => {
  it('prints usage without requiring database credentials', () => {
    const result = runRecost(['--help']);
    const output = outputOf(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(output).toContain('Usage: npx tsx scripts/research/recost-segment.ts [--days N] [--min-n N] [--json path]');
    expect(output).toContain('--days N');
    expect(output).toContain('--min-n N');
    expect(output).toContain('--json path');
    expect(output).not.toMatch(/No DATABASE_PUBLIC_URL or DATABASE_URL set/);
    expect(output).not.toMatch(/\n\s+at\s/);
  });

  it.each([
    ['missing --days value', ['--days'], /Missing value for --days\./],
    ['missing --min-n value', ['--min-n'], /Missing value for --min-n\./],
    ['missing --json value', ['--json'], /Missing value for --json\./],
    ['unknown flag', ['--bogus', '1'], /Unknown argument: --bogus\. Expected --days, --min-n, --json, or --help\./],
    ['duplicate --days value', ['--days', '7', '--days', '14'], /Duplicate argument: --days\./],
    ['duplicate --min-n value', ['--min-n', '100', '--min-n', '200'], /Duplicate argument: --min-n\./],
    ['duplicate --json value', ['--json', 'first.json', '--json', 'second.json'], /Duplicate argument: --json\./],
    ['invalid --days value', ['--days', 'abc'], /Invalid --days: expected a positive integer, got "abc"\./],
    ['negative --days value', ['--days', '-1'], /Invalid --days: expected a positive integer, got "-1"\./],
    ['decimal --days value', ['--days', '1.5'], /Invalid --days: expected a positive integer, got "1\.5"\./],
    ['exponential --days value', ['--days', '1e3'], /Invalid --days: expected a positive integer, got "1e3"\./],
    ['injection-shaped --days value', ['--days', "1'; SELECT pg_sleep(1); --"], /Invalid --days: expected a positive integer/],
    ['excessive --days value', ['--days', '36501'], /Invalid --days: must be at most 36500, got "36501"\./],
    ['unsafe --days value', ['--days', String(Number.MAX_SAFE_INTEGER + 1)], /Invalid --days: expected a positive integer, got "9007199254740992"\./],
    ['invalid --min-n value', ['--min-n', '0'], /Invalid --min-n: expected a positive integer, got "0"\./],
    ['unsafe --min-n value', ['--min-n', String(Number.MAX_SAFE_INTEGER + 1)], /Invalid --min-n: expected a positive integer, got "9007199254740992"\./],
    ['empty --json path', ['--json', ''], /Invalid --json: expected a non-empty path\./],
    ['whitespace --json path', ['--json', '   '], /Invalid --json: expected a non-empty path\./],
  ])('fails malformed input before opening the database path: %s', (_label, args, expected) => {
    const result = runRecost(args);
    const output = outputOf(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(output).toMatch(expected);
    expect(output).not.toMatch(/No DATABASE_PUBLIC_URL or DATABASE_URL set/);
    expect(output).not.toMatch(/\n\s+at\s/);
  });

  it('allows valid numeric flags through to the fail-closed no-credentials boundary', () => {
    const result = runRecost(['--days', '7', '--min-n', '100']);
    const output = outputOf(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(output).toMatch(/No DATABASE_PUBLIC_URL or DATABASE_URL set/);
    expect(output).not.toMatch(/Missing value for/);
    expect(output).not.toMatch(/Unknown argument/);
    expect(output).not.toMatch(/Invalid --/);
    expect(output).not.toMatch(/\n\s+at\s/);
  });

  it('rejects --json paths with missing parent directories before opening the database path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-recost-json-parent-'));
    const jsonPath = path.join(tmpDir, 'missing-parent', 'recost.json');

    try {
      const result = runRecost(['--json', jsonPath]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Invalid --json: parent directory does not exist:/);
      expect(output).not.toMatch(/No DATABASE_PUBLIC_URL or DATABASE_URL set/);
      expect(output).not.toMatch(/\n\s+at\s/);
      expect(fs.existsSync(jsonPath)).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects --json paths that point at an existing directory before opening the database path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-recost-json-dir-'));

    try {
      const result = runRecost(['--json', tmpDir]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Invalid --json: expected a file path, got an existing directory:/);
      expect(output).not.toMatch(/No DATABASE_PUBLIC_URL or DATABASE_URL set/);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('does not create a --json artifact when credentials are absent', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-recost-json-'));
    const jsonPath = path.join(tmpDir, 'recost.json');

    try {
      const result = runRecost(['--days', '7', '--min-n', '100', '--json', jsonPath]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/No DATABASE_PUBLIC_URL or DATABASE_URL set/);
      expect(output).not.toMatch(/Missing value for/);
      expect(output).not.toMatch(/Unknown argument/);
      expect(output).not.toMatch(/Invalid --/);
      expect(output).not.toMatch(/\n\s+at\s/);
      expect(fs.existsSync(jsonPath)).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
