# Phase 5 Carry + Cross-Sectional Research — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure, under pre-registered gates, whether funding-rate carry (Track A) or cross-sectional momentum (Track B) has deployable edge after costs, and ship one reconciled verdict memo.

**Architecture:** Two standalone pure-math assembly modules (`carry-assembly.ts`, `xsection-assembly.ts`) + thin validation CLIs, mirroring the Phase 4.5 `daily-momentum-assembly.ts` / `daily-momentum-validation.ts` split exactly. Track A adds a funding-rate store (migration 052 + accessor + Binance backfill CLI). Track B extends the existing candle backfill universe to 30 majors. Neither track touches `runBacktest` or any product code.

**Tech Stack:** TypeScript, tsx (CLI execution), jest (unit tests), pg (store), Binance public APIs (`fapi.binance.com`, `data-api.binance.vision`). No new dependencies.

**Spec:** `docs/plans/2026-06-13-phase5-carry-xsection-research.md` — gates are FROZEN there. No gate, threshold, lookback, or universe edit after a validation run has been seen.

**Worktree:** all work in `D:\Chatbot\tradeclaw\.claude\worktrees\phase5-carry-xsection` on branch `worktree-phase5-carry-xsection`. Deps installed. Jest from the worktree root needs `--modulePathIgnorePatterns="standalone"` (known footgun). Gateguard fires on every new file — present facts + clear via `node "C:/Users/thinkpad/.claude/plugins/cache/continuous-improvement/continuous-improvement/3.13.0/bin/gateguard-clear.mjs" --state "C:/Users/thinkpad/.claude/instincts/2d5c5ee0963c/gateguard-session.json" "<absolute file path>"` then retry. Use ABSOLUTE worktree paths for all Edit/Write calls (root-relative paths hit the shared checkout).

**Conventions that bind every task** (from Phases 2–4.5):
- Determinism: pure functions of inputs; no `Date.now()` in assembly modules; only the CLI's `meta.runAt` varies between identical runs; JSON-stable rounding via `+x.toFixed(n)`.
- Honest numbers: thin samples flagged, never hidden; verdicts evidence-bound; no tuning.
- Raw data dumps live under gitignored `data/research/`; committed evidence = experiment JSON + REGISTRY line under `docs/research/experiments/`.
- Stage commits by explicit filename, never `git add -A` (force-tracked `packages/agent/dist` churn + autocrlf phantoms).

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/migrations/052_funding_rates.sql` | Create append-only `funding_rates` table (Create) |
| `scripts/research/funding-db.ts` | pg accessor for `funding_rates` — upsert/get/coverage (Create) |
| `scripts/research/backfill-funding.ts` | Binance fapi funding backfill CLI, DB or `--out-dir` dump mode (Create) |
| `scripts/research/carry-assembly.ts` | Pure carry math: trailing annualized funding, A1/A2/A3 simulators, folds, gates (Create) |
| `scripts/research/__tests__/carry-assembly.test.ts` | Unit tests for carry assembly (Create) |
| `scripts/research/carry-validation.ts` | Track A CLI: load funding dumps → run A1/A2/A3 → experiment JSON + REGISTRY (Create) |
| `scripts/research/backfill-candles.ts` | Extend `BINANCE_MAP` with 20 symbols (Modify, lines ~58-63) |
| `scripts/research/xsection-assembly.ts` | Pure cross-sectional math: grid, ranking, rotation portfolio, basket, Sharpe, folds, gates (Create) |
| `scripts/research/__tests__/xsection-assembly.test.ts` | Unit tests for xsection assembly (Create) |
| `scripts/research/xsection-validation.ts` | Track B CLI: load D1 dumps → run B1/B2 + benchmarks → experiment JSON + REGISTRY (Create) |
| `docs/research/experiments/*.json` + `REGISTRY.md` | Committed evidence (Create/Modify) |
| `docs/research/2026-06-XX-phase5-carry-xsection-verdict.md` | Reconciled verdict memo, dated the day written (Create) |
| `docs/plans/2026-06-10-engine-makeover.md` | Umbrella plan Phase 5 status (Modify) |

Shared data shapes (defined once here, used verbatim everywhere):

```typescript
/** One funding event as stored/dumped. ts = fundingTime epoch ms. rate = e.g. 0.0001 = 1bp per interval. */
interface FundingEvent { ts: number; rate: number }

/** Funding dump file shape: data/research/funding/<SYMBOL>-funding.json */
interface FundingDump { symbol: string; source: string; events: Array<{ ts: number; rate: number; markPrice: number | null }> }

/** Candle dump file shape (EXISTING, from backfill-candles.ts --out-dir): data/research/candles/<SYMBOL>-D1.json */
interface CandleDump { symbol: string; timeframe: string; source: string; candles: OHLCV[] }
```

---

### Task 1: Funding store — migration 052 + accessor

**Files:**
- Create: `apps/web/migrations/052_funding_rates.sql`
- Create: `scripts/research/funding-db.ts`

No unit tests: SQL + IO-thin accessor, same convention as the untested `candle-db.ts` it mirrors.

- [ ] **Step 1: Write the migration**

```sql
-- 052: Funding-rate store (engine-makeover Phase 5, Track A).
--
-- Historical perp funding events so carry research is reproducible. One row
-- per (symbol, funding event). Append-only by convention — writers use
-- ON CONFLICT DO NOTHING (same contract as candles/049); corrections require
-- an explicit audited migration, never a background overwrite.
--
-- ts is the exchange fundingTime in epoch milliseconds. rate is the funding
-- rate for that interval as a fraction (0.0001 = 1bp). mark_price is the
-- exchange-reported mark at funding time when available, else NULL.
-- No extra index: the PK btree serves the (symbol, ts) range scans
-- (049's redundant index is explicitly NOT copied, per its own NOTE).

CREATE TABLE IF NOT EXISTS funding_rates (
  symbol      VARCHAR(20)      NOT NULL,
  ts          BIGINT           NOT NULL,
  rate        DOUBLE PRECISION NOT NULL,
  mark_price  DOUBLE PRECISION,
  source      VARCHAR(24)      NOT NULL,
  inserted_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, ts)
);
```

- [ ] **Step 2: Write the accessor**

`scripts/research/funding-db.ts`:

```typescript
/**
 * Funding-rate store access for research scripts (engine-makeover Phase 5).
 *
 * Talks straight to the `funding_rates` table (migration 052). Mirrors
 * candle-db.ts: research runs are headless CLI processes; append-only —
 * upserts never overwrite. Connection handling is candle-db's connect().
 */

import type { Client } from 'pg';
import { connect } from './candle-db';

export { connect };

export interface StoredFundingEvent {
  ts: number;
  rate: number;
  markPrice: number | null;
}

/** Idempotent batch insert. Returns the number of NEW rows. */
export async function upsertFundingEvents(
  client: Client,
  symbol: string,
  source: string,
  events: StoredFundingEvent[],
): Promise<number> {
  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < events.length; i += BATCH) {
    const batch = events.slice(i, i + BATCH);
    const values: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (const e of batch) {
      values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
      params.push(symbol, e.ts, e.rate, e.markPrice, source);
    }
    const res = await client.query(
      `INSERT INTO funding_rates (symbol, ts, rate, mark_price, source)
       VALUES ${values.join(', ')}
       ON CONFLICT (symbol, ts) DO NOTHING`,
      params,
    );
    inserted += res.rowCount ?? 0;
  }
  return inserted;
}

export async function getFundingEvents(
  client: Client,
  symbol: string,
  fromTs: number,
  toTs: number,
): Promise<StoredFundingEvent[]> {
  const res = await client.query(
    `SELECT ts, rate, mark_price
       FROM funding_rates
      WHERE symbol = $1 AND ts >= $2 AND ts <= $3
      ORDER BY ts ASC`,
    [symbol, fromTs, toTs],
  );
  return res.rows.map((r) => ({
    ts: Number(r.ts),
    rate: Number(r.rate),
    markPrice: r.mark_price !== null ? Number(r.mark_price) : null,
  }));
}

export async function getFundingCoverage(
  client: Client,
  symbol: string,
): Promise<{ count: number; minTs: number | null; maxTs: number | null }> {
  const res = await client.query(
    `SELECT COUNT(*)::int AS count, MIN(ts) AS min_ts, MAX(ts) AS max_ts
       FROM funding_rates WHERE symbol = $1`,
    [symbol],
  );
  const row = res.rows[0];
  return {
    count: row.count,
    minTs: row.min_ts !== null ? Number(row.min_ts) : null,
    maxTs: row.max_ts !== null ? Number(row.max_ts) : null,
  };
}
```

Note: `candle-db.ts` must export `connect` already — it does (`export function connect()`). No change to candle-db.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "funding-db\|error" | head -20`
Expected: no errors mentioning funding-db. (If the repo root tsconfig doesn't cover scripts/, run `npx tsx --eval "import('./scripts/research/funding-db.ts').then(() => console.log('OK'))"` — expected output `OK`.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/migrations/052_funding_rates.sql scripts/research/funding-db.ts
git commit -m "feat(research): funding_rates store — migration 052 + research accessor"
```

---

### Task 2: Binance funding backfill CLI + connectivity smoke

**Files:**
- Create: `scripts/research/backfill-funding.ts`

- [ ] **Step 1: Connectivity smoke test BEFORE writing the CLI**

Run: `curl -s "https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=3" | head -c 400`
Expected: JSON array like `[{"symbol":"BTCUSDT","fundingTime":1568102400000,"fundingRate":"0.00010000","markPrice":""}...]`.
If this returns an HTML block page / connection error: STOP, do not improvise a scraper. Record the failure and implement the documented fallback instead (`https://data.binance.vision/data/futures/um/monthly/fundingRate/<PAIR>/<PAIR>-fundingRate-<YYYY-MM>.zip`, CSV columns `calc_time,funding_interval_hours,last_funding_rate`) — same dump output shape, separate fetch function, and note the source switch in the commit body.

- [ ] **Step 2: Write the backfill CLI**

`scripts/research/backfill-funding.ts`:

```typescript
/**
 * Backfill Binance USDT-perp funding-rate history (engine-makeover Phase 5,
 * Track A) into the funding_rates store (migration 052) or per-symbol JSON
 * dumps. Mirrors backfill-candles.ts: idempotent (ON CONFLICT DO NOTHING),
 * paginated, polite to the API.
 *
 * Source: GET https://fapi.binance.com/fapi/v1/fundingRate
 *   params symbol, startTime, endTime, limit (max 1000); returns
 *   [{symbol, fundingTime, fundingRate, markPrice}] oldest-first.
 *   Funding intervals vary by symbol/era (8h, some 4h) — events are stored
 *   AS THEY OCCURRED; nothing assumes a fixed interval.
 *
 * Usage (DB mode):
 *   railway run --service Postgres npx tsx scripts/research/backfill-funding.ts \
 *     --symbols BTCUSD,ETHUSD --from 2019-09-01
 * Usage (dump mode, no DB needed — the carry-validation input path):
 *   npx tsx scripts/research/backfill-funding.ts \
 *     --symbols BTCUSD,ETHUSD,SOLUSD,BNBUSD,XRPUSD,ADAUSD,DOGEUSD,DOTUSD,LINKUSD,AVAXUSD \
 *     --from 2019-09-01 --out-dir data/research/funding
 */

import fs from 'fs';
import path from 'path';
import { connect, upsertFundingEvents, getFundingCoverage, type StoredFundingEvent } from './funding-db';

const FAPI_BASE = 'https://fapi.binance.com/fapi/v1/fundingRate';
const PAGE = 1000;

/** Canonical TradeClaw symbol -> Binance USDT-perp pair (same 10 majors as BINANCE_MAP). */
const PERP_MAP: Record<string, string> = {
  BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT', BNBUSD: 'BNBUSDT',
  XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT', DOGEUSD: 'DOGEUSDT', DOTUSD: 'DOTUSDT',
  LINKUSD: 'LINKUSDT', AVAXUSD: 'AVAXUSDT',
};

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface FapiFundingRow {
  symbol: string;
  fundingTime: number;
  fundingRate: string;
  markPrice?: string;
}

async function fetchFunding(pair: string, fromTs: number, toTs: number): Promise<StoredFundingEvent[]> {
  const out: StoredFundingEvent[] = [];
  let cursor = fromTs;
  for (;;) {
    const url = `${FAPI_BASE}?symbol=${pair}&startTime=${cursor}&endTime=${toTs}&limit=${PAGE}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`fapi ${res.status} for ${pair} at cursor ${new Date(cursor).toISOString()}: ${(await res.text()).slice(0, 200)}`);
    }
    const rows = (await res.json()) as FapiFundingRow[];
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) {
      const rate = Number(r.fundingRate);
      if (!Number.isFinite(rate)) continue; // malformed row — skip, never fabricate
      const mark = r.markPrice !== undefined && r.markPrice !== '' ? Number(r.markPrice) : null;
      out.push({ ts: r.fundingTime, rate, markPrice: mark !== null && Number.isFinite(mark) ? mark : null });
    }
    const last = rows[rows.length - 1].fundingTime;
    if (rows.length < PAGE || last >= toTs) break;
    cursor = last + 1;
    await sleep(250); // polite pacing, same spirit as backfill-candles
  }
  return out;
}

