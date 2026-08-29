/**
 * Prepare canonical, ignored UTC-daily Gemini inputs for TC-258 without
 * calculating a strategy return. CryptoDataDownload's free Gemini H1 archives
 * are CC BY-NC-SA 4.0 and are not committed; only source hashes and derived
 * research receipts enter the repository.
 */

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const END_EXCLUSIVE_TS = Date.UTC(2026, 7, 1);
const SOURCE_PAGE = 'https://www.cryptodatadownload.com/data/gemini/';
const SOURCE_LICENSE = 'CC-BY-NC-SA-4.0';
const SERIES = [
  {
    symbol: 'BTCUSD',
    sourceUrl: 'https://www.cryptodatadownload.com/cdd/Gemini_BTCUSD_1h.csv',
    startTs: Date.UTC(2015, 10, 26),
    expectedDays: 3_901,
  },
  {
    symbol: 'ETHUSD',
    sourceUrl: 'https://www.cryptodatadownload.com/cdd/Gemini_ETHUSD_1h.csv',
    startTs: Date.UTC(2016, 4, 10),
    expectedDays: 3_735,
  },
];

function parseArgs(argv) {
  if (argv.length % 2 !== 0) throw new Error(`missing value for ${argv.at(-1)}`);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (name !== '--out-dir') throw new Error(`unknown option: ${name}`);
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${name}`);
    if (values.has(name)) throw new Error(`duplicate option: ${name}`);
    values.set(name, value);
  }
  return {
    outDir: values.get('--out-dir') ?? path.join('data', 'research', 'bitcoin-seasonality'),
  };
}

function iso(timestamp) {
  return new Date(timestamp).toISOString();
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function round(value, digits = 12) {
  return Number(value.toFixed(digits));
}

function normalizeTimestamp(value, lineNumber) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) {
    throw new Error(`CSV line ${lineNumber} has an invalid Unix timestamp`);
  }
  const timestamp = numeric < 1_000_000_000_000 ? numeric * 1_000 : numeric;
  if (!Number.isSafeInteger(timestamp) || timestamp % HOUR_MS !== 0) {
    throw new Error(`CSV line ${lineNumber} is not aligned to a UTC hour`);
  }
  return timestamp;
}

function parseHourlyCsv(text, series) {
  const lines = text.trim().split(/\r?\n/);
  if (lines[0] !== 'https://www.CryptoDataDownload.com') {
    throw new Error(`${series.symbol} source attribution header is missing`);
  }
  if (lines[1] !== 'unix,date,symbol,open,high,low,close,Volume BTC,Volume USD'
      && lines[1] !== 'unix,date,symbol,open,high,low,close,Volume ETH,Volume USD') {
    throw new Error(`${series.symbol} source schema changed`);
  }

  const expectedPair = `${series.symbol.slice(0, 3)}/USD`;
  const rows = [];
  for (let lineIndex = 2; lineIndex < lines.length; lineIndex += 1) {
    const fields = lines[lineIndex].split(',');
    if (fields.length !== 9) throw new Error(`CSV line ${lineIndex + 1} must contain 9 fields`);
    const timestamp = normalizeTimestamp(fields[0], lineIndex + 1);
    if (timestamp < series.startTs || timestamp >= END_EXCLUSIVE_TS) continue;
    if (fields[2] !== expectedPair) {
      throw new Error(`CSV line ${lineIndex + 1} does not match ${expectedPair}`);
    }
    const open = Number(fields[3]);
    const high = Number(fields[4]);
    const low = Number(fields[5]);
    const close = Number(fields[6]);
    const volume = Number(fields[7]);
    for (const [field, value] of Object.entries({ open, high, low, close })) {
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${series.symbol} ${iso(timestamp)} ${field} must be finite and positive`);
      }
    }
    if (high < Math.max(open, close) || low > Math.min(open, close) || high < low) {
      throw new Error(`${series.symbol} ${iso(timestamp)} has an invalid OHLC range`);
    }
    if (!Number.isFinite(volume) || volume < 0) {
      throw new Error(`${series.symbol} ${iso(timestamp)} volume must be finite and non-negative`);
    }
    rows.push({ timestamp, open, high, low, close, volume });
  }
  rows.sort((left, right) => left.timestamp - right.timestamp);
  for (let index = 1; index < rows.length; index += 1) {
    const gap = rows[index].timestamp - rows[index - 1].timestamp;
    if (gap <= 0) throw new Error(`${series.symbol} has a duplicate or reversed H1 timestamp`);
    if (gap % HOUR_MS !== 0 || gap > 2 * HOUR_MS) {
      throw new Error(`${series.symbol} has an unsupported H1 gap before ${iso(rows[index].timestamp)}`);
    }
  }
  return rows;
}

