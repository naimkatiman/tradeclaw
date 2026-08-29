import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const RAW_DIR = resolve(ROOT, 'tmp/research');
const OUTPUT_DIR = resolve(ROOT, 'docs/research/data/end-of-month-treasury');

const SOURCES = {
  nominal: {
    rawPath: join(RAW_DIR, 'feds200628.csv'),
    expectedRawSha256: '877d0908ce3b875412eac0295715f88b40a011a94e24339e15959ec3bb04cad7',
    outputPath: join(OUTPUT_DIR, 'fed-nominal-svensson-1989-12-01-2026-07-31.csv'),
  },
  financing: {
    rawPath: join(RAW_DIR, 'DFF-1989-12-01-2026-07-31.csv'),
    expectedRawSha256: 'ea8b35582a3f88cc0a0d42ae94addc3d85aaf008d4bb574246dd8a83780db600',
    outputPath: join(OUTPUT_DIR, 'DFF-1989-12-01-2026-07-31.csv'),
  },
  falsification: {
    rawPath: join(RAW_DIR, 'DTWEXBGS-2006-01-02-2026-07-31.csv'),
    expectedRawSha256: '88db7d787e99129e671015fcc581f3507d0a2c527804c285ab555c2b83cd8054',
    outputPath: join(OUTPUT_DIR, 'DTWEXBGS-2006-01-02-2026-07-31.csv'),
  },
};

const NOMINAL_FIELDS = [
  'Date',
  'BETA0',
  'BETA1',
  'BETA2',
  'BETA3',
  'TAU1',
  'TAU2',
  'SVENY01',
  'SVENY05',
  'SVENY10',
];

function canonicalText(bytes) {
  return bytes.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readPinnedSource(source) {
  const bytes = readFileSync(source.rawPath);
  const actual = sha256(bytes);
  if (actual !== source.expectedRawSha256) {
    throw new Error(
      `${basename(source.rawPath)} SHA-256 mismatch: expected ${source.expectedRawSha256}, received ${actual}`,
    );
  }
  return canonicalText(bytes);
}

function splitSimpleCsvLine(line) {
  if (line.includes('"')) {
    throw new Error('quoted values are not allowed inside the retained data table');
  }
  return line.split(',');
}

function prepareNominal() {
  const text = readPinnedSource(SOURCES.nominal);
  const lines = text.split('\n');
  const headerIndex = lines.findIndex((line) => line.startsWith('Date,'));
  if (headerIndex < 0) throw new Error('nominal source is missing its Date header');

  const header = splitSimpleCsvLine(lines[headerIndex]);
  const indexes = NOMINAL_FIELDS.map((field) => {
    const index = header.indexOf(field);
    if (index < 0) throw new Error(`nominal source is missing ${field}`);
    return index;
  });

  const output = [NOMINAL_FIELDS.join(',')];
  let previousDate = '';
  for (const line of lines.slice(headerIndex + 1)) {
    if (!line) continue;
    const cells = splitSimpleCsvLine(line);
    const date = cells[0];
    if (date < '1989-12-01' || date > '2026-07-31') continue;
    if (date <= previousDate) throw new Error(`nominal dates are not strictly increasing at ${date}`);
    const selected = indexes.map((index) => cells[index]);
    const values = selected.slice(1);
    if (values.every((value) => value === 'NA')) continue;
    if (selected.slice(-3).every((value) => value === 'NA')) continue;
    if (values.some((value) => value === undefined || value === '' || value === 'NA')) {
      throw new Error(`nominal retained field is missing at ${date}`);
    }
    output.push(selected.join(','));
    previousDate = date;
  }

  if (output.length < 9_000) throw new Error('nominal snapshot has too few retained observations');
  return `${output.join('\n')}\n`;
}

function prepareFredSeries(
  source,
  expectedHeader,
  expectedFirstDate,
  expectedLastDate,
  { skipMissing = false } = {},
) {
  const text = readPinnedSource(source).trimEnd();
  const lines = text.split('\n');
  if (lines[0] !== expectedHeader) {
    throw new Error(`${basename(source.rawPath)} header must be ${expectedHeader}`);
  }

  let previousDate = '';
  const output = [expectedHeader];
  for (const [index, line] of lines.slice(1).entries()) {
    const [date, value, ...unexpected] = splitSimpleCsvLine(line);
    if (unexpected.length > 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`${basename(source.rawPath)} row ${index + 2} is malformed`);
    }
    if (date <= previousDate) {
      throw new Error(`${basename(source.rawPath)} dates are not strictly increasing at ${date}`);
    }
    previousDate = date;
    if (value === '' && skipMissing) continue;
    if (!Number.isFinite(Number(value))) {
      throw new Error(`${basename(source.rawPath)} has a missing/non-numeric value at ${date}`);
    }
    output.push(`${date},${value}`);
  }

  const firstDate = output[1]?.split(',')[0];
  const lastDate = output.at(-1)?.split(',')[0];
  if (firstDate !== expectedFirstDate || lastDate !== expectedLastDate) {
    throw new Error(
      `${basename(source.rawPath)} range must be ${expectedFirstDate}/${expectedLastDate}; received ${firstDate}/${lastDate}`,
    );
  }
  return `${output.join('\n')}\n`;
}

mkdirSync(OUTPUT_DIR, { recursive: true });

const outputs = [
  [SOURCES.nominal.outputPath, prepareNominal()],
  [
    SOURCES.financing.outputPath,
    prepareFredSeries(
      SOURCES.financing,
      'observation_date,DFF',
      '1989-12-01',
      '2026-07-31',
    ),
  ],
  [
    SOURCES.falsification.outputPath,
    prepareFredSeries(
      SOURCES.falsification,
      'observation_date,DTWEXBGS',
      '2006-01-02',
      '2026-07-31',
      { skipMissing: true },
    ),
  ],
];

for (const [outputPath, text] of outputs) {
  writeFileSync(outputPath, text, 'utf8');
  process.stdout.write(`${basename(outputPath)} ${sha256(Buffer.from(text, 'utf8'))}\n`);
}