(async () => {
  const symbols = arg('symbols', Object.keys(PERP_MAP).join(',')).split(',').map((s) => s.trim().toUpperCase());
  const fromTs = Date.parse(arg('from', '2019-09-01'));
  const toTs = arg('to', '') ? Date.parse(arg('to', '')) : Date.now();
  const outDir = arg('out-dir', '');

  if (!Number.isFinite(fromTs)) { console.error('--from must be an ISO date'); process.exit(2); }

  const client = outDir ? null : await connect();
  for (const symbol of symbols) {
    const pair = PERP_MAP[symbol];
    if (!pair) { console.error(`no perp mapping for ${symbol} — skipped`); continue; }
    const events = await fetchFunding(pair, fromTs, toTs);
    if (outDir) {
      fs.mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, `${symbol}-funding.json`);
      fs.writeFileSync(file, JSON.stringify({ symbol, source: 'binance-fapi', events }, null, 2));
      console.log(`${symbol}: ${events.length} events → ${file} (${events.length ? new Date(events[0].ts).toISOString().slice(0, 10) + '→' + new Date(events[events.length - 1].ts).toISOString().slice(0, 10) : 'EMPTY'})`);
    } else if (client) {
      const inserted = await upsertFundingEvents(client, symbol, 'binance-fapi', events);
      const cov = await getFundingCoverage(client, symbol);
      console.log(`${symbol}: fetched ${events.length}, new ${inserted}, coverage ${cov.count} rows ${cov.minTs ? new Date(cov.minTs).toISOString().slice(0, 10) : '-'}→${cov.maxTs ? new Date(cov.maxTs).toISOString().slice(0, 10) : '-'}`);
    }
  }
  if (client) await client.end();
})();
```

- [ ] **Step 3: Smoke-run the CLI in dump mode, one symbol, narrow window**

Run: `npx tsx scripts/research/backfill-funding.ts --symbols BTCUSD --from 2026-05-01 --to 2026-05-08 --out-dir data/research/funding-smoke`
Expected: `BTCUSD: 21 events → data/research/funding-smoke/BTCUSD-funding.json (2026-05-01→2026-05-07)` (count ≈ 3/day × 7 days; exact count may be 20–22 depending on boundary timestamps — what matters is non-empty, ascending ts, plausible rates ±0.0005-ish).
Then: `node -e "const d=require('./data/research/funding-smoke/BTCUSD-funding.json'); console.log(d.events.length, d.events[0], d.events.every((e,i,a)=>i===0||a[i-1].ts<e.ts))"`
Expected: count, first event object, `true` (strictly ascending).
Cleanup: `rm -rf data/research/funding-smoke`

- [ ] **Step 4: Commit (include the smoke result in the body)**

```bash
git add scripts/research/backfill-funding.ts
git commit -m "feat(research): Binance fapi funding-rate backfill CLI (DB + dump modes)

Connectivity smoke 2026-06-13: fapi.binance.com/fapi/v1/fundingRate reachable,
BTCUSDT 2026-05-01..08 dump returned <N> ascending events with plausible rates."
```

(Replace `<N>` with the actual count from Step 3.)

---

### Task 3: Carry assembly module (TDD)

**Files:**
- Create: `scripts/research/carry-assembly.ts`
- Test: `scripts/research/__tests__/carry-assembly.test.ts`

**Accounting model (pinned here, tested below):** all simulators account in absolute dollars with total carry notional = 1 and capital = 2 (1 spot + 1 perp margin, unlevered). Equity starts at 2. A short-perp/long-spot position RECEIVES `rate × notional` at each funding event while open (pays when rate < 0). Opening one leg-pair costs `0.0035 × notional` (spot side 0.0010 taker + 0.0005 slippage; perp side 0.0005 taker + 0.0015 slippage); closing costs the same; round trip 0.007 × notional. Income accrues for events STRICTLY AFTER the entry event and UP TO AND INCLUDING the exit event (no look-ahead: a position entered at a funding timestamp does not collect that event). Returns reported on capital: `(equity − 2) / 2`. Annualization is simple: `returnOnCapital × 365 / windowDays`. Trailing annualized funding at time t = `(sum of rates in (t − 7d, t]) × 365/7`.

- [ ] **Step 1: Write the failing tests**

`scripts/research/__tests__/carry-assembly.test.ts`:

```typescript
/**
 * Unit tests for the Phase 5 Track A carry assembly (carry-assembly.ts).
 * Synthetic funding series only — no disk, no DB, no network. Pins the
 * accounting model (notional 1 / capital 2 / 0.0035 per leg-pair execution),
 * the no-look-ahead income rule, the threshold state machine, the rotation
 * accounting, fold splitting, the registered gates, and determinism.
 */

import {
  CARRY_COSTS,
  annualizedTrailing,
  runAlwaysOn,
  runThresholdGated,
  runCarryRotation,
  splitFolds,
  carryGates,
  type FundingEvent,
} from '../carry-assembly';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2024, 0, 1); // fixed epoch — no Date.now() anywhere

/** n events every 8h starting at T0, all with the same rate. */
function flatSeries(n: number, rate: number, startTs = T0): FundingEvent[] {
  return Array.from({ length: n }, (_, i) => ({ ts: startTs + i * 8 * HOUR, rate }));
}

describe('annualizedTrailing', () => {
  it('annualizes the 7-day trailing sum (3 events/day at 1bp → 3bp/day → ~10.95%/yr)', () => {
    const events = flatSeries(21, 0.0001); // exactly 7 days of 8h events
    const t = events[events.length - 1].ts;
    // trailing window (t−7d, t] contains events 1..20 (event 0 is exactly t−7d+0 — at t−160h… include by ts > t−7d)
    const inWindow = events.filter((e) => e.ts > t - 7 * DAY && e.ts <= t);
    const expected = inWindow.reduce((s, e) => s + e.rate, 0) * (365 / 7);
    expect(annualizedTrailing(events, t, 7)).toBeCloseTo(expected, 12);
    expect(expected).toBeGreaterThan(0.10); // sanity: ~10.4–10.95%/yr
  });

  it('returns 0 with no events in the window', () => {
    expect(annualizedTrailing(flatSeries(5, 0.0001), T0 - DAY, 7)).toBe(0);
  });
});

describe('runAlwaysOn (A1)', () => {
  it('collects events strictly after entry, charges one round trip', () => {
    const events = flatSeries(30, 0.0001);
    const r = runAlwaysOn(events);
    // entry at event 0 → income from events 1..29 = 29 × 0.0001 = 0.0029; costs 0.007
    expect(r.grossIncome).toBeCloseTo(0.0029, 12);
    expect(r.totalCosts).toBeCloseTo(0.007, 12);
    expect(r.finalEquity).toBeCloseTo(2 + 0.0029 - 0.007, 12);
    expect(r.returnOnCapital).toBeCloseTo((0.0029 - 0.007) / 2, 12);
    expect(r.windowDays).toBeCloseTo((29 * 8) / 24, 10);
    expect(r.annualizedReturn).toBeCloseTo(r.returnOnCapital * (365 / r.windowDays), 12);
  });

  it('negative funding produces negative income (the short perp PAYS)', () => {
    const r = runAlwaysOn(flatSeries(30, -0.0001));
    expect(r.grossIncome).toBeCloseTo(-0.0029, 12);
  });

  it('drawdown is computed on the running equity curve', () => {
    // 10 positive then 20 negative events: equity peaks then bleeds
    const events = [...flatSeries(10, 0.0005), ...flatSeries(20, -0.0005, T0 + 10 * 8 * HOUR)];
    const r = runAlwaysOn(events);
    expect(r.maxDrawdown).toBeGreaterThan(0);
    expect(r.maxDrawdown).toBeCloseTo((20 * 0.0005 + 0.0035) / (2 - 0.0035 + 9 * 0.0005), 6);
    // peak = after entry cost + 9 post-entry positive events; trough = peak − 20 negatives − exit cost
  });
});

describe('runThresholdGated (A2)', () => {
  it('enters above the enter threshold, exits below the exit threshold, one round trip', () => {
    // 30 events at +2bp (trailing annualized ≈ +0.0006×… well above 5%) then 30 at −1bp (trailing goes negative)
    const hot = flatSeries(30, 0.0002);
    const cold = flatSeries(30, -0.0001, T0 + 30 * 8 * HOUR);
    const events = [...hot, ...cold];
    const r = runThresholdGated(events, { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 });
    expect(r.roundTrips).toBe(1);
    expect(r.totalCosts).toBeCloseTo(0.007, 12);
    // income = sum of rates for events strictly after entry up to and including exit
    const entryIdx = events.findIndex((e) => e.ts === r.entries[0]);
    const exitIdx = events.findIndex((e) => e.ts === r.exits[0]);
    const expected = events.slice(entryIdx + 1, exitIdx + 1).reduce((s, e) => s + e.rate, 0);
    expect(r.grossIncome).toBeCloseTo(expected, 12);
    expect(entryIdx).toBeGreaterThanOrEqual(0);
    expect(exitIdx).toBeGreaterThan(entryIdx);
  });

  it('never enters when funding stays below the threshold', () => {
    const r = runThresholdGated(flatSeries(60, 0.0000001), { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 });
    expect(r.roundTrips).toBe(0);
    expect(r.grossIncome).toBe(0);
    expect(r.totalCosts).toBe(0);
    expect(r.finalEquity).toBe(2);
  });

  it('a position open at the last event is force-closed there (exit cost charged)', () => {
    const r = runThresholdGated(flatSeries(60, 0.0002), { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 });
    expect(r.roundTrips).toBe(1);
    expect(r.exits).toHaveLength(1);
    expect(r.exits[0]).toBe(T0 + 59 * 8 * HOUR);
  });
});

describe('runCarryRotation (A3)', () => {
  it('always holds the top-K by trailing funding; turnover only when the set changes', () => {
    const A = flatSeries(90, 0.0003);
    const B = flatSeries(90, 0.0001);
    const C = flatSeries(90, -0.0001);
    const r = runCarryRotation({ AAAUSD: A, BBBUSD: B, CCCUSD: C }, { topK: 1, rebalanceDays: 7, trailingDays: 7 });
    // constant ranking → AAAUSD picked at every rebalance, exactly one entry, no swaps
    expect(r.rebalances.length).toBeGreaterThan(2);
    for (const reb of r.rebalances) expect(reb.held).toEqual(['AAAUSD']);
    expect(r.totalSwaps).toBe(1); // the initial entry counts as one position opened
    // costs = one open + one force-close at end, per-symbol notional 1/K = 1
    expect(r.totalCosts).toBeCloseTo(0.007, 12);
  });

  it('splits notional 1/K across held symbols', () => {
    const A = flatSeries(90, 0.0004);
    const B = flatSeries(90, 0.0002);
    const C = flatSeries(90, -0.0001);
    const r = runCarryRotation({ AAAUSD: A, BBBUSD: B, CCCUSD: C }, { topK: 2, rebalanceDays: 7, trailingDays: 7 });
    for (const reb of r.rebalances) expect(reb.held).toEqual(['AAAUSD', 'BBBUSD']);
    // income between first and second rebalance = (sum of A rates + sum of B rates in that span) / 2
    expect(r.grossIncome).toBeGreaterThan(0);
  });
});

