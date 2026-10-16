/**
 * CLI input-boundary characterization for the read-only regime-expectancy study.
 *
 * The study still needs approved Postgres credentials for real output, but local
 * artifact-path mistakes should fail before opening a database connection. These
 * tests execute the CLI with DATABASE_* empty so dotenv cannot accidentally use a
 * developer database during no-DB boundary checks.
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

function runRegimeStudy(args: string[]): CliResult {
  const result = spawnSync(process.execPath, [TSX_CLI, 'scripts/research/regime-expectancy-study.ts', ...args], {
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

describe('regime-expectancy-study CLI --json path preflight', () => {
  it('prints usage without requiring database credentials', () => {
    const result = runRegimeStudy(['--help']);
    const output = outputOf(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(output).toContain('Usage: npx tsx scripts/research/regime-expectancy-study.ts [--days N] [--min-n N] [--json path]');
    expect(output).toContain('--days N');
    expect(output).toContain('--min-n N');
    expect(output).toContain('--json path');
    expect(output).not.toMatch(/DATABASE_URL \(or DATABASE_PUBLIC_URL\) is required/);
    expect(output).not.toMatch(/\n\s+at\s/);
  });

  it('rejects --json paths with missing parent directories before opening the database path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-regime-json-parent-'));
    const jsonPath = path.join(tmpDir, 'missing-parent', 'regime.json');

    try {
      const result = runRegimeStudy(['--json', jsonPath]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Invalid --json: parent directory does not exist:/);
      expect(output).not.toMatch(/DATABASE_URL \(or DATABASE_PUBLIC_URL\) is required/);
      expect(output).not.toMatch(/\n\s+at\s/);
      expect(fs.existsSync(jsonPath)).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects --json paths whose parent is an existing file before opening the database path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-regime-json-parent-file-'));
    const parentFile = path.join(tmpDir, 'not-a-directory');
    fs.writeFileSync(parentFile, 'not a directory');
    const jsonPath = path.join(parentFile, 'regime.json');

    try {
      const result = runRegimeStudy(['--json', jsonPath]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Invalid --json: parent path is not a directory:/);
      expect(output).not.toMatch(/DATABASE_URL \(or DATABASE_PUBLIC_URL\) is required/);
      expect(output).not.toMatch(/\n\s+at\s/);
      expect(fs.existsSync(jsonPath)).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects --json paths that point at an existing directory before opening the database path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-regime-json-dir-'));

    try {
      const result = runRegimeStudy(['--json', tmpDir]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Invalid --json: expected a file path, got an existing directory:/);
      expect(output).not.toMatch(/DATABASE_URL \(or DATABASE_PUBLIC_URL\) is required/);
      expect(output).not.toMatch(/\n\s+at\s/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects --json paths that would overwrite an existing file before opening the database path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-regime-json-existing-file-'));
    const jsonPath = path.join(tmpDir, 'regime.json');
    fs.writeFileSync(jsonPath, 'existing operator artifact');

    try {
      const result = runRegimeStudy(['--json', jsonPath]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/Invalid --json: output file already exists:/);
      expect(output).not.toMatch(/DATABASE_URL \(or DATABASE_PUBLIC_URL\) is required/);
      expect(output).not.toMatch(/\n\s+at\s/);
      expect(fs.readFileSync(jsonPath, 'utf8')).toBe('existing operator artifact');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('allows a valid local --json file path through to the fail-closed no-credentials boundary without creating an artifact', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-regime-json-'));
    const jsonPath = path.join(tmpDir, 'regime.json');

    try {
      const result = runRegimeStudy(['--days', '7', '--min-n', '100', '--json', jsonPath]);
      const output = outputOf(result);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toMatch(/DATABASE_URL \(or DATABASE_PUBLIC_URL\) is required/);
      expect(output).not.toMatch(/Missing value for/);
      expect(output).not.toMatch(/Unknown option/);
      expect(output).not.toMatch(/Invalid --/);
      expect(output).not.toMatch(/\n\s+at\s/);
      expect(fs.existsSync(jsonPath)).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
