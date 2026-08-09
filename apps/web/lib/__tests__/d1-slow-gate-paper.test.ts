jest.mock('../candle-store', () => ({
  getCandlesSince: jest.fn(),
  refreshDailyCandles: jest.fn(),
}));

jest.mock('../signal-history', () => ({
  recordSignalsAsync: jest.fn(),
}));

jest.mock('@tradeclaw/strategies', () => {
  const actual = jest.requireActual('@tradeclaw/strategies');
  return { ...actual, runD1SlowGate: jest.fn() };
});

import {
  D1_SLOW_GATE_ID,
  D1_SLOW_GATE_PAPER_STRATEGY_ID,
  runD1SlowGate,
  type D1SlowGateRun,
} from '@tradeclaw/strategies';
import { getCandlesSince, refreshDailyCandles, type StoredCandle } from '../candle-store';
import { recordSignalsAsync } from '../signal-history';
import {
  D1_SLOW_GATE_PAPER_START_TS,
  resolveD1SlowGateLaneMode,
  runD1SlowGateLane,
} from '../d1-slow-gate-paper';

const mockedRun = runD1SlowGate as jest.MockedFunction<typeof runD1SlowGate>;
const mockedGetCandles = getCandlesSince as jest.MockedFunction<typeof getCandlesSince>;
const mockedRefresh = refreshDailyCandles as jest.MockedFunction<typeof refreshDailyCandles>;
const mockedRecord = recordSignalsAsync as jest.MockedFunction<typeof recordSignalsAsync>;

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 7, 8, 12);

function dailyBars(lastClosedOffsetDays = 0): StoredCandle[] {
  const latestOpen = Date.UTC(2026, 7, 7) - lastClosedOffsetDays * DAY_MS;
  const bars: StoredCandle[] = [];
  for (let ts = D1_SLOW_GATE_PAPER_START_TS; ts <= latestOpen; ts += DAY_MS) {
    bars.push({ timestamp: ts, open: 100, high: 102, low: 98, close: 101, volume: 10 });
  }
  return bars;
}

function runFor(
  bars: StoredCandle[],
  latest: boolean,
  frequencyCapPassed = true,
): D1SlowGateRun {
  const barIndex = latest ? bars.length - 1 : bars.length - 2;
  return {
    equity: bars.map(() => 1),
    exposure: bars.map(() => 0),
    transitions: [{
      barIndex,
      timestamp: bars[barIndex].timestamp,
      action: 'ENTER_LONG',
      direction: 'BUY',
      state: 'LONG',
      price: 101,
      confidence: 0.72,
      reason: 'd1-slow-gate-enter-long',
      ema200: 100,
      entryAtr: 1,
      atrMultiplier: 4.04,
      stopDistance: 4.04,
      stopLoss: 96.96,
      costR: 0.099,
    }],
    maxRollingDirectionChanges: frequencyCapPassed ? 20 : 31,
    frequencyCapPassed,
    terminalEquity: 1,
    totalCostPct: 0.2,
  };
}

beforeEach(() => {
  mockedRun.mockReset();
  mockedGetCandles.mockReset();
  mockedRefresh.mockReset().mockResolvedValue(1);
  mockedRecord.mockReset().mockResolvedValue(1);
});