describe('splitFolds', () => {
  it('splits events into n contiguous slices covering everything in order', () => {
    const events = flatSeries(100, 0.0001);
    const folds = splitFolds(events, 4);
    expect(folds).toHaveLength(4);
    expect(folds.flat()).toHaveLength(100);
    expect(folds[0][0].ts).toBe(events[0].ts);
    expect(folds[3][folds[3].length - 1].ts).toBe(events[99].ts);
    for (let f = 1; f < 4; f++) expect(folds[f][0].ts).toBeGreaterThan(folds[f - 1][folds[f - 1].length - 1].ts);
  });
});

describe('carryGates (the FROZEN spec gates)', () => {
  const pass = { fullAnnualized: 0.10, recentAnnualized: 0.06, maxDrawdown: 0.05, foldsPositive: 3, foldsTotal: 4 };
  it('passes only when ALL gates pass', () => {
    expect(carryGates(pass).pass).toBe(true);
  });
  it.each([
    ['full-window yield', { ...pass, fullAnnualized: 0.07 }],
    ['recent-window yield', { ...pass, recentAnnualized: 0.04 }],
    ['drawdown', { ...pass, maxDrawdown: 0.11 }],
    ['folds', { ...pass, foldsPositive: 2 }],
  ])('fails on %s with a reason', (_label, input) => {
    const g = carryGates(input);
    expect(g.pass).toBe(false);
    expect(g.reasons.length).toBeGreaterThan(0);
  });
});

describe('determinism', () => {
  it('identical inputs → byte-identical serialized results', () => {
    const events = [...flatSeries(50, 0.0002), ...flatSeries(50, -0.00005, T0 + 50 * 8 * HOUR)];
    const a = JSON.stringify(runThresholdGated(events, { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 }));
    const b = JSON.stringify(runThresholdGated(events.map((e) => ({ ...e })), { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 }));
    expect(a).toBe(b);
  });
});

