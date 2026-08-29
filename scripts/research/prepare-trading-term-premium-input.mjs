import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const RAW_PATH = resolve(ROOT, 'tmp/research/feds200628.csv');
const OUTPUT_PATH = resolve(
  ROOT,
  'docs/research/data/trading-term-premium/fed-nominal-month-end-1961-06-30-2026-07-31.csv',
);

const EXPECTED_RAW_SHA256 =
  '877d0908ce3b875412eac0295715f88b40a011a94e24339e15959ec3bb04cad7';
const EXPECTED_OUTPUT_SHA256 =
  '29442bea3f4ccef06aa741ff4afd6202c2a029cf6f43966f04e482960959f041';
const EXPECTED_OUTPUT_BYTES = 311_362;
const RECONSTRUCTION_TOLERANCE_PCT = 0.0005; // 0.05 basis point.

const PARAMETER_FIELDS = ['BETA0', 'BETA1', 'BETA2', 'BETA3', 'TAU1', 'TAU2'];
const YIELD_FIELDS = Array.from(
  { length: 30 },
  (_value, index) => `SVENY${String(index + 1).padStart(2, '0')}`,
);
const OUTPUT_FIELDS = ['Date', ...PARAMETER_FIELDS, ...YIELD_FIELDS];

const EXPECTED_FULL_SOURCE = {
  rows: 17_008,
  validRows: 16_262,
  invalidRows: 746,
  nelsonSiegelRows: 4_620,
  svenssonRows: 11_642,
  firstValidDate: '1961-06-14',
  lastValidDate: '2026-08-21',
  suppliedYieldChecks: 381_362,
  checksAboveOneHundredthBp: 42,
  checksAboveTolerance: 0,
  maximumErrorDate: '2013-10-16',
  maximumErrorMaturityYears: 6,
};

