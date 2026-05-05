import { NextRequest } from 'next/server';
import type { AssetStats, LeaderboardData, SignalHistoryRecord } from '../../../../lib/signal-history';

jest.mock('../../../../lib/leaderboard-cache', () => ({
  getLeaderboard: jest.fn(),
}));

jest.mock('../../../../lib/signal-history-cache', () => ({
  getCachedHistory: jest.fn(),
}));

jest.mock('../../../../lib/signal-slice', () => ({
  parseScope: jest.fn((raw: string | null | undefined) => raw === 'free' ? 'free' : 'pro'),
  getResolvedSlice: jest.fn(),
}));

import { getLeaderboard } from '../../../../lib/leaderboard-cache';
import { getCachedHistory } from '../../../../lib/signal-history-cache';
import { GET } from '../route';

const mockedGetLeaderboard = getLeaderboard as jest.MockedFunction<typeof getLeaderboard>;
const mockedGetCachedHistory = getCachedHistory as jest.MockedFunction<typeof getCachedHistory>;

function asset(overrides: Partial<AssetStats>): AssetStats {
  return {
    pair: 'BTCUSD',
    totalSignals: 10,
    resolved4h: 5,
    resolved24h: 4,
    hits4h: 4,
    hits24h: 3,
    hitRate4h: 80,
    hitRate24h: 75,
    avgConfidence: 72,
    avgPnl: 0.3,
    totalPnl: 1.2,
    bestStreak: 2,
    worstStreak: -1,
    recentHits: [true, true, false],
    ...overrides,
  };
}

function leaderboard(assets: AssetStats[]): LeaderboardData {
  return {
    assets,
    overall: {
      totalSignals: 999,
      resolvedSignals: 999,
      overallHitRate4h: 1,
      overallHitRate24h: 1,
      totalPnl: 999,
      topPerformer: 'DOGEUSD',
      worstPerformer: 'DOGEUSD',
      lastUpdated: 1_717_000_000_000,
    },
  };
}

function makeReq(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

describe('GET /api/leaderboard category filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters assets and recomputes overall for majors', async () => {
    mockedGetLeaderboard.mockResolvedValueOnce(leaderboard([
      asset({ pair: 'BTCUSD', totalSignals: 10, resolved24h: 4, hits24h: 3, totalPnl: 1.2 }),
      asset({ pair: 'ETHUSD', totalSignals: 6, resolved24h: 3, hits24h: 2, totalPnl: 0.8, hitRate24h: 66.7 }),
      asset({ pair: 'DOGEUSD', totalSignals: 20, resolved24h: 10, hits24h: 1, totalPnl: -3.5, hitRate24h: 10 }),
    ]));

    const res = await GET(makeReq('/api/leaderboard?category=majors'));
    const body = await res.json();

    expect(body.assets.map((a: AssetStats) => a.pair).sort()).toEqual(['BTCUSD', 'ETHUSD']);
    expect(body.overall.totalSignals).toBe(16);
    expect(body.overall.resolvedSignals).toBe(7);
    expect(body.overall.overallHitRate24h).toBe(71.4);
    expect(body.overall.totalPnl).toBe(2);
    expect(body.overall.topPerformer).toBe('BTCUSD');
    expect(body.overall.worstPerformer).toBe('ETHUSD');
  });

  it('lets pair filter win over a conflicting category', async () => {
    mockedGetLeaderboard.mockResolvedValueOnce(leaderboard([
      asset({ pair: 'BTCUSD' }),
      asset({ pair: 'DOGEUSD', hitRate24h: 20 }),
    ]));
    mockedGetCachedHistory.mockResolvedValueOnce([
      { id: 'btc-1', pair: 'BTCUSD' },
      { id: 'doge-1', pair: 'DOGEUSD' },
    ] as SignalHistoryRecord[]);

    const res = await GET(makeReq('/api/leaderboard?pair=BTCUSD&category=thematic'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.asset.pair).toBe('BTCUSD');
    expect(body.records.map((r: SignalHistoryRecord) => r.pair)).toEqual(['BTCUSD']);
  });
});