// Cost-constant pin: the spec's numbers, so a drive-by edit fails loudly.
describe('CARRY_COSTS', () => {
  it('matches the registered spec constants', () => {
    expect(CARRY_COSTS.spotSide).toBeCloseTo(0.0015, 12);
    expect(CARRY_COSTS.perpSide).toBeCloseTo(0.0020, 12);
    expect(CARRY_COSTS.legPair).toBeCloseTo(0.0035, 12);
    expect(CARRY_COSTS.roundTrip).toBeCloseTo(0.007, 12);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest scripts/research/__tests__/carry-assembly.test.ts --modulePathIgnorePatterns="standalone" 2>&1 | tail -5`
Expected: FAIL — `Cannot find module '../carry-assembly'`.

- [ ] **Step 3: Write the implementation**

`scripts/research/carry-assembly.ts`:

```typescript
/**
 * Pure carry-math assembly for the Phase 5 Track A funding-rate validation
 * (carry-validation.ts is the thin I/O shell). Spec + frozen gates:
 * docs/plans/2026-06-13-phase5-carry-xsection-research.md (D2).
 *
 * Accounting model (tested in carry-assembly.test.ts):
 *  - total carry notional 1, capital 2 (1 spot + 1 perp margin, unlevered);
 *    equity starts at 2; returns reported on capital = (equity − 2) / 2.
 *  - a short-perp/long-spot position RECEIVES rate × notional per funding
 *    event while open (pays when negative).
 *  - opening one leg-pair costs CARRY_COSTS.legPair × notional; closing the
 *    same; income accrues for events STRICTLY AFTER entry, UP TO AND
 *    INCLUDING exit (no look-ahead).
 *  - annualization is simple: returnOnCapital × 365 / windowDays.
 *  - trailing annualized funding at t = sum of rates in (t − Nd, t] × 365/N.
 *
 * Determinism: every function is a pure function of its inputs. No Date.now().
 */

export interface FundingEvent { ts: number; rate: number }

/** Frozen spec constants — spot 0.10% taker + 0.05% slippage; perp 0.05% + 0.15%. */
export const CARRY_COSTS = {
  spotSide: 0.0015,
  perpSide: 0.0020,
  /** One execution of both legs (entry OR exit). */
  legPair: 0.0035,
  /** Full open + close of both legs. */
  roundTrip: 0.007,
} as const;

const DAY = 86_400_000;
const CAPITAL = 2;

/** Sum of rates in (t − windowDays, t], annualized ×365/windowDays. 0 when empty. */
export function annualizedTrailing(events: FundingEvent[], atTs: number, windowDays: number): number {
  const from = atTs - windowDays * DAY;
  let sum = 0;
  for (const e of events) {
    if (e.ts > from && e.ts <= atTs) sum += e.rate;
  }
  return sum * (365 / windowDays);
}

/** Shared equity bookkeeping: walk income/cost deltas, track peak + drawdown. */
interface EquityTrack {
  equity: number;
  peak: number;
  maxDrawdown: number;
}
function newTrack(): EquityTrack {
  return { equity: CAPITAL, peak: CAPITAL, maxDrawdown: 0 };
}
function apply(track: EquityTrack, delta: number): void {
  track.equity += delta;
  if (track.equity > track.peak) track.peak = track.equity;
  const dd = (track.peak - track.equity) / track.peak;
  if (dd > track.maxDrawdown) track.maxDrawdown = dd;
}

/** Rounded result shape shared by all three simulators (JSON-stable). */
export interface CarryRunResult {
  grossIncome: number;
  totalCosts: number;
  finalEquity: number;
  returnOnCapital: number;
  annualizedReturn: number;
  maxDrawdown: number;
  windowDays: number;
  eventCount: number;
}

function finish(track: EquityTrack, grossIncome: number, totalCosts: number, events: FundingEvent[]): CarryRunResult {
  const windowDays = events.length > 1 ? (events[events.length - 1].ts - events[0].ts) / DAY : 0;
  const returnOnCapital = (track.equity - CAPITAL) / CAPITAL;
  return {
    grossIncome: +grossIncome.toFixed(10),
    totalCosts: +totalCosts.toFixed(10),
    finalEquity: +track.equity.toFixed(10),
    returnOnCapital: +returnOnCapital.toFixed(10),
    annualizedReturn: windowDays > 0 ? +(returnOnCapital * (365 / windowDays)).toFixed(10) : 0,
    maxDrawdown: +track.maxDrawdown.toFixed(10),
    windowDays: +windowDays.toFixed(6),
    eventCount: events.length,
  };
}

/** A1 — always-on carry: enter at the first event, collect 2..N, exit at the last. */
export function runAlwaysOn(events: FundingEvent[]): CarryRunResult {
  const track = newTrack();
  let gross = 0;
  let costs = 0;
  if (events.length >= 2) {
    apply(track, -CARRY_COSTS.legPair); // entry at event 0 (collects nothing at entry ts)
    costs += CARRY_COSTS.legPair;
    for (let i = 1; i < events.length; i++) {
      apply(track, events[i].rate);
      gross += events[i].rate;
    }
    apply(track, -CARRY_COSTS.legPair); // exit at the last event (after collecting it)
    costs += CARRY_COSTS.legPair;
  }
  return finish(track, gross, costs, events);
}

export interface ThresholdOptions {
  /** Enter when trailing annualized funding > this (e.g. 0.05 = 5%/yr). */
  enterAbove: number;
  /** Exit when trailing annualized funding < this (e.g. 0). */
  exitBelow: number;
  trailingDays: number;
}

export interface ThresholdResult extends CarryRunResult {
  roundTrips: number;
  /** Entry event timestamps, in order. */
  entries: number[];
  /** Exit event timestamps, in order (last may be a force-close at the final event). */
  exits: number[];
}

/**
 * A2 — threshold-gated carry. The signal at event i uses events ≤ i (no
 * look-ahead); a position entered at event i collects from event i+1; an exit
 * signaled at event j collects event j then closes. A position still open at
 * the final event force-closes there.
 */
export function runThresholdGated(events: FundingEvent[], opts: ThresholdOptions): ThresholdResult {
  const track = newTrack();
  let gross = 0;
  let costs = 0;
  let inPosition = false;
  const entries: number[] = [];
  const exits: number[] = [];

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (inPosition) {
      apply(track, e.rate);
      gross += e.rate;
    }
    const signal = annualizedTrailing(events.slice(0, i + 1), e.ts, opts.trailingDays);
    if (!inPosition && signal > opts.enterAbove && i < events.length - 1) {
      apply(track, -CARRY_COSTS.legPair);
      costs += CARRY_COSTS.legPair;
      inPosition = true;
      entries.push(e.ts);
    } else if (inPosition && signal < opts.exitBelow) {
      apply(track, -CARRY_COSTS.legPair);
      costs += CARRY_COSTS.legPair;
      inPosition = false;
      exits.push(e.ts);
    }
  }
  if (inPosition) {
    apply(track, -CARRY_COSTS.legPair); // force-close at the final event
    costs += CARRY_COSTS.legPair;
    exits.push(events[events.length - 1].ts);
  }
  return { ...finish(track, gross, costs, events), roundTrips: exits.length, entries, exits };
}

export interface RotationOptions {
  topK: number;
  rebalanceDays: number;
  trailingDays: number;
}

export interface RotationRebalance {
  ts: number;
  held: string[];
  /** Symbols opened at this rebalance (each charges one leg-pair on its 1/K notional). */
  opened: string[];
  closed: string[];
}

export interface RotationResult extends CarryRunResult {
  rebalances: RotationRebalance[];
  /** Total positions opened across the run (initial entries count). */
  totalSwaps: number;
}

/**
 * A3 — cross-sectional carry rotation. Every rebalanceDays (grid from the
 * first ts where ≥ topK symbols have ≥ trailingDays of history), rank symbols
 * by trailing annualized funding using events ≤ grid ts, hold the top K at
 * 1/K notional each. Income accrues from each held symbol's events in
 * (gridTs, nextGridTs]. Opening/closing one symbol's position costs
 * legPair × (1/K). Everything force-closes at the final grid point.
 * Ties in ranking break by symbol name (deterministic).
 */
export function runCarryRotation(
  perSymbol: Record<string, FundingEvent[]>,
  opts: RotationOptions,
): RotationResult {
  const symbols = Object.keys(perSymbol).sort();
  const allTs = symbols.flatMap((s) => perSymbol[s].map((e) => e.ts));
  if (allTs.length === 0) {
    return { ...finish(newTrack(), 0, 0, []), rebalances: [], totalSwaps: 0 };
  }
  const minTs = Math.min(...allTs);
  const maxTs = Math.max(...allTs);
  const firstGrid = minTs + opts.trailingDays * DAY;

  const track = newTrack();
  let gross = 0;
  let costs = 0;
  let held: string[] = [];
  let totalSwaps = 0;
  const rebalances: RotationRebalance[] = [];
  const perNotional = 1 / opts.topK;

  for (let t = firstGrid; t <= maxTs; t += opts.rebalanceDays * DAY) {
    const ranked = symbols
      .map((s) => ({ s, f: annualizedTrailing(perSymbol[s].filter((e) => e.ts <= t), t, opts.trailingDays) }))
      .sort((a, b) => b.f - a.f || a.s.localeCompare(b.s))
      .slice(0, opts.topK)
      .map((x) => x.s)
      .sort();

    const opened = ranked.filter((s) => !held.includes(s));
    const closed = held.filter((s) => !ranked.includes(s));
    for (const _ of [...opened, ...closed]) {
      apply(track, -CARRY_COSTS.legPair * perNotional);
      costs += CARRY_COSTS.legPair * perNotional;
    }
    totalSwaps += opened.length;
    held = ranked;
    rebalances.push({ ts: t, held, opened, closed });

    // accrue this week's income from held symbols' events in (t, t + rebalanceDays]
    const until = Math.min(t + opts.rebalanceDays * DAY, maxTs);
    for (const s of held) {
      for (const e of perSymbol[s]) {
        if (e.ts > t && e.ts <= until) {
          apply(track, e.rate * perNotional);
          gross += e.rate * perNotional;
        }
      }
    }
  }
  // force-close everything at the end
  for (const _ of held) {
    apply(track, -CARRY_COSTS.legPair * perNotional);
    costs += CARRY_COSTS.legPair * perNotional;
  }

  // window = the events actually spanned (for annualization)
  const spanned: FundingEvent[] = [{ ts: firstGrid, rate: 0 }, { ts: maxTs, rate: 0 }];
  return { ...finish(track, gross, costs, spanned), rebalances, totalSwaps };
}

/** n contiguous time-ordered slices (last takes the remainder). Each fold runs standalone. */
export function splitFolds(events: FundingEvent[], n: number): FundingEvent[][] {
  const size = Math.floor(events.length / n);
  const out: FundingEvent[][] = [];
  for (let f = 0; f < n; f++) {
    out.push(events.slice(f * size, f === n - 1 ? events.length : (f + 1) * size));
  }
  return out;
}

/** Events within the trailing `days` of the series end (the recent-window read). */
export function recentSlice(events: FundingEvent[], days: number): FundingEvent[] {
  if (events.length === 0) return [];
  const from = events[events.length - 1].ts - days * DAY;
  return events.filter((e) => e.ts >= from);
}

/** The FROZEN Track A gates (spec D2). All must pass. */
export interface CarryGateInput {
  fullAnnualized: number;
  recentAnnualized: number;
  maxDrawdown: number;
  foldsPositive: number;
  foldsTotal: number;
}
export function carryGates(g: CarryGateInput): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!(g.fullAnnualized > 0.08)) reasons.push(`full-window annualized ${(g.fullAnnualized * 100).toFixed(2)}% ≤ 8%`);
  if (!(g.recentAnnualized > 0.05)) reasons.push(`recent-24mo annualized ${(g.recentAnnualized * 100).toFixed(2)}% ≤ 5% (decay test)`);
  if (!(g.maxDrawdown < 0.10)) reasons.push(`max drawdown ${(g.maxDrawdown * 100).toFixed(2)}% ≥ 10%`);
  if (!(g.foldsPositive >= Math.min(3, g.foldsTotal))) reasons.push(`only ${g.foldsPositive}/${g.foldsTotal} folds positive (need ≥3)`);
  return { pass: reasons.length === 0, reasons };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest scripts/research/__tests__/carry-assembly.test.ts --modulePathIgnorePatterns="standalone" 2>&1 | tail -8`
Expected: PASS, all suites green. If the drawdown hand-formula test fails, re-derive the expected value from the pinned accounting (peak after entry cost + 9 positive post-entry events) rather than weakening the assertion — the accounting model is the spec.

- [ ] **Step 5: Commit**

```bash
git add scripts/research/carry-assembly.ts scripts/research/__tests__/carry-assembly.test.ts
git commit -m "feat(research): carry assembly — funding equity, threshold state machine, rotation math"
```

---

### Task 4: Carry validation CLI

**Files:**
- Create: `scripts/research/carry-validation.ts`

- [ ] **Step 1: Write the CLI**

`scripts/research/carry-validation.ts` (mirrors `daily-momentum-validation.ts`'s shell: args, dump loading, console summary, experiment JSON, REGISTRY append):

```typescript
/**
 * Phase 5 Track A: does funding-rate carry clear its FROZEN gates?
 * Spec + gates: docs/plans/2026-06-13-phase5-carry-xsection-research.md (D2).
 *
 * Variants (all pre-registered, NO tuning):
 *   A1 always-on BTC carry — the raw structural yield.
 *   A2 threshold-gated per symbol — enter trailing-7d-annualized > 5%, exit < 0%.
 *   A3 top-3 carry rotation, weekly rebalance, across the 10-major universe.
 *
 * Accounting: carry-assembly.ts (notional 1 / capital 2 unlevered; yields on
 * 2× capital; full two-leg costs). Disclosed v1 limitations: basis MTM path
 * risk and short-leg squeeze risk are NOT modeled — stated in spec + memo.
 *
 * Determinism: spec/results/gates are pure functions of the dumped events.
 * Only meta.runAt varies. Output filename derives from the spec.
 *
 * Usage (after backfill-funding.ts --out-dir):
 *   npx tsx scripts/research/carry-validation.ts --funding-dir data/research/funding --folds 4
 */

import fs from 'fs';
import path from 'path';
import {
  runAlwaysOn,
  runThresholdGated,
  runCarryRotation,
  splitFolds,
  recentSlice,
  carryGates,
  CARRY_COSTS,
  type FundingEvent,
  type CarryRunResult,
} from './carry-assembly';

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const DEFAULT_SYMBOLS = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'LINKUSD', 'AVAXUSD'];
const THRESHOLDS = { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 } as const;
const ROTATION = { topK: 3, rebalanceDays: 7, trailingDays: 7 } as const;
const RECENT_DAYS = 730;

interface FundingDump { symbol: string; source: string; events: Array<{ ts: number; rate: number; markPrice: number | null }> }

function loadFunding(dir: string, symbol: string): FundingEvent[] {
  const file = path.join(dir, `${symbol}-funding.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`funding dump not found: ${file} — run backfill-funding.ts --out-dir first`);
  }
  const dump = JSON.parse(fs.readFileSync(file, 'utf-8')) as FundingDump;
  if (dump.symbol !== symbol || !Array.isArray(dump.events)) {
    throw new Error(`funding dump ${file} does not match ${symbol}`);
  }
  return dump.events
    .map((e) => ({ ts: e.ts, rate: e.rate }))
    .sort((a, b) => a.ts - b.ts);
}

function pct(x: number): string { return `${(x * 100).toFixed(2)}%`; }

function summarize(label: string, r: CarryRunResult): string {
  return `${label.padEnd(26)} ann=${pct(r.annualizedReturn).padStart(8)} ret=${pct(r.returnOnCapital).padStart(8)} ` +
    `dd=${pct(r.maxDrawdown).padStart(7)} gross=${pct(r.grossIncome / 2).padStart(8)} costs=${pct(r.totalCosts / 2).padStart(7)} ` +
    `days=${r.windowDays.toFixed(0)} events=${r.eventCount}`;
}

(() => {
  const symbolsArg = arg('symbols', '');
  const symbols = symbolsArg ? symbolsArg.split(',').map((s) => s.trim().toUpperCase()) : DEFAULT_SYMBOLS;
  const fundingDir = arg('funding-dir', 'data/research/funding');
  const foldsRaw = Number(arg('folds', '4'));
  if (!Number.isFinite(foldsRaw) || foldsRaw <= 0) {
    console.error(`--folds must be a positive number, got '${arg('folds', '4')}'`);
    process.exit(2);
  }
  const folds = Math.max(1, Math.floor(foldsRaw));
  const outDir = arg('out', 'docs/research/experiments');

  const perSymbol: Record<string, FundingEvent[]> = {};
  for (const s of symbols) perSymbol[s] = loadFunding(fundingDir, s);

  // ── A1: always-on BTC ──────────────────────────────────────────────────────
  const btc = perSymbol['BTCUSD'];
  if (!btc || btc.length < 100) {
    console.error('A1 requires a BTCUSD funding dump with ≥100 events');
    process.exit(3);
  }
  const a1Full = runAlwaysOn(btc);
  const a1Recent = runAlwaysOn(recentSlice(btc, RECENT_DAYS));
  const a1Folds = splitFolds(btc, folds).map((f, i) => ({ fold: `fold${i + 1}`, ...runAlwaysOn(f) }));
  const a1Gates = carryGates({
    fullAnnualized: a1Full.annualizedReturn,
    recentAnnualized: a1Recent.annualizedReturn,
    maxDrawdown: a1Full.maxDrawdown,
    foldsPositive: a1Folds.filter((f) => f.returnOnCapital > 0).length,
    foldsTotal: folds,
  });

  console.log('\n=== A1 always-on BTC carry ===');
  console.log('  ' + summarize('full', a1Full));
  console.log('  ' + summarize(`recent-${RECENT_DAYS}d`, a1Recent));
  for (const f of a1Folds) console.log('  ' + summarize(f.fold, f));
  console.log(`  GATES: ${a1Gates.pass ? 'PASS' : 'FAIL'} ${a1Gates.reasons.join('; ')}`);

  // ── A2: threshold-gated per symbol ────────────────────────────────────────
  const a2: Record<string, ReturnType<typeof buildA2>> = {};
  function buildA2(events: FundingEvent[]) {
    const full = runThresholdGated(events, THRESHOLDS);
    const recent = runThresholdGated(recentSlice(events, RECENT_DAYS), THRESHOLDS);
    const foldRuns = splitFolds(events, folds).map((f, i) => ({ fold: `fold${i + 1}`, ...runThresholdGated(f, THRESHOLDS) }));
    const gates = carryGates({
      fullAnnualized: full.annualizedReturn,
      recentAnnualized: recent.annualizedReturn,
      maxDrawdown: full.maxDrawdown,
      foldsPositive: foldRuns.filter((f) => f.returnOnCapital > 0).length,
      foldsTotal: folds,
    });
    return { full, recent, folds: foldRuns, gates };
  }
  console.log('\n=== A2 threshold-gated carry (enter >5%/yr trailing-7d, exit <0%) ===');
  for (const s of symbols) {
    a2[s] = buildA2(perSymbol[s]);
    console.log(`  ${s}: ${summarize('full', a2[s].full)}  trips=${a2[s].full.roundTrips}  GATES ${a2[s].gates.pass ? 'PASS' : 'FAIL'}`);
  }
  const a2PassCount = symbols.filter((s) => a2[s].gates.pass).length;

  // ── A3: top-3 rotation across the universe ────────────────────────────────
  const a3Full = runCarryRotation(perSymbol, ROTATION);
  const recentPerSymbol = Object.fromEntries(symbols.map((s) => [s, recentSlice(perSymbol[s], RECENT_DAYS)]));
  const a3Recent = runCarryRotation(recentPerSymbol, ROTATION);
  // folds: split EACH symbol's events into the same n contiguous slices by its own length
  const a3Folds = Array.from({ length: folds }, (_, i) => {
    const sliced = Object.fromEntries(symbols.map((s) => [s, splitFolds(perSymbol[s], folds)[i]]));
    return { fold: `fold${i + 1}`, ...runCarryRotation(sliced, ROTATION) };
  });
  const a3Gates = carryGates({
    fullAnnualized: a3Full.annualizedReturn,
    recentAnnualized: a3Recent.annualizedReturn,
    maxDrawdown: a3Full.maxDrawdown,
    foldsPositive: a3Folds.filter((f) => f.returnOnCapital > 0).length,
    foldsTotal: folds,
  });
  console.log('\n=== A3 top-3 carry rotation, weekly ===');
  console.log('  ' + summarize('full', a3Full) + `  swaps=${a3Full.totalSwaps}`);
  console.log('  ' + summarize(`recent-${RECENT_DAYS}d`, a3Recent));
  for (const f of a3Folds) console.log('  ' + summarize(f.fold, f));
  console.log(`  GATES: ${a3Gates.pass ? 'PASS' : 'FAIL'} ${a3Gates.reasons.join('; ')}`);

  const caveats = [
    'capital model: notional 1, capital 2 (1 spot + 1 perp margin, unlevered) — all yields are on 2× deployed capital; a desk running leverage would scale yield AND risk',
    `costs: spot ${CARRY_COSTS.spotSide * 100}%/side + perp ${CARRY_COSTS.perpSide * 100}%/side = ${CARRY_COSTS.roundTrip * 100}% of notional per full round trip; A1 pays one round trip, A2/A3 pay per position change`,
    'basis mark-to-market path risk and short-perp-leg squeeze/liquidation risk are NOT modeled (v1 limitation, disclosed in the spec) — if gates pass, Phase 5.5 measures basis from perp klines BEFORE any go-live decision',
    'income accrues for events strictly after entry up to and including exit — no look-ahead; trailing-7d annualized signal uses only events ≤ decision time',
    'funding events are summed as they occurred — no fixed 8h-interval assumption (some symbols moved to 4h intervals)',
    'annualization is simple (return × 365/days), not compounded — transparent and conservative at these magnitudes',
    'folds are contiguous sub-periods; each fold is a standalone deployment (its own entry/exit costs), so short folds carry proportionally more cost drag',
    'gates are FROZEN in docs/plans/2026-06-13-phase5-carry-xsection-research.md — any deviation is a protocol break and must be called out in the memo',
  ];

  const spec = {
    track: 'A-carry',
    variants: {
      A1: { kind: 'always-on', symbol: 'BTCUSD' },
      A2: { kind: 'threshold-gated', ...THRESHOLDS, symbols },
      A3: { kind: 'rotation', ...ROTATION, symbols },
    },
    costs: { ...CARRY_COSTS },
    capitalModel: { notional: 1, capital: 2, leverage: 'none' },
    recentWindowDays: RECENT_DAYS,
    folds,
    gates: {
      fullAnnualized: '> 8%', recentAnnualized: '> 5%', maxDrawdown: '< 10%', foldsPositive: '≥ 3/4',
    },
    perSymbolWindow: Object.fromEntries(symbols.map((s) => {
      const ev = perSymbol[s];
      return [s, {
        eventCount: ev.length,
        first: ev.length ? new Date(ev[0].ts).toISOString() : null,
        last: ev.length ? new Date(ev[ev.length - 1].ts).toISOString() : null,
      }];
    })),
    caveats,
  };

  const results = {
    A1: { full: a1Full, recent: a1Recent, folds: a1Folds, gates: a1Gates },
    A2: Object.fromEntries(symbols.map((s) => [s, a2[s]])),
    A2Summary: { symbolsPassing: a2PassCount, symbolsTotal: symbols.length },
    A3: { full: a3Full, recent: a3Recent, folds: a3Folds, gates: a3Gates },
  };

  const payload = { meta: { runAt: new Date().toISOString() }, spec, results };
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `carry-validation-${symbols.length}majors-f${folds}.json`;
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  const registryPath = path.join(outDir, 'REGISTRY.md');
  fs.appendFileSync(
    registryPath,
    `- ${payload.meta.runAt.slice(0, 10)} \`${fileName}\` — Phase 5 Track A carry validation, ${symbols.length} majors, ` +
    `costs=two-leg (${CARRY_COSTS.roundTrip * 100}% RT), capital=2x unlevered, ${folds} folds: ` +
    `A1(BTC always-on) ann=${pct(a1Full.annualizedReturn)} recent=${pct(a1Recent.annualizedReturn)} dd=${pct(a1Full.maxDrawdown)} gates=${a1Gates.pass ? 'PASS' : 'FAIL'} · ` +
    `A2(threshold) ${a2PassCount}/${symbols.length} symbols pass · ` +
    `A3(top-3 rotation) ann=${pct(a3Full.annualizedReturn)} recent=${pct(a3Recent.annualizedReturn)} gates=${a3Gates.pass ? 'PASS' : 'FAIL'}\n`,
  );

  console.log(`\nwritten: ${outPath}`);
  console.log('NOTE: the gates above ARE the frozen spec gates — a FAIL ships as the honest finding, not a tuning invitation.');
})();
```

- [ ] **Step 2: Smoke the CLI on synthetic dumps (no network, no real data yet)**

Run:
```bash
node -e "
const fs=require('fs');fs.mkdirSync('data/research/funding-test',{recursive:true});
const mk=(sym,rate)=>{const ev=[];for(let i=0;i<2000;i++)ev.push({ts:Date.UTC(2022,0,1)+i*8*3600*1000,rate,markPrice:null});
fs.writeFileSync('data/research/funding-test/'+sym+'-funding.json',JSON.stringify({symbol:sym,source:'synthetic',events:ev}))};
mk('BTCUSD',0.0002);mk('ETHUSD',0.0001);mk('SOLUSD',-0.0001);
"
npx tsx scripts/research/carry-validation.ts --symbols BTCUSD,ETHUSD,SOLUSD --funding-dir data/research/funding-test --folds 4 --out data/research/funding-test
```
Expected: console shows A1 with positive annualized (constant +2bp/8h = +0.06%/day on notional ≈ +21.9%/yr on notional ≈ +10.8%/yr on capital after the one round trip), A2 entering and staying in for BTC/ETH and never entering for SOL (negative funding), A3 holding [BTCUSD, ETHUSD, +1] by rank. JSON written to the test dir.
Cleanup: `rm -rf data/research/funding-test` (the REGISTRY line went to the test dir's REGISTRY.md, which is deleted with it).

- [ ] **Step 3: Commit (CLI only — real evidence lands in Task 8)**

```bash
git add scripts/research/carry-validation.ts
git commit -m "feat(research): carry-validation CLI — A1/A2/A3 under the frozen Track A gates"
```

---

### Task 5: 30-major universe — map expansion + D1 backfill

**Files:**
- Modify: `scripts/research/backfill-candles.ts` (the `BINANCE_MAP` constant, ~line 58)

- [ ] **Step 1: Extend BINANCE_MAP with the 20 additional symbols**

Replace the existing `BINANCE_MAP` with (existing 10 unchanged, 20 added — the FROZEN Track B universe; EOS/MATIC/FTM deliberately excluded for rename/delist risk):

```typescript
// Canonical TradeClaw symbol -> Binance spot pair (market-data only; matches
// the USDT-perp universe the executor trades). Phase 5 extends the original
// 10 majors with 20 more liquid USDT pairs — the FROZEN cross-sectional
// universe (spec D3): fixed BEFORE any validation run, never edited after.
// EOS/MATIC/FTM excluded (renamed/delisted on Binance spot).
const BINANCE_MAP: Record<string, string> = {
  BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT', BNBUSD: 'BNBUSDT',
  XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT', DOGEUSD: 'DOGEUSDT', DOTUSD: 'DOTUSDT',
  LINKUSD: 'LINKUSDT', AVAXUSD: 'AVAXUSDT',
  LTCUSD: 'LTCUSDT', BCHUSD: 'BCHUSDT', ETCUSD: 'ETCUSDT', XLMUSD: 'XLMUSDT',
  TRXUSD: 'TRXUSDT', ATOMUSD: 'ATOMUSDT', NEARUSD: 'NEARUSDT', FILUSD: 'FILUSDT',
  UNIUSD: 'UNIUSDT', AAVEUSD: 'AAVEUSDT', SANDUSD: 'SANDUSDT', MANAUSD: 'MANAUSDT',
  ICPUSD: 'ICPUSDT', ALGOUSD: 'ALGOUSDT', VETUSD: 'VETUSDT', AXSUSD: 'AXSUSDT',
  THETAUSD: 'THETAUSDT', GRTUSD: 'GRTUSDT', HBARUSD: 'HBARUSDT', INJUSD: 'INJUSDT',
};
```

- [ ] **Step 2: Backfill D1 dumps for all 30, 6 years**

Run:
```bash
npx tsx scripts/research/backfill-candles.ts \
  --symbols BTCUSD,ETHUSD,SOLUSD,BNBUSD,XRPUSD,ADAUSD,DOGEUSD,DOTUSD,LINKUSD,AVAXUSD,LTCUSD,BCHUSD,ETCUSD,XLMUSD,TRXUSD,ATOMUSD,NEARUSD,FILUSD,UNIUSD,AAVEUSD,SANDUSD,MANAUSD,ICPUSD,ALGOUSD,VETUSD,AXSUSD,THETAUSD,GRTUSD,HBARUSD,INJUSD \
  --timeframes D1 --years 6 --out-dir data/research/candles