function aggregateUtcDays(hourly, series) {
  const grouped = new Map();
  for (const candle of hourly) {
    const timestamp = Math.floor(candle.timestamp / DAY_MS) * DAY_MS;
    const group = grouped.get(timestamp) ?? [];
    group.push(candle);
    grouped.set(timestamp, group);
  }

  const days = [];
  for (let timestamp = series.startTs; timestamp < END_EXCLUSIVE_TS; timestamp += DAY_MS) {
    const hours = grouped.get(timestamp);
    if (!hours || ![23, 24].includes(hours.length)) {
      throw new Error(`${series.symbol} ${iso(timestamp)} must contain 23 or 24 observed H1 bars`);
    }
    hours.sort((left, right) => left.timestamp - right.timestamp);
    let missingHourUtc = null;
    for (let hour = 0; hour < 24; hour += 1) {
      if (!hours.some((candle) => candle.timestamp === timestamp + hour * HOUR_MS)) {
        if (missingHourUtc !== null) {
          throw new Error(`${series.symbol} ${iso(timestamp)} has more than one missing H1 bar`);
        }
        missingHourUtc = hour;
      }
    }
    days.push({
      timestamp,
      open: hours[0].open,
      high: Math.max(...hours.map((candle) => candle.high)),
      low: Math.min(...hours.map((candle) => candle.low)),
      close: hours.at(-1).close,
      volume: round(hours.reduce((sum, candle) => sum + candle.volume, 0)),
      observedHourlyBars: hours.length,
      missingHourUtc,
    });
  }
  if (days.length !== series.expectedDays) {
    throw new Error(`${series.symbol} expected ${series.expectedDays} UTC days but received ${days.length}`);
  }
  return days;
}

async function downloadText(url, symbol) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'TradeClaw-research-input-preparer/1.0' },
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw new Error(`${symbol} download failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function prepareSeries(series) {
  const rawText = await downloadText(series.sourceUrl, series.symbol);
  const hourly = parseHourlyCsv(rawText, series);
  const sourceSubsetSha256 = sha256(canonicalJson(hourly));
  const candles = aggregateUtcDays(hourly, series);
  return {
    rawDownloadSha256: sha256(rawText),
    input: {
      schemaVersion: 1,
      source: 'cryptodatadownload-gemini-h1',
      sourcePage: SOURCE_PAGE,
      sourceUrl: series.sourceUrl,
      sourceLicense: SOURCE_LICENSE,
      sourceSubsetSha256,
      venue: 'Gemini',
      symbol: series.symbol,
      timeframe: 'D1-UTC-from-observed-H1',
      requestedWindow: {
        from: iso(series.startTs),
        toExclusive: iso(END_EXCLUSIVE_TS),
      },
      aggregation: {
        timezone: 'UTC',
        missingHours: 'retained as observed 23-hour days; downstream strategy must skip affected signal and return days',
      },
      candles,
    },
  };
}

async function main() {
  const { outDir } = parseArgs(process.argv.slice(2));
  await mkdir(outDir, { recursive: true });
  for (const series of SERIES) {
    const { input, rawDownloadSha256 } = await prepareSeries(series);
    const bytes = canonicalJson(input);
    const outPath = path.resolve(outDir, `${series.symbol}-D1.json`);
    await writeFile(outPath, bytes, 'utf8');
    const incompleteDays = input.candles.filter((candle) => candle.observedHourlyBars !== 24);
    console.log(
      `${series.symbol}: ${input.candles.length} UTC days, ${incompleteDays.length} incomplete, `
      + `raw SHA-256 ${rawDownloadSha256}, subset SHA-256 ${input.sourceSubsetSha256}, `
      + `input SHA-256 ${sha256(bytes)}, ${outPath}`,
    );
  }
  console.log('Input preparation only: no strategy return or verdict was calculated.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