const EXPECTED_SNAPSHOT = {
  rows: 782,
  firstDate: '1961-06-30',
  lastDate: '2026-07-31',
  nelsonSiegelRows: 223,
  svenssonRows: 559,
  suppliedYieldChecks: 18_334,
  checksAboveOneHundredthBp: 0,
  checksAboveTolerance: 0,
  maximumErrorDate: '2016-08-31',
  maximumErrorMaturityYears: 18,
  missingSuppliedTenYearRows: 122,
  firstSuppliedTenYearDate: '1971-08-31',
};

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalText(bytes) {
  return bytes.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function fail(message) {
  throw new Error(message);
}

function splitDataLine(line, label) {
  if (!line || line.includes('"')) fail(`${label} is empty or quoted`);
  return line.split(',');
}

function assertIsoDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${label} is not an ISO date`);
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    fail(`${label} is not a calendar date`);
  }
}

function finite(raw, label) {
  if (raw === '' || raw.trim() !== raw || raw === 'NA') fail(`${label} must be finite`);
  const value = Number(raw);
  if (!Number.isFinite(value)) fail(`${label} must be finite`);
  return value;
}

function loading(x) {
  if (!Number.isFinite(x) || x <= 0) fail('curve loading requires a positive argument');
  return -Math.expm1(-x) / x;
}

function reconstructedYieldPct(row, maturityYears) {
  const x1 = maturityYears / row.tau1;
  const a1 = loading(x1);
  let value = row.beta0
    + row.beta1 * a1
    + row.beta2 * (a1 - Math.exp(-x1));
  if (row.mode === 'svensson') {
    const x2 = maturityYears / row.tau2;
    const a2 = loading(x2);
    value += row.beta3 * (a2 - Math.exp(-x2));
  }
  if (!Number.isFinite(value)) fail(`non-finite reconstructed yield at ${row.date}`);
  return value;
}

function expectedMonths(from, to) {
  const months = [];
  let cursor = `${from}-01`;
  while (cursor.slice(0, 7) <= to) {
    months.push(cursor.slice(0, 7));
    const date = new Date(`${cursor}T00:00:00.000Z`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    cursor = date.toISOString().slice(0, 10);
  }
  return months;
}

function assertExact(actual, expected, label) {
  if (actual !== expected) fail(`${label}: expected ${expected}, received ${actual}`);
}

function summarizeYieldChecks(rows) {
  let checks = 0;
  let checksAboveOneHundredthBp = 0;
  let checksAboveTolerance = 0;
  let maximum = null;

  for (const row of rows) {
    for (let maturity = 1; maturity <= 30; maturity += 1) {
      const raw = row.raw[YIELD_FIELDS[maturity - 1]];
      if (raw === 'NA') continue;
      const suppliedYieldPct = finite(raw, `${row.date} ${YIELD_FIELDS[maturity - 1]}`);
      const reconstructed = reconstructedYieldPct(row, maturity);
      const absoluteErrorPct = Math.abs(reconstructed - suppliedYieldPct);
      checks += 1;
      if (absoluteErrorPct > 0.0001) checksAboveOneHundredthBp += 1;
      if (absoluteErrorPct > RECONSTRUCTION_TOLERANCE_PCT) checksAboveTolerance += 1;
      if (maximum === null || absoluteErrorPct > maximum.absoluteErrorPct) {
        maximum = {
          date: row.date,
          maturityYears: maturity,
          absoluteErrorPct,
          reconstructedYieldPct: reconstructed,
          suppliedYieldPct,
        };
      }
    }
  }

  if (maximum === null) fail('no supplied-yield checks were available');
  return { checks, checksAboveOneHundredthBp, checksAboveTolerance, maximum };
}

function parseFullSource() {
  const rawBytes = readFileSync(RAW_PATH);
  const rawSha256 = sha256(rawBytes);
  assertExact(rawSha256, EXPECTED_RAW_SHA256, `${basename(RAW_PATH)} SHA-256`);

  const lines = canonicalText(rawBytes).split('\n');
  const headerIndex = lines.findIndex((line) => line.startsWith('Date,'));
  if (headerIndex < 0) fail('Federal Reserve source is missing its Date header');
  const header = splitDataLine(lines[headerIndex], 'Federal Reserve header');
  const headerSet = new Set(header);
  if (headerSet.size !== header.length) fail('Federal Reserve header contains duplicate fields');
  for (const field of OUTPUT_FIELDS) {
    if (!headerSet.has(field)) fail(`Federal Reserve source is missing ${field}`);
  }
  const indexes = new Map(header.map((field, index) => [field, index]));

  const rows = [];
  let datedRows = 0;
  let invalidRows = 0;
  let previousDate = '';

  for (const [offset, line] of lines.slice(headerIndex + 1).entries()) {
    if (line === '') continue;
    const lineNumber = headerIndex + offset + 2;
    const cells = splitDataLine(line, `Federal Reserve row ${lineNumber}`);
    if (cells.length !== header.length) {
      fail(`Federal Reserve row ${lineNumber} must have ${header.length} fields`);
    }
    const date = cells[indexes.get('Date')];
    assertIsoDate(date, `Federal Reserve row ${lineNumber} Date`);
    if (date <= previousDate) fail(`Federal Reserve dates are not increasing at ${date}`);
    previousDate = date;
    datedRows += 1;

    const raw = Object.fromEntries(OUTPUT_FIELDS.slice(1).map((field) => [field, cells[indexes.get(field)]]));
    const parameterRaw = PARAMETER_FIELDS.map((field) => raw[field]);
    const allMissing = parameterRaw.every((value) => value === 'NA');
    const anyMissing = parameterRaw.some((value) => value === 'NA');
    if (anyMissing && !allMissing) fail(`Federal Reserve parameters are partially missing at ${date}`);
    for (const field of YIELD_FIELDS) {
      if (raw[field] !== 'NA') finite(raw[field], `${date} ${field}`);
    }
    if (allMissing) {
      if (YIELD_FIELDS.some((field) => raw[field] !== 'NA')) {
        fail(`Federal Reserve invalid-parameter row has supplied yields at ${date}`);
      }
      invalidRows += 1;
      continue;
    }

    const [beta0, beta1, beta2, beta3, tau1, tau2] = PARAMETER_FIELDS.map((field) => (
      finite(raw[field], `${date} ${field}`)
    ));
    if (tau1 <= 0) fail(`Federal Reserve TAU1 must be positive at ${date}`);
    let mode;
    if (beta3 === 0 && tau2 === -999.99) {
      mode = 'nelson-siegel';
    } else if (tau2 > 0) {
      mode = 'svensson';
    } else {
      fail(`Federal Reserve row has an invalid NS/NSS mode at ${date}`);
    }
    rows.push({ date, beta0, beta1, beta2, beta3, tau1, tau2, mode, raw });
  }

  const nelsonSiegelRows = rows.filter((row) => row.mode === 'nelson-siegel').length;
  const svenssonRows = rows.length - nelsonSiegelRows;
  const checks = summarizeYieldChecks(rows);

  assertExact(datedRows, EXPECTED_FULL_SOURCE.rows, 'full source dated rows');
  assertExact(rows.length, EXPECTED_FULL_SOURCE.validRows, 'full source valid rows');
  assertExact(invalidRows, EXPECTED_FULL_SOURCE.invalidRows, 'full source invalid rows');
  assertExact(nelsonSiegelRows, EXPECTED_FULL_SOURCE.nelsonSiegelRows, 'full source NS rows');
  assertExact(svenssonRows, EXPECTED_FULL_SOURCE.svenssonRows, 'full source NSS rows');
  assertExact(rows[0]?.date, EXPECTED_FULL_SOURCE.firstValidDate, 'full source first valid date');
  assertExact(rows.at(-1)?.date, EXPECTED_FULL_SOURCE.lastValidDate, 'full source last valid date');
  assertExact(checks.checks, EXPECTED_FULL_SOURCE.suppliedYieldChecks, 'full source yield checks');
  assertExact(
    checks.checksAboveOneHundredthBp,
    EXPECTED_FULL_SOURCE.checksAboveOneHundredthBp,
    'full source checks above 0.01 bp',
  );
  assertExact(
    checks.checksAboveTolerance,
    EXPECTED_FULL_SOURCE.checksAboveTolerance,
    'full source checks above 0.05 bp',
  );
  assertExact(checks.maximum.date, EXPECTED_FULL_SOURCE.maximumErrorDate, 'full source max-error date');
  assertExact(
    checks.maximum.maturityYears,
    EXPECTED_FULL_SOURCE.maximumErrorMaturityYears,
    'full source max-error maturity',
  );

  return { rows, rawSha256, checks };
}

function prepareSnapshot(full) {
  const byMonth = new Map();
  for (const row of full.rows) {
    const month = row.date.slice(0, 7);
    if (month > '2026-07') continue;
    byMonth.set(month, row);
  }
  const months = [...byMonth.keys()].sort();
  const expected = expectedMonths('1961-06', '2026-07');
  if (JSON.stringify(months) !== JSON.stringify(expected)) {
    fail('month-end snapshot months are not complete and consecutive');
  }
  const rows = months.map((month) => byMonth.get(month));
  const nelsonSiegelRows = rows.filter((row) => row.mode === 'nelson-siegel').length;
  const svenssonRows = rows.length - nelsonSiegelRows;
  const checks = summarizeYieldChecks(rows);
  const missingSuppliedTenYearRows = rows.filter((row) => row.raw.SVENY10 === 'NA').length;
  const firstSuppliedTenYearDate = rows.find((row) => row.raw.SVENY10 !== 'NA')?.date;

  assertExact(rows.length, EXPECTED_SNAPSHOT.rows, 'snapshot rows');
  assertExact(rows[0]?.date, EXPECTED_SNAPSHOT.firstDate, 'snapshot first date');
  assertExact(rows.at(-1)?.date, EXPECTED_SNAPSHOT.lastDate, 'snapshot last date');
  assertExact(nelsonSiegelRows, EXPECTED_SNAPSHOT.nelsonSiegelRows, 'snapshot NS rows');
  assertExact(svenssonRows, EXPECTED_SNAPSHOT.svenssonRows, 'snapshot NSS rows');
  assertExact(checks.checks, EXPECTED_SNAPSHOT.suppliedYieldChecks, 'snapshot yield checks');
  assertExact(
    checks.checksAboveOneHundredthBp,
    EXPECTED_SNAPSHOT.checksAboveOneHundredthBp,
    'snapshot checks above 0.01 bp',
  );
  assertExact(
    checks.checksAboveTolerance,
    EXPECTED_SNAPSHOT.checksAboveTolerance,
    'snapshot checks above 0.05 bp',
  );
  assertExact(checks.maximum.date, EXPECTED_SNAPSHOT.maximumErrorDate, 'snapshot max-error date');
  assertExact(
    checks.maximum.maturityYears,
    EXPECTED_SNAPSHOT.maximumErrorMaturityYears,
    'snapshot max-error maturity',
  );
  assertExact(
    missingSuppliedTenYearRows,
    EXPECTED_SNAPSHOT.missingSuppliedTenYearRows,
    'snapshot missing supplied ten-year rows',
  );
  assertExact(
    firstSuppliedTenYearDate,
    EXPECTED_SNAPSHOT.firstSuppliedTenYearDate,
    'snapshot first supplied ten-year date',
  );

  const outputRows = rows.map((row) => [
    row.date,
    ...PARAMETER_FIELDS.map((field) => row.raw[field]),
    ...YIELD_FIELDS.map((field) => row.raw[field]),
  ].join(','));
  const output = `${OUTPUT_FIELDS.join(',')}\n${outputRows.join('\n')}\n`;
  const outputBytes = Buffer.from(output, 'utf8');
  assertExact(outputBytes.length, EXPECTED_OUTPUT_BYTES, 'snapshot output bytes');
  assertExact(sha256(outputBytes), EXPECTED_OUTPUT_SHA256, 'snapshot output SHA-256');
  return { output, rows, checks };
}

const full = parseFullSource();
const snapshot = prepareSnapshot(full);
mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, snapshot.output, 'utf8');

process.stdout.write([
  `${basename(OUTPUT_PATH)} ${EXPECTED_OUTPUT_SHA256}`,
  `raw=${full.rawSha256} fullRows=${full.rows.length} monthEnds=${snapshot.rows.length}`,
  `fullQa=${full.checks.checks} checks max=${(full.checks.maximum.absoluteErrorPct * 100).toFixed(10)}bp`,
  `snapshotQa=${snapshot.checks.checks} checks max=${(snapshot.checks.maximum.absoluteErrorPct * 100).toFixed(10)}bp`,
].join('\n') + '\n');