```
Expected: 30 lines of per-symbol coverage. Late-listed symbols (NEAR 2020-10, ICP 2021-05, AXS 2020-11, INJ 2020-10, SAND 2020-08…) return fewer bars — that is FINE (listing-date eligibility handles it). A symbol returning ZERO bars or an error is a dead pair: replace it with the next most liquid non-excluded USDT pair, note the substitution in this task's commit message, and re-run. This substitution is legitimate ONLY now — before any validation run exists.

- [ ] **Step 3: Verify coverage**

Run: `node -e "const fs=require('fs');for(const f of fs.readdirSync('data/research/candles').filter(x=>x.endsWith('-D1.json'))){const d=JSON.parse(fs.readFileSync('data/research/candles/'+f));console.log(d.symbol, d.candles.length, new Date(d.candles[0].timestamp).toISOString().slice(0,10))}" | sort`
Expected: 30 rows; BTC/ETH ~2190 bars; every symbol ≥ ~700 bars (2024-06 subwindow needs ~730).

- [ ] **Step 4: Commit (map only — dumps are gitignored)**

```bash
git add scripts/research/backfill-candles.ts
git commit -m "feat(research): 30-major D1 universe — frozen cross-sectional symbol map

Backfill coverage verified: 30/30 symbols returned D1 bars (BTC/ETH ~2190,
late listings shorter — eligibility is listing-date-aware). Substitutions: <none|list>."
```

---

### Task 6: Cross-sectional assembly module (TDD)

**Files:**
- Create: `scripts/research/xsection-assembly.ts`
- Test: `scripts/research/__tests__/xsection-assembly.test.ts`

**Accounting model (pinned here, tested below):** daily grid is the sorted union of all symbols' D1 bar-open timestamps; a symbol is *eligible* at index i iff it has non-null closes at every index in `[i − lookback, i]`. Decision at a rebalance index i uses closes ≤ i (rank by `close[i]/close[i−lookback] − 1`); new weights take effect from index i+1's returns (no look-ahead). Weights stay fixed between rebalances (drift ignored — disclosed). Daily portfolio return at index t = Σ w_s × (close_t/close_{t−1} − 1) over held symbols; a held symbol with a missing bar contributes 0 that day (counted). Turnover cost at a rebalance = Σ_s |w_new,s − w_old,s| × sideCost (0.002), charged multiplicatively on equity. Long-only: top-K at 1/K each (fewer than K eligible → all eligible, equal-weight; zero eligible → cash). Long-short: +1/(2K) top-K, −1/(2K) bottom-K (gross 1.0, net 0, unlevered). Sharpe = mean(daily)/sd(daily, N−1) × √365; sd = 0 → 0.

- [ ] **Step 1: Write the failing tests**

`scripts/research/__tests__/xsection-assembly.test.ts`:

```typescript
/**
 * Unit tests for the Phase 5 Track B cross-sectional assembly
 * (xsection-assembly.ts). Synthetic daily series only — no disk/DB/network.
 * Pins: grid alignment + eligibility, trailing-return ranking, the rotation
 * accounting (weights, turnover cost, no look-ahead), the basket benchmark,
 * Sharpe, folds, the frozen gates, determinism.
 */

import {
  buildGrid,
  runXsection,
  runBasket,
  btcHold,
  dailySharpe,
  splitGridFolds,
  xsectionGates,
  XS_SIDE_COST,
  type DailySeries,
} from '../xsection-assembly';

const DAY = 86_400_000;
const T0 = Date.UTC(2024, 0, 1);

/** Daily closes from a starting price and per-day growth factor. */
function series(symbol: string, start: number, dailyFactor: number, days: number, offsetDays = 0): DailySeries {
  return {
    symbol,
    bars: Array.from({ length: days }, (_, i) => ({
      ts: T0 + (offsetDays + i) * DAY,
      close: start * Math.pow(dailyFactor, i),
    })),
  };
}

const OPTS = { topK: 1, lookback: 2, rebalanceEvery: 2, mode: 'long-only' as const };

describe('buildGrid', () => {
  it('unions timestamps and nulls missing bars', () => {
    const grid = buildGrid([series('AAA', 100, 1.01, 5), series('BBB', 100, 1.0, 3, 2)]);
    expect(grid.ts).toHaveLength(5);
    expect(grid.closes['BBB'][0]).toBeNull();
    expect(grid.closes['BBB'][2]).toBeCloseTo(100, 10);
    expect(grid.closes['AAA'][4]).toBeCloseTo(100 * 1.01 ** 4, 10);
  });
});

describe('runXsection (long-only)', () => {
  it('picks the strongest trailing return and compounds its daily returns', () => {
    // AAA +1%/day, BBB flat, CCC −1%/day, 9 days; lookback 2, rebalance every 2.
    const grid = buildGrid([series('AAA', 100, 1.01, 9), series('BBB', 100, 1.0, 9), series('CCC', 100, 0.99, 9)]);
    const r = runXsection(grid, OPTS);
    // every rebalance ranks AAA first
    for (const reb of r.rebalances) expect(Object.keys(reb.weights)).toEqual(['AAA']);
    // first rebalance at index 2 (lookback satisfied); cost charged once there
    // (subsequent rebalances have zero turnover — same single holding)
    expect(r.totalTurnoverCost).toBeCloseTo(1 * XS_SIDE_COST, 10);
    // equity: cash through index 2, then (1 − cost) × 1.01^(daysHeld 3..8 = 6 days)
    expect(r.finalEquity).toBeCloseTo((1 - XS_SIDE_COST) * Math.pow(1.01, 6), 8);
    // daily returns array covers indices 1..8 (8 entries), zeros before first rebalance takes effect
    expect(r.dailyReturns).toHaveLength(8);
    expect(r.dailyReturns[0]).toBe(0);
  });

  it('does not look ahead: the rebalance-day return is not earned', () => {
    // AAA jumps +50% exactly on a rebalance day; the strategy must NOT capture it
    const flat = series('AAA', 100, 1.0, 9);
    flat.bars = flat.bars.map((b, i) => ({ ...b, close: i === 2 ? 150 : 100 }));
    const grid = buildGrid([flat, series('BBB', 100, 1.0, 9)]);
    const r = runXsection(grid, OPTS);
    // AAA ranked top at index 2 (its close just spiked) — but the +50% happened AT index 2;
    // from index 3 AAA drops back to 100 (−33%), which the position DOES eat.
    expect(r.finalEquity).toBeLessThan(1);
  });

  it('holds fewer than topK when eligibility is short, cash when none', () => {
    const grid = buildGrid([series('AAA', 100, 1.01, 9)]);
    const r = runXsection(grid, { ...OPTS, topK: 5 });
    for (const reb of r.rebalances) expect(Object.values(reb.weights)).toEqual([1]); // all-eligible = 1 symbol at full weight? NO —
    // SPEC: fewer than topK eligible → all eligible, equal-weight 1/count. One symbol → weight 1.
  });
});