describe('runD1SlowGateLane', () => {
  it('activates only for the exact explicit active value', () => {
    expect(resolveD1SlowGateLaneMode('active')).toBe('active');
    expect(resolveD1SlowGateLaneMode('paper')).toBe('paper');
    expect(resolveD1SlowGateLaneMode(undefined)).toBe('paper');
    expect(resolveD1SlowGateLaneMode('ACTIVE')).toBe('paper');
    expect(resolveD1SlowGateLaneMode('unexpected')).toBe('paper');
  });

  it('records only a newest-bar transition as an explicitly simulated deterministic row', async () => {
    const bars = dailyBars();
    mockedGetCandles.mockResolvedValue(bars);
    mockedRun
      .mockImplementationOnce(() => runFor(bars, true))
      .mockImplementationOnce(() => runFor(bars, false));

    const result = await runD1SlowGateLane({ now: NOW, mode: 'paper' });

    expect(result).toEqual({ mode: 'paper', processed: 2, candidates: 1, recorded: 1, failures: [] });
    expect(mockedRefresh).toHaveBeenCalledTimes(2);
    expect(mockedGetCandles).toHaveBeenCalledWith('BTCUSD', 'D1', D1_SLOW_GATE_PAPER_START_TS);
    expect(mockedRecord).toHaveBeenCalledTimes(1);
    expect(mockedRecord.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        id: `d1-slow-gate-paper:BTCUSD:ENTER_LONG:${bars.at(-1)!.timestamp}`,
        symbol: 'BTCUSD',
        timeframe: 'D1',
        direction: 'BUY',
        confidence: 72,
        entry: 101,
        timestamp: new Date(bars.at(-1)!.timestamp + DAY_MS).toISOString(),
        stopLoss: 96.96,
        entryAtr: 1,
        atrMultiplier: 4.04,
        strategyId: D1_SLOW_GATE_PAPER_STRATEGY_ID,
        isSimulated: true,
      }),
    ]);
  });

  it('promotes an explicitly active newest-bar transition into the real tracked strategy', async () => {
    const bars = dailyBars();
    mockedGetCandles.mockResolvedValue(bars);
    mockedRun
      .mockImplementationOnce(() => runFor(bars, true))
      .mockImplementationOnce(() => runFor(bars, false));

    const result = await runD1SlowGateLane({ now: NOW, mode: 'active' });

    expect(result).toEqual({ mode: 'active', processed: 2, candidates: 1, recorded: 1, failures: [] });
    expect(mockedRecord.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        id: `d1-slow-gate:BTCUSD:ENTER_LONG:${bars.at(-1)!.timestamp}`,
        strategyId: D1_SLOW_GATE_ID,
        isSimulated: false,
      }),
    ]);
  });

  it('fails closed when the latest closed D1 bar is stale', async () => {
    mockedGetCandles.mockResolvedValue(dailyBars(3));

    const result = await runD1SlowGateLane({ now: NOW, mode: 'paper' });

    expect(result.recorded).toBe(0);
    expect(result.failures).toHaveLength(2);
    expect(result.failures.every((failure) => failure.stage === 'data')).toBe(true);
    expect(result.failures.every((failure) => failure.error.includes('stale'))).toBe(true);
    expect(mockedRun).not.toHaveBeenCalled();
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('fails closed when the rolling direction-change ceiling is breached', async () => {
    const bars = dailyBars();
    mockedGetCandles.mockResolvedValue(bars);
    mockedRun.mockImplementation(() => runFor(bars, true, false));

    const result = await runD1SlowGateLane({ now: NOW, mode: 'paper' });

    expect(result.recorded).toBe(0);
    expect(result.failures).toHaveLength(2);
    expect(result.failures.every((failure) => failure.stage === 'frequency')).toBe(true);
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('isolates a refresh failure to the paper lane and the affected symbol', async () => {
    const bars = dailyBars();
    mockedRefresh
      .mockRejectedValueOnce(new Error('Binance unavailable'))
      .mockResolvedValueOnce(0);
    mockedGetCandles.mockResolvedValue(bars);
    mockedRun.mockImplementation(() => runFor(bars, false));

    const result = await runD1SlowGateLane({ now: NOW, mode: 'paper' });

    expect(result).toEqual({
      mode: 'paper',
      processed: 2,
      candidates: 0,
      recorded: 0,
      failures: [{ symbol: 'BTCUSD', stage: 'refresh', error: 'Binance unavailable' }],
    });
    expect(mockedGetCandles).toHaveBeenCalledTimes(1);
  });
});
