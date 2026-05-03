import { describe, it, expect } from 'vitest';
import { isMarketOpen, getMarketStatus } from '../market-hours';

// All timestamps are pinned to specific UTC instants. Day-of-week is stable
// because we're using getUTCDay() / getUTCHours() inside isMarketOpen.

const SAT_2026_05_02_22_53_UTC = Date.UTC(2026, 4, 2, 22, 53, 0); // Saturday
const SUN_2026_05_03_15_00_UTC = Date.UTC(2026, 4, 3, 15, 0, 0);  // Sunday
const MON_2026_05_04_15_00_UTC = Date.UTC(2026, 4, 4, 15, 0, 0);  // Monday — US equities open
const MON_2026_05_04_03_00_UTC = Date.UTC(2026, 4, 4, 3, 0, 0);   // Monday pre-equities, post-Sun-forex-open
const FRI_2026_05_01_19_00_UTC = Date.UTC(2026, 4, 1, 19, 0, 0);  // Friday during US session
const SUN_2026_05_03_23_00_UTC = Date.UTC(2026, 4, 3, 23, 0, 0);  // Sunday after forex open (22 UTC)

describe('isMarketOpen — stocks (regression: weekend signals bug)', () => {
  const stocks = ['SPYUSD', 'TSLAUSD', 'GOOGLUSD', 'METAUSD', 'NVDAUSD', 'AAPLUSD', 'MSFTUSD', 'AMZNUSD', 'QQQUSD'];

  it.each(stocks)('%s is closed on Saturday 22:53 UTC', (sym) => {
    expect(isMarketOpen(sym, SAT_2026_05_02_22_53_UTC)).toBe(false);
  });

  it.each(stocks)('%s is closed on Sunday 15:00 UTC', (sym) => {
    expect(isMarketOpen(sym, SUN_2026_05_03_15_00_UTC)).toBe(false);
  });

  it.each(stocks)('%s is open during US session (Monday 15:00 UTC)', (sym) => {
    expect(isMarketOpen(sym, MON_2026_05_04_15_00_UTC)).toBe(true);
  });

  it.each(stocks)('%s is closed pre-market (Monday 03:00 UTC)', (sym) => {
    expect(isMarketOpen(sym, MON_2026_05_04_03_00_UTC)).toBe(false);
  });
});

describe('isMarketOpen — oil commodities (CFD/ETF)', () => {
  it('WTIUSD closed on Saturday', () => {
    expect(isMarketOpen('WTIUSD', SAT_2026_05_02_22_53_UTC)).toBe(false);
  });
  it('BNOUSD closed on Sunday', () => {
    expect(isMarketOpen('BNOUSD', SUN_2026_05_03_15_00_UTC)).toBe(false);
  });
  it('WTIUSD open Monday 15:00 UTC', () => {
    expect(isMarketOpen('WTIUSD', MON_2026_05_04_15_00_UTC)).toBe(true);
  });
});

describe('isMarketOpen — crypto stays 24/7', () => {
  const cryptos = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGEUSD', 'BNBUSD', 'XRPUSD'];
  it.each(cryptos)('%s open on Saturday night', (sym) => {
    expect(isMarketOpen(sym, SAT_2026_05_02_22_53_UTC)).toBe(true);
  });
  it.each(cryptos)('%s open on Sunday afternoon', (sym) => {
    expect(isMarketOpen(sym, SUN_2026_05_03_15_00_UTC)).toBe(true);
  });
});

describe('isMarketOpen — forex weekend rules unchanged', () => {
  it('EURUSD closed on Saturday', () => {
    expect(isMarketOpen('EURUSD', SAT_2026_05_02_22_53_UTC)).toBe(false);
  });
  it('EURUSD closed Sunday afternoon (before 22 UTC open)', () => {
    expect(isMarketOpen('EURUSD', SUN_2026_05_03_15_00_UTC)).toBe(false);
  });
  it('EURUSD open Sunday 23:00 UTC (after weekly open)', () => {
    expect(isMarketOpen('EURUSD', SUN_2026_05_03_23_00_UTC)).toBe(true);
  });
  it('EURUSD open Friday 19:00 UTC', () => {
    expect(isMarketOpen('EURUSD', FRI_2026_05_01_19_00_UTC)).toBe(true);
  });
});

describe('isMarketOpen — metals retain Mon-Fri 8-21 UTC window', () => {
  it('XAUUSD closed on Saturday', () => {
    expect(isMarketOpen('XAUUSD', SAT_2026_05_02_22_53_UTC)).toBe(false);
  });
  it('XAGUSD open Monday 15:00 UTC', () => {
    expect(isMarketOpen('XAGUSD', MON_2026_05_04_15_00_UTC)).toBe(true);
  });
});

describe('getMarketStatus messaging', () => {
  it('reports CLOSED for SPYUSD on Saturday', () => {
    expect(getMarketStatus('SPYUSD', SAT_2026_05_02_22_53_UTC)).toMatch(/CLOSED.*equities/i);
  });
  it('reports OPEN for BTCUSD on Saturday', () => {
    expect(getMarketStatus('BTCUSD', SAT_2026_05_02_22_53_UTC)).toBe('OPEN');
  });
});