describe('runXsection (long-short)', () => {
  it('is dollar-neutral with gross 1.0 and earns the spread', () => {
    const grid = buildGrid([series('AAA', 100, 1.01, 9), series('BBB', 100, 1.0, 9), series('CCC', 100, 0.99, 9)]);
    const r = runXsection(grid, { ...OPTS, mode: 'long-short' });
    const reb = r.rebalances[0];
    expect(reb.weights['AAA']).toBeCloseTo(0.5, 10);
    expect(reb.weights['CCC']).toBeCloseTo(-0.5, 10);
    expect(Object.values(reb.weights).reduce((s, w) => s + Math.abs(w), 0)).toBeCloseTo(1.0, 10);
    expect(r.finalEquity).toBeGreaterThan(1); // long the riser, short the faller
  });
});

describe('runBasket', () => {
  it('equal-weights ALL eligible symbols through the same accounting', () => {
    const grid = buildGrid([series('AAA', 100, 1.01, 9), series('BBB', 100, 1.0, 9), series('CCC', 100, 0.99, 9)]);
    const r = runBasket(grid, { lookback: 2, rebalanceEvery: 2 });
    expect(Object.values(r.rebalances[0].weights)).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });
});

describe('btcHold', () => {
  it('compounds BTCUSD close-to-close from the first rebalance-effective index', () => {
    const grid = buildGrid([series('BTCUSD', 100, 1.01, 9), series('BBB', 100, 1.0, 9)]);
    const r = btcHold(grid, { lookback: 2, rebalanceEvery: 2 });
    expect(r.finalEquity).toBeCloseTo((1 - XS_SIDE_COST) * Math.pow(1.01, 6), 8);
  });
});

describe('dailySharpe', () => {
  it('mean/sd(N−1)·√365; zero sd → 0', () => {
    expect(dailySharpe([0.01, 0.01, 0.01])).toBe(0);
    const rs = [0.01, -0.01, 0.02, 0.0];
    const mean = rs.reduce((s, x) => s + x, 0) / rs.length;
    const sd = Math.sqrt(rs.reduce((s, x) => s + (x - mean) ** 2, 0) / (rs.length - 1));
    expect(dailySharpe(rs)).toBeCloseTo((mean / sd) * Math.sqrt(365), 10);
  });
});

describe('splitGridFolds', () => {
  it('4 contiguous index ranges covering the grid', () => {
    const grid = buildGrid([series('AAA', 100, 1.0, 100)]);
    const folds = splitGridFolds(grid, 4);
    expect(folds).toHaveLength(4);
    expect(folds[0].from).toBe(0);
    expect(folds[3].to).toBe(99);
    expect(folds[1].from).toBe(folds[0].to + 1);
  });
});

describe('xsectionGates (the FROZEN spec gates)', () => {
  const pass = { strategyReturn: 0.30, basketReturn: 0.20, strategySharpe: 1.2, basketSharpe: 0.8, foldsExcessPositive: 3, foldsTotal: 4 };
  it('passes only when return AND sharpe beat the basket AND folds hold', () => {
    expect(xsectionGates(pass).pass).toBe(true);
  });
  it.each([
    ['return ≤ basket', { ...pass, strategyReturn: 0.20 }],
    ['sharpe ≤ basket', { ...pass, strategySharpe: 0.8 }],
    ['folds', { ...pass, foldsExcessPositive: 2 }],
  ])('fails on %s', (_l, input) => {
    expect(xsectionGates(input).pass).toBe(false);
  });
});

describe('determinism', () => {
  it('identical inputs → byte-identical serialized results', () => {
    const mk = () => buildGrid([series('AAA', 100, 1.012, 60), series('BBB', 100, 0.997, 60), series('CCC', 100, 1.004, 60)]);
    const a = JSON.stringify(runXsection(mk(), { topK: 1, lookback: 14, rebalanceEvery: 7, mode: 'long-only' }));
    const b = JSON.stringify(runXsection(mk(), { topK: 1, lookback: 14, rebalanceEvery: 7, mode: 'long-only' }));
    expect(a).toBe(b);
  });
});
```

Note on the third long-only test: the inline comment marks the SPEC decision — fewer than topK eligible → hold ALL eligible at equal weight (1/count each, weight 1.0 for a single symbol). Implement exactly that; the test asserts it.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest scripts/research/__tests__/xsection-assembly.test.ts --modulePathIgnorePatterns="standalone" 2>&1 | tail -5`
Expected: FAIL — `Cannot find module '../xsection-assembly'`.

- [ ] **Step 3: Write the implementation**

`scripts/research/xsection-assembly.ts`:

```typescript
/**
 * Pure cross-sectional rotation assembly for the Phase 5 Track B validation
 * (xsection-validation.ts is the thin I/O shell). Spec + frozen gates:
 * docs/plans/2026-06-13-phase5-carry-xsection-research.md (D3/D4).
 *
 * Accounting model (tested in xsection-assembly.test.ts):
 *  - daily grid = sorted union of all symbols' bar-open timestamps; nulls
 *    where a symbol has no bar.
 *  - eligible at index i ⇔ non-null closes at every index in [i−lookback, i].
 *  - decision at rebalance index i uses closes ≤ i; weights take effect from
 *    index i+1's returns (no look-ahead). Weights fixed between rebalances
 *    (drift ignored — disclosed).
 *  - daily portfolio return = Σ w_s × (close_t/close_{t−1} − 1); a held
 *    symbol with a missing bar contributes 0 that day (counted).
 *  - turnover cost at a rebalance = Σ|Δw| × XS_SIDE_COST, multiplicative on
 *    equity. Long-only: top-K at 1/K (fewer eligible → all, equal-weight;
 *    none → cash). Long-short: +1/(2K) top, −1/(2K) bottom (gross 1.0).
 *  - Sharpe = mean(daily)/sd(daily, N−1) × √365 (PR #110 convention); 0 on
 *    zero variance.
 *
 * Determinism: pure functions, ties in ranking break by symbol name. No Date.now().
 */

/** Phase 2 crypto cost per side (taker 0.05% + slippage 0.15%). */
export const XS_SIDE_COST = 0.002;

export interface DailySeries {
  symbol: string;
  bars: Array<{ ts: number; close: number }>;
}

export interface DailyGrid {
  ts: number[];
  closes: Record<string, Array<number | null>>;
}

export function buildGrid(series: DailySeries[]): DailyGrid {
  const tsSet = new Set<number>();
  for (const s of series) for (const b of s.bars) tsSet.add(b.ts);
  const ts = [...tsSet].sort((a, b) => a - b);
  const index = new Map(ts.map((t, i) => [t, i]));
  const closes: Record<string, Array<number | null>> = {};
  for (const s of series) {
    const arr: Array<number | null> = new Array(ts.length).fill(null);
    for (const b of s.bars) arr[index.get(b.ts)!] = b.close;
    closes[s.symbol] = arr;
  }
  return { ts, closes };
}

function eligibleAt(grid: DailyGrid, symbol: string, i: number, lookback: number): boolean {
  if (i < lookback) return false;
  const arr = grid.closes[symbol];
  for (let k = i - lookback; k <= i; k++) {
    if (arr[k] === null) return false;
  }
  return true;
}

function trailingReturn(grid: DailyGrid, symbol: string, i: number, lookback: number): number {
  const arr = grid.closes[symbol];
  return (arr[i] as number) / (arr[i - lookback] as number) - 1;
}

export interface XsectionOptions {
  mode: 'long-only' | 'long-short';
  topK: number;
  lookback: number;
  rebalanceEvery: number;
}

export interface RebalanceRecord {
  /** Grid index of the decision bar. */
  index: number;
  ts: number;
  weights: Record<string, number>;
  turnover: number;
  eligibleCount: number;
}

export interface XsectionResult {
  finalEquity: number;
  totalReturn: number;
  sharpe: number;
  maxDrawdown: number;
  /** Daily portfolio returns from grid index 1 to the end (0 before the first rebalance takes effect). */
  dailyReturns: number[];
  rebalances: RebalanceRecord[];
  totalTurnoverCost: number;
  missingBarDays: number;
  firstTs: number;
  lastTs: number;
}

/** Weights for one decision bar under the given mode. Ties break by symbol name. */
function decideWeights(grid: DailyGrid, i: number, opts: XsectionOptions): { weights: Record<string, number>; eligibleCount: number } {
  const eligible = Object.keys(grid.closes)
    .filter((s) => eligibleAt(grid, s, i, opts.lookback))
    .sort();
  const ranked = eligible
    .map((s) => ({ s, r: trailingReturn(grid, s, i, opts.lookback) }))
    .sort((a, b) => b.r - a.r || a.s.localeCompare(b.s));

  const weights: Record<string, number> = {};
  if (opts.mode === 'long-only') {
    const held = ranked.slice(0, opts.topK);
    for (const h of held) weights[h.s] = held.length > 0 ? 1 / held.length : 0;
  } else {
    // long-short needs at least 2K eligible to be meaningfully dollar-neutral;
    // with fewer, hold cash (weights empty) — disclosed via eligibleCount.
    if (ranked.length >= 2 * opts.topK) {
      for (const h of ranked.slice(0, opts.topK)) weights[h.s] = 1 / (2 * opts.topK);
      for (const h of ranked.slice(-opts.topK)) weights[h.s] = -1 / (2 * opts.topK);
    }
  }
  return { weights, eligibleCount: eligible.length };
}

function runPortfolio(
  grid: DailyGrid,
  opts: XsectionOptions,
  decide: (i: number) => { weights: Record<string, number>; eligibleCount: number },
): XsectionResult {
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let weights: Record<string, number> = {};
  let totalTurnoverCost = 0;
  let missingBarDays = 0;
  const dailyReturns: number[] = [];
  const rebalances: RebalanceRecord[] = [];

  for (let i = 1; i < grid.ts.length; i++) {
    // 1) earn today's return on yesterday's weights
    let r = 0;
    for (const [s, w] of Object.entries(weights)) {
      const arr = grid.closes[s];
      const prev = arr[i - 1];
      const cur = arr[i];
      if (prev === null || cur === null || prev === 0) {
        missingBarDays++;
        continue; // missing bar contributes 0 (counted)
      }
      r += w * (cur / prev - 1);
    }
    equity *= 1 + r;
    dailyReturns.push(+r.toFixed(12));

    // 2) rebalance AT this bar's close → new weights effective from i+1
    if ((i - opts.lookback) >= 0 && (i - opts.lookback) % opts.rebalanceEvery === 0) {
      const { weights: next, eligibleCount } = decide(i);
      const keys = new Set([...Object.keys(weights), ...Object.keys(next)]);
      let turnover = 0;
      for (const k of keys) turnover += Math.abs((next[k] ?? 0) - (weights[k] ?? 0));
      const cost = turnover * XS_SIDE_COST;
      equity *= 1 - cost;
      totalTurnoverCost += cost;
      weights = next;
      rebalances.push({ index: i, ts: grid.ts[i], weights: next, turnover: +turnover.toFixed(10), eligibleCount });
    }

    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    finalEquity: +equity.toFixed(10),
    totalReturn: +(equity - 1).toFixed(10),
    sharpe: +dailySharpe(dailyReturns).toFixed(6),
    maxDrawdown: +maxDrawdown.toFixed(10),
    dailyReturns,
    rebalances,
    totalTurnoverCost: +totalTurnoverCost.toFixed(10),
    missingBarDays,
    firstTs: grid.ts[0],
    lastTs: grid.ts[grid.ts.length - 1],
  };
}

export function runXsection(grid: DailyGrid, opts: XsectionOptions): XsectionResult {
  return runPortfolio(grid, opts, (i) => decideWeights(grid, i, opts));
}

/** The apples-to-apples benchmark: equal-weight ALL eligible, same machinery + costs. */
export function runBasket(grid: DailyGrid, opts: { lookback: number; rebalanceEvery: number }): XsectionResult {
  const full: XsectionOptions = { ...opts, mode: 'long-only', topK: Number.MAX_SAFE_INTEGER };
  return runPortfolio(grid, full, (i) => {
    const eligible = Object.keys(grid.closes).filter((s) => eligibleAt(grid, s, i, opts.lookback)).sort();
    const weights: Record<string, number> = {};
    for (const s of eligible) weights[s] = eligible.length > 0 ? 1 / eligible.length : 0;
    return { weights, eligibleCount: eligible.length };
  });
}

/** BTC buy-and-hold reference through the same machinery (hold BTCUSD from the first rebalance). */
export function btcHold(grid: DailyGrid, opts: { lookback: number; rebalanceEvery: number }): XsectionResult {
  const full: XsectionOptions = { ...opts, mode: 'long-only', topK: 1 };
  return runPortfolio(grid, full, (i) => {
    const ok = eligibleAt(grid, 'BTCUSD', i, opts.lookback);
    return { weights: ok ? { BTCUSD: 1 } : {}, eligibleCount: ok ? 1 : 0 };
  });
}

/** mean/sd(N−1) × √365; 0 on zero variance or < 2 samples. */
export function dailySharpe(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((s, x) => s + x, 0) / returns.length;
  const variance = returns.reduce((s, x) => s + (x - mean) ** 2, 0) / (returns.length - 1);
  const sd = Math.sqrt(variance);
  if (sd === 0) return 0;
  return (mean / sd) * Math.sqrt(365);
}

export interface GridFold { label: string; from: number; to: number }

/** n contiguous index ranges over the grid (last takes the remainder). */
export function splitGridFolds(grid: DailyGrid, n: number): GridFold[] {
  const size = Math.floor(grid.ts.length / n);
  const out: GridFold[] = [];
  for (let f = 0; f < n; f++) {
    out.push({ label: `fold${f + 1}`, from: f * size, to: f === n - 1 ? grid.ts.length - 1 : (f + 1) * size - 1 });
  }
  return out;
}

/** Slice a grid to an index range (fold runs standalone — warmup restarts). */
export function sliceGrid(grid: DailyGrid, from: number, to: number): DailyGrid {
  return {
    ts: grid.ts.slice(from, to + 1),
    closes: Object.fromEntries(Object.entries(grid.closes).map(([s, arr]) => [s, arr.slice(from, to + 1)])),
  };
}

/** The FROZEN Track B gates (spec D4): beat the basket on return AND Sharpe, ≥3/4 folds of positive excess. */
export interface XsectionGateInput {
  strategyReturn: number;
  basketReturn: number;
  strategySharpe: number;
  basketSharpe: number;
  foldsExcessPositive: number;
  foldsTotal: number;
}
export function xsectionGates(g: XsectionGateInput): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!(g.strategyReturn > g.basketReturn)) reasons.push(`return ${(g.strategyReturn * 100).toFixed(2)}% ≤ basket ${(g.basketReturn * 100).toFixed(2)}% (rotation that matches the basket is churn)`);
  if (!(g.strategySharpe > g.basketSharpe)) reasons.push(`Sharpe ${g.strategySharpe.toFixed(2)} ≤ basket ${g.basketSharpe.toFixed(2)}`);
  if (!(g.foldsExcessPositive >= Math.min(3, g.foldsTotal))) reasons.push(`only ${g.foldsExcessPositive}/${g.foldsTotal} folds with positive excess (need ≥3)`);
  return { pass: reasons.length === 0, reasons };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest scripts/research/__tests__/xsection-assembly.test.ts --modulePathIgnorePatterns="standalone" 2>&1 | tail -8`
