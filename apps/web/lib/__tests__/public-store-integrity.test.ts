jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

import fs from 'fs';
import { readKeys } from '../api-keys';
import { getPledges } from '../pledges';
import { getAlerts, getAlertStats, saveAlert } from '../tradingview-alerts';
import { getVoteStats, getVotes } from '../votes';

const mockedWrite = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;

describe('public file-backed stores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fabricate API keys or TradingView alerts when files are missing', () => {
    expect(readKeys()).toEqual([]);
    expect(getPledges()).toEqual([]);
    expect(getAlerts()).toEqual([]);
    expect(getAlertStats()).toEqual({ total: 0, last24h: 0, byPair: {} });
    expect(Object.values(getVotes().pairs)).toEqual(
      expect.arrayContaining([{ BUY: 0, SELL: 0, HOLD: 0 }]),
    );
    expect(getVoteStats()).toMatchObject({
      totalVotes: 0,
      mostBullishPair: null,
      mostBearishPair: null,
      bullishSubmissionPct: null,
    });
  });

  it('writes only the first received TradingView alert to an empty store', () => {
    const alert = saveAlert({
      symbol: 'BTCUSDT',
      action: 'test',
      message: 'Connectivity test',
    });

    expect(mockedWrite).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(String(mockedWrite.mock.calls[0][1]));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: alert.id,
      symbol: 'BTCUSDT',
      action: 'test',
      message: 'Connectivity test',
    });
  });
});
