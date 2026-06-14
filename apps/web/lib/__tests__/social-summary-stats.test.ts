jest.mock('../signal-history-cache', () => ({
  getCachedHistory: jest.fn(),
}));

import { getSocialSummaryStats } from '../social-summary-stats';
import { isCountedResolved, type SignalHistoryRecord } from '../signal-history';
import { getCachedHistory } from '../signal-history-cache';

const mockedHistory = getCachedHistory as jest.MockedFunction<typeof getCachedHistory>;

const DAY = 86_400_000;
const ANCHOR = '2026-06-14';
const ANCHOR_MS = Date.parse(`${ANCHOR}T00:00:00.000Z`);

function mkRecord(
  id: string,
  opts: {
    pair?: string;
    hit?: boolean;
    pnlPct?: number;
    target?: 'TP1' | 'SL' | 'expired';
    gateBlocked?: boolean;
    isSimulated?: boolean;
    /** Whole-day offset from the anchor midnight (0 = anchor day, -1 = day before). */
    dayOffset?: number;
  },
): SignalHistoryRecord {
  // Place each record at noon of its target day so it sits unambiguously
  // inside that UTC calendar day regardless of window edges.
  const timestamp = ANCHOR_MS + (opts.dayOffset ?? 0) * DAY + DAY / 2;
  return {
    id,
    pair: opts.pair ?? 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 80,
    entryPrice: 50000,
    timestamp,
    tp1: 51000,
    sl: 49500,
    isSimulated: opts.isSimulated ?? false,
    gateBlocked: opts.gateBlocked ?? false,
    outcomes: {
      '4h': null,
      '24h': {
        price: 51000,
        pnlPct: opts.pnlPct ?? (opts.hit ? 2.0 : -1.0),
        hit: opts.hit ?? false,
        target: opts.target ?? (opts.hit ? 'TP1' : 'SL'),
      },
    },
  };
}

beforeEach(() => {
  mockedHistory.mockReset();
});

describe('getSocialSummaryStats — public social/OG denominator parity', () => {
  it('uses the canonical isCountedResolved denominator: excludes expired, gate-blocked, and simulated rows', async () => {
    const rows = [
      mkRecord('win', { hit: true, dayOffset: 0 }),
      mkRecord('loss', { hit: false, dayOffset: 0 }),
      // Auto-expire placeholder — /track-record drops it, so the card must too.
      mkRecord('expired', { hit: false, pnlPct: 0, target: 'expired', dayOffset: 0 }),
      // Gate-blocked: engine refused the trade; not a real outcome.
      mkRecord('blocked', { hit: true, gateBlocked: true, dayOffset: 0 }),
      // Simulated: never counts.
      mkRecord('sim', { hit: true, isSimulated: true, dayOffset: 0 }),
    ];
    mockedHistory.mockResolvedValue(rows);

    const s = await getSocialSummaryStats('daily', ANCHOR);

    // The win-rate denominator must equal what isCountedResolved keeps (2), not
    // the pre-sweep `outcome_24h IS NOT NULL` count (5).
    expect(rows.filter(isCountedResolved).length).toBe(2);
    expect(s.total).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.winRatePct).toBe(50);
    expect(s.totalPnlPct).toBe(1); // +2.0 win + -1.0 loss
  });

  it('daily window counts only the anchor day', async () => {
    mockedHistory.mockResolvedValue([
      mkRecord('today', { hit: true, dayOffset: 0 }),
      mkRecord('yesterday', { hit: true, dayOffset: -1 }),
      mkRecord('tomorrow', { hit: true, dayOffset: 1 }),
    ]);

    const s = await getSocialSummaryStats('daily', ANCHOR);

    expect(s.total).toBe(1);
    expect(s.wins).toBe(1);
  });

  it('weekly window spans [date-7d, date+1d): includes 7 days back, excludes the 8th', async () => {
    mockedHistory.mockResolvedValue([
      mkRecord('d0', { hit: true, dayOffset: 0 }),
      mkRecord('d-7', { hit: false, dayOffset: -7 }), // included (window start)
      mkRecord('d-8', { hit: true, dayOffset: -8 }), // excluded (before window)
    ]);

    const s = await getSocialSummaryStats('weekly', ANCHOR);

    expect(s.total).toBe(2); // d0 + d-7
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
  });

  it('reports best / worst symbol by summed resolved P&L over the window', async () => {
    mockedHistory.mockResolvedValue([
      mkRecord('btc1', { pair: 'BTCUSD', hit: true, pnlPct: 3, dayOffset: 0 }),
      mkRecord('btc2', { pair: 'BTCUSD', hit: true, pnlPct: 2, dayOffset: 0 }),
      mkRecord('eth1', { pair: 'ETHUSD', hit: false, pnlPct: -3, dayOffset: 0 }),
    ]);

    const s = await getSocialSummaryStats('daily', ANCHOR);

    expect(s.bestSymbol).toBe('BTCUSD');
    expect(s.bestPnlPct).toBe(5);
    expect(s.worstSymbol).toBe('ETHUSD');
    expect(s.worstPnlPct).toBe(-3);
  });

  it('degrades to zeros / nulls on an empty window without dividing by zero', async () => {
    mockedHistory.mockResolvedValue([mkRecord('old', { hit: true, dayOffset: -30 })]);

    const s = await getSocialSummaryStats('daily', ANCHOR);

    expect(s.total).toBe(0);
    expect(s.wins).toBe(0);
    expect(s.winRatePct).toBe(0);
    expect(s.totalPnlPct).toBe(0);
    expect(s.bestSymbol).toBeNull();
    expect(s.worstSymbol).toBeNull();
  });

  it('falls back to today when the date string is unparseable (OG query param guard)', async () => {
    mockedHistory.mockResolvedValue([]);
    // Must not throw on bad input from the public query string.
    await expect(getSocialSummaryStats('daily', 'not-a-date')).resolves.toMatchObject({
      total: 0,
      winRatePct: 0,
    });
  });
});