Expected: PASS. The no-look-ahead test is the load-bearing one — if it fails, the bug is real (weights applied to the decision bar's own return); fix the implementation, never the test.

- [ ] **Step 5: Commit**

```bash
git add scripts/research/xsection-assembly.ts scripts/research/__tests__/xsection-assembly.test.ts
git commit -m "feat(research): cross-sectional assembly — rank, turnover, rebalance accounting"
```

---

### Task 7: Cross-sectional validation CLI

**Files:**
- Create: `scripts/research/xsection-validation.ts`

- [ ] **Step 1: Write the CLI**

```typescript
/**
 * Phase 5 Track B: does cross-sectional momentum beat passive holding after
 * costs? Spec + frozen gates: docs/plans/2026-06-13-phase5-carry-xsection-research.md (D4).
 *
 * Variants (pre-registered, NO tuning): B1 long-only top-5; B2 long-short
 * top5−bottom5 (gross 1.0, unlevered). 14-day lookback, weekly rebalance.
 * Benchmarks through the IDENTICAL machinery + costs: equal-weight basket
 * (the gate benchmark) and BTC buy-and-hold (reference only).
 *
 * Survivorship: today's top-30 universe is an optimistic bias (disclosed);
 * the 2024-06→2026-06 subwindow (all 30 listed) is reported alongside.
 *
 * Determinism: only meta.runAt varies. Filename derives from the spec.
 *
 * Usage (after backfill-candles.ts --out-dir, 30 symbols, D1):
 *   npx tsx scripts/research/xsection-validation.ts --candles-dir data/research/candles --folds 4
 */

import fs from 'fs';
import path from 'path';
import {
  buildGrid,
  runXsection,
  runBasket,
  btcHold,
  splitGridFolds,
  sliceGrid,
  xsectionGates,
  XS_SIDE_COST,
  type DailySeries,
  type XsectionResult,
  type DailyGrid,
} from './xsection-assembly';

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const UNIVERSE = [
  'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'LINKUSD', 'AVAXUSD',
  'LTCUSD', 'BCHUSD', 'ETCUSD', 'XLMUSD', 'TRXUSD', 'ATOMUSD', 'NEARUSD', 'FILUSD', 'UNIUSD', 'AAVEUSD',
  'SANDUSD', 'MANAUSD', 'ICPUSD', 'ALGOUSD', 'VETUSD', 'AXSUSD', 'THETAUSD', 'GRTUSD', 'HBARUSD', 'INJUSD',
];
const LOOKBACK = 14;
const REBALANCE = 7;
const TOPK = 5;
const SUBWINDOW_FROM = Date.UTC(2024, 5, 1); // 2024-06-01: all 30 listed

interface CandleDump { symbol: string; timeframe: string; source: string; candles: Array<{ timestamp: number; close: number }> }

function loadSeries(dir: string, symbol: string): DailySeries {
  const file = path.join(dir, `${symbol}-D1.json`);
  if (!fs.existsSync(file)) throw new Error(`candle dump not found: ${file} — run backfill-candles.ts --out-dir first`);
  const dump = JSON.parse(fs.readFileSync(file, 'utf-8')) as CandleDump;
  if (dump.symbol !== symbol || !Array.isArray(dump.candles)) throw new Error(`dump ${file} does not match ${symbol}`);
  return {
    symbol,
    bars: dump.candles
      .map((c) => ({ ts: c.timestamp, close: c.close }))
      .sort((a, b) => a.ts - b.ts),
  };
}

function pct(x: number): string { return `${(x * 100).toFixed(2)}%`; }

function line(label: string, r: XsectionResult): string {
  return `${label.padEnd(14)} ret=${pct(r.totalReturn).padStart(9)} sharpe=${r.sharpe.toFixed(2).padStart(6)} ` +
    `dd=${pct(r.maxDrawdown).padStart(7)} cost=${pct(r.totalTurnoverCost).padStart(7)} rebs=${r.rebalances.length}`;
}

function evaluate(grid: DailyGrid, folds: number) {
  const opts = { topK: TOPK, lookback: LOOKBACK, rebalanceEvery: REBALANCE };
  const b1 = runXsection(grid, { ...opts, mode: 'long-only' });
  const b2 = runXsection(grid, { ...opts, mode: 'long-short' });
  const basket = runBasket(grid, opts);
  const btc = btcHold(grid, opts);

  const foldRanges = splitGridFolds(grid, folds);
  const foldRows = foldRanges.map((f) => {
    const g = sliceGrid(grid, f.from, f.to);
    const s1 = runXsection(g, { ...opts, mode: 'long-only' });
    const s2 = runXsection(g, { ...opts, mode: 'long-short' });
    const bk = runBasket(g, opts);
    return {
      label: f.label,
      from: new Date(g.ts[0]).toISOString().slice(0, 10),
      to: new Date(g.ts[g.ts.length - 1]).toISOString().slice(0, 10),
      b1: { totalReturn: s1.totalReturn, sharpe: s1.sharpe, excess: +(s1.totalReturn - bk.totalReturn).toFixed(10) },
      b2: { totalReturn: s2.totalReturn, sharpe: s2.sharpe, excess: +(s2.totalReturn - bk.totalReturn).toFixed(10) },
      basket: { totalReturn: bk.totalReturn, sharpe: bk.sharpe },
    };
  });

  const gates = {
    B1: xsectionGates({
      strategyReturn: b1.totalReturn, basketReturn: basket.totalReturn,
      strategySharpe: b1.sharpe, basketSharpe: basket.sharpe,
      foldsExcessPositive: foldRows.filter((f) => f.b1.excess > 0).length, foldsTotal: folds,
    }),
    B2: xsectionGates({
      strategyReturn: b2.totalReturn, basketReturn: basket.totalReturn,
      strategySharpe: b2.sharpe, basketSharpe: basket.sharpe,
      foldsExcessPositive: foldRows.filter((f) => f.b2.excess > 0).length, foldsTotal: folds,
    }),
  };

  // strip the bulky dailyReturns from the persisted payload (derivable from the dumps)
  const compact = (r: XsectionResult) => {
    const { dailyReturns: _d, rebalances, ...rest } = r;
    return { ...rest, rebalanceCount: rebalances.length, meanEligible: +(
      rebalances.reduce((s, x) => s + x.eligibleCount, 0) / Math.max(1, rebalances.length)
    ).toFixed(1) };
  };
  return { b1: compact(b1), b2: compact(b2), basket: compact(basket), btc: compact(btc), folds: foldRows, gates };
}

(() => {
  const candlesDir = arg('candles-dir', 'data/research/candles');
  const foldsRaw = Number(arg('folds', '4'));
  if (!Number.isFinite(foldsRaw) || foldsRaw <= 0) {
    console.error(`--folds must be a positive number, got '${arg('folds', '4')}'`);
    process.exit(2);
  }
  const folds = Math.max(1, Math.floor(foldsRaw));
  const outDir = arg('out', 'docs/research/experiments');

  const series = UNIVERSE.map((s) => loadSeries(candlesDir, s));
  const grid = buildGrid(series);
  const full = evaluate(grid, folds);

  // subwindow: all-30-listed window (survivorship mitigation read)
  const subFrom = grid.ts.findIndex((t) => t >= SUBWINDOW_FROM);
  if (subFrom < 0) { console.error('subwindow start beyond grid end — check dumps'); process.exit(3); }
  const sub = evaluate(sliceGrid(grid, subFrom, grid.ts.length - 1), folds);

  console.log(`\n=== Track B cross-sectional momentum (${UNIVERSE.length} majors, lb${LOOKBACK}, rb${REBALANCE}, top${TOPK}) ===`);
  console.log('  FULL WINDOW');
  for (const [k, v] of Object.entries({ B1: full.b1, B2: full.b2, basket: full.basket, btcHold: full.btc })) console.log('    ' + line(k, v as never));
  console.log(`    GATES B1: ${full.gates.B1.pass ? 'PASS' : 'FAIL'} ${full.gates.B1.reasons.join('; ')}`);
  console.log(`    GATES B2: ${full.gates.B2.pass ? 'PASS' : 'FAIL'} ${full.gates.B2.reasons.join('; ')}`);
  console.log('  SUBWINDOW 2024-06→end (all 30 listed)');
  for (const [k, v] of Object.entries({ B1: sub.b1, B2: sub.b2, basket: sub.basket, btcHold: sub.btc })) console.log('    ' + line(k, v as never));
  console.log(`    GATES B1: ${sub.gates.B1.pass ? 'PASS' : 'FAIL'} ${sub.gates.B1.reasons.join('; ')}`);
  console.log(`    GATES B2: ${sub.gates.B2.pass ? 'PASS' : 'FAIL'} ${sub.gates.B2.reasons.join('; ')}`);

  const caveats = [
    'survivorship: the 30-symbol universe is TODAY\\'S liquid majors — an optimistic bias the full-window numbers inherit; the 2024-06→end subwindow (all 30 listed) is the bias-mitigated read and the gate verdict quotes BOTH',
    'eligibility is listing-date-aware (a symbol ranks only with lookback+1 stored bars), which removes look-ahead but not selection bias',
    `costs: ${XS_SIDE_COST * 100}%/side (Phase 2 crypto model) charged on actual turnover at each rebalance; the basket benchmark pays the SAME costs through the SAME machinery`,
    'weights are fixed between rebalances (drift ignored) and a held symbol\\'s missing bar contributes 0 that day — both simplifications are symmetric across strategy and benchmark',
    'B2 long-short is gross 1.0 dollar-neutral UNLEVERED; short-leg funding flows are NOT modeled here (Track A quantifies funding separately)',
    'the gate benchmark is the equal-weight basket, NOT zero: rotation must beat passive holding of the same universe or it is churn',
    'gates are FROZEN in docs/plans/2026-06-13-phase5-carry-xsection-research.md — any deviation is a protocol break and must be called out in the memo',
  ];

  const spec = {
    track: 'B-xsection',
    universe: UNIVERSE,
    lookback: LOOKBACK,
    rebalanceEvery: REBALANCE,
    topK: TOPK,
    sideCost: XS_SIDE_COST,
    folds,
    subwindowFrom: new Date(SUBWINDOW_FROM).toISOString().slice(0, 10),
    gates: { vsBasket: 'return AND Sharpe > basket', foldsExcessPositive: '≥ 3/4' },
    gridDays: grid.ts.length,
    caveats,
  };

  const payload = { meta: { runAt: new Date().toISOString() }, spec, full, subwindow: sub };
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `xsection-validation-${UNIVERSE.length}majors-D1-lb${LOOKBACK}-rb${REBALANCE}-top${TOPK}-f${folds}.json`;
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  const registryPath = path.join(outDir, 'REGISTRY.md');
  fs.appendFileSync(
    registryPath,
    `- ${payload.meta.runAt.slice(0, 10)} \`${fileName}\` — Phase 5 Track B cross-sectional momentum, ${UNIVERSE.length} majors D1 lb${LOOKBACK} rb${REBALANCE} top${TOPK}, ` +
    `costs=${XS_SIDE_COST * 100}%/side, ${folds} folds: ` +
    `B1(long-only) ret=${pct(full.b1.totalReturn)} vs basket ${pct(full.basket.totalReturn)} gates=${full.gates.B1.pass ? 'PASS' : 'FAIL'} · ` +
    `B2(long-short) ret=${pct(full.b2.totalReturn)} gates=${full.gates.B2.pass ? 'PASS' : 'FAIL'} · ` +
    `subwindow(2024-06→) B1 ${sub.gates.B1.pass ? 'PASS' : 'FAIL'} B2 ${sub.gates.B2.pass ? 'PASS' : 'FAIL'}\n`,
  );

  console.log(`\nwritten: ${outPath}`);
  console.log('NOTE: the gate benchmark is the equal-weight basket — beating zero is not the bar.');
})();
```

- [ ] **Step 2: Type-check + dry parse**

Run: `npx tsx --eval "import('./scripts/research/xsection-validation.ts').catch(e => { console.error(String(e).slice(0,300)); process.exit(1) })"`
Expected: an error mentioning a missing candle dump (`candle dump not found: ... BTCUSD-D1.json`) IF dumps are absent — that proves the module parses and fails on data, not syntax. With dumps present (Task 5 done), expect the full console report instead.

- [ ] **Step 3: Commit (CLI only — evidence lands in Task 8)**

```bash
git add scripts/research/xsection-validation.ts
git commit -m "feat(research): xsection-validation CLI — B1/B2 vs equal-weight basket under the frozen Track B gates"
```

---

### Task 8: Evidence runs — backfills, both validations, determinism check

**Files:**
- Create: `docs/research/experiments/carry-validation-10majors-f4.json`
- Create: `docs/research/experiments/xsection-validation-30majors-D1-lb14-rb7-top5-f4.json`
- Modify: `docs/research/experiments/REGISTRY.md` (two appended lines)

- [ ] **Step 1: Full funding backfill (dump mode — the validation input path)**

Run:
```bash
npx tsx scripts/research/backfill-funding.ts \
  --symbols BTCUSD,ETHUSD,SOLUSD,BNBUSD,XRPUSD,ADAUSD,DOGEUSD,DOTUSD,LINKUSD,AVAXUSD \
  --from 2019-09-01 --out-dir data/research/funding
```
Expected: 10 lines; BTCUSD ~7,300+ events from 2019-09; later-listed symbols start later (SOL ~2020-09, AVAX ~2020-09, DOT ~2020-08…). Sanity: every line non-empty, dates ascending. If any symbol errors, fix the mapping NOW (before any validation run) and note it.

- [ ] **Step 2: (Optional, operator-gated) mirror into the DB store**

If `railway run` is available this session:
```bash
railway run --service Postgres npx tsx scripts/research/backfill-funding.ts \
  --symbols BTCUSD,ETHUSD,SOLUSD,BNBUSD,XRPUSD,ADAUSD,DOGEUSD,DOTUSD,LINKUSD,AVAXUSD --from 2019-09-01
```
(Migration 052 auto-runs on deploy; if the table is missing in prod, apply it first the way 048/049 were.) If railway is NOT available, SKIP — dump mode is the registered input path; note the skip in the PR body.

- [ ] **Step 3: Run carry validation TWICE, verify determinism, inspect**

Run:
```bash
npx tsx scripts/research/carry-validation.ts --funding-dir data/research/funding --folds 4
cp docs/research/experiments/carry-validation-10majors-f4.json /tmp/carry-run1.json
npx tsx scripts/research/carry-validation.ts --funding-dir data/research/funding --folds 4
node -e "
const a=JSON.parse(require('fs').readFileSync('/tmp/carry-run1.json'));
const b=JSON.parse(require('fs').readFileSync('docs/research/experiments/carry-validation-10majors-f4.json'));
delete a.meta; delete b.meta;
console.log(JSON.stringify(a)===JSON.stringify(b) ? 'DETERMINISTIC' : 'MISMATCH — investigate before committing');
"
```
Expected: `DETERMINISTIC`. The second run also appended a duplicate REGISTRY line — remove the duplicate (keep one) before committing.
Then read the gate verdicts. Whatever they say IS the result.

- [ ] **Step 4: Run xsection validation TWICE, verify determinism, inspect**

Run:
```bash
npx tsx scripts/research/xsection-validation.ts --candles-dir data/research/candles --folds 4
cp docs/research/experiments/xsection-validation-30majors-D1-lb14-rb7-top5-f4.json /tmp/xs-run1.json
npx tsx scripts/research/xsection-validation.ts --candles-dir data/research/candles --folds 4
node -e "
const a=JSON.parse(require('fs').readFileSync('/tmp/xs-run1.json'));
const b=JSON.parse(require('fs').readFileSync('docs/research/experiments/xsection-validation-30majors-D1-lb14-rb7-top5-f4.json'));
delete a.meta; delete b.meta;
console.log(JSON.stringify(a)===JSON.stringify(b) ? 'DETERMINISTIC' : 'MISMATCH — investigate before committing');
"
```
Expected: `DETERMINISTIC`. Dedupe the REGISTRY line as above.

- [ ] **Step 5: Full test suite green**

Run: `npx jest scripts/research packages/strategies --modulePathIgnorePatterns="standalone" 2>&1 | tail -6`
Expected: all suites pass (the two new test files + every pre-existing research/strategies test untouched).

- [ ] **Step 6: Commit the evidence**

```bash
git add docs/research/experiments/carry-validation-10majors-f4.json \
        docs/research/experiments/xsection-validation-30majors-D1-lb14-rb7-top5-f4.json \
        docs/research/experiments/REGISTRY.md
git commit -m "docs(research): Phase 5 registered evidence — carry + cross-sectional validation runs

Determinism verified (two runs byte-identical ex-meta). Gate verdicts as
reported by the frozen-gate CLIs; interpretation in the Phase 5 memo."
```

---

### Task 9: Reconciled verdict memo + umbrella update

**Files:**
- Create: `docs/research/<today>-phase5-carry-xsection-verdict.md` (dated the day written)
- Modify: `docs/plans/2026-06-10-engine-makeover.md` (Phase 5 status)
- Modify: `docs/plans/2026-06-13-phase5-carry-xsection-research.md` (Status: line)

- [ ] **Step 1: Write the memo from the registered numbers ONLY**

Structure (mirror `2026-06-12-phase4.5-verdict-single-asset-timing.md` exactly): title with the one-line verdict; The question; The two tracks (method + gate table per track, quoting the experiment JSON numbers verbatim — full window AND recent/subwindow); Disclosed limitations (basis/squeeze for A; survivorship/drift for B); The conclusion; Strategic options ranked for Phase 6 — exactly one of:
  1. Carry passes → Phase 5.5: basis measurement from perp klines + multi-exchange robustness, THEN carry-engine product design.
  2. Only cross-sectional passes → rotation product design with the subwindow caveat front-and-center.
  3. Both pass → carry primary (structural yield beats timing fragility), rotation secondary.
  4. Neither passes → Phase 4.5 option 3 stands: reposition to regime-context product; timing/carry/rotation all registered dead ends — the test bench remains the durable asset.

Every number cited must appear in a committed experiment JSON. If a gate result is awkward (e.g. A1 passes but A2/A3 fail), report it exactly — partial passes are findings, not embarrassments.

- [ ] **Step 2: Update the umbrella plan + spec status**

In `docs/plans/2026-06-10-engine-makeover.md`: add a Phase 5 status block (date, branch, PR-to-be, one-line verdict, memo path) alongside the existing phase entries. In the Phase 5 spec doc: flip `Status:` to `CODE COMPLETE <date> — verdict: <one line>`.

- [ ] **Step 3: Commit**

```bash
git add docs/research/<today>-phase5-carry-xsection-verdict.md \
        docs/plans/2026-06-10-engine-makeover.md \
        docs/plans/2026-06-13-phase5-carry-xsection-research.md
git commit -m "docs(research): Phase 5 verdict — carry vs cross-sectional, reconciled + ranked"
```

- [ ] **Step 4: Finish the branch**

Use superpowers:finishing-a-development-branch: full suite green, then PR `worktree-phase5-carry-xsection` → base `worktree-phase4.5-daily-momentum` (stacked on PR #117; retarget to main as the stack lands), title `Phase 5: carry + cross-sectional research — <verdict one-liner>`. Update the project memory file (`engine-makeover-audit-2026-06-10.md`) with the Phase 5 outcome.

---

## Self-Review (done at write time)

- **Spec coverage:** D1→Tasks 1-2, D2→Tasks 3-4, D3→Task 5, D4→Tasks 6-7, D5→Tasks 8-9, D6 honored (no product code touched anywhere). Gates appear verbatim in `carryGates` / `xsectionGates` and are pinned by tests.
- **Placeholders:** none — every code step is complete; `<N>`/`<today>`/`<verdict>` tokens are run-time facts, not design gaps.
- **Type consistency:** `FundingEvent {ts, rate}` (assembly) vs `StoredFundingEvent {ts, rate, markPrice}` (store/dump) — the CLI maps dump→assembly explicitly in `loadFunding`. `XsectionResult` field names used by the CLI (`totalReturn`, `sharpe`, `rebalances`, `totalTurnoverCost`, `eligibleCount`) all exist on the interface. `connect` re-exported from candle-db once, not duplicated.
- **Known judgment calls (intentional):** A2's trailing signal recomputes `events.slice(0, i+1)` per event — O(n²) on ~7k events ≈ fine for research; do NOT pre-optimize. The rotation force-close charges full per-symbol leg-pairs at the end — conservative. `btcHold` pays one side-cost on entry — symmetric with the strategies.
