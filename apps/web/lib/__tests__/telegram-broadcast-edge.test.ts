jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('../signals-live', () => ({ readLiveSignals: jest.fn() }));
jest.mock('../tracked-signals', () => ({ getTrackedSignals: jest.fn() }));
jest.mock('../regime-resolution', () => ({ fetchResolvedRegimeMap: jest.fn() }));
jest.mock('../regime-filter', () => ({ filterSignalsByRegime: jest.fn((signals) => signals) }));
jest.mock('../signal-history', () => ({ markTelegramPosted: jest.fn() }));
jest.mock('../risk-pipeline', () => ({ runRiskPipeline: jest.fn() }));
jest.mock('../cost-adjusted-edge-gate', () => ({
  evaluateCostAdjustedEdge: jest.fn(),
  getStrictlyApprovedSignalIds: jest.fn(),
}));

import { readLiveSignals } from '../signals-live';
import { getTrackedSignals } from '../tracked-signals';
import {
  evaluateCostAdjustedEdge,
  getStrictlyApprovedSignalIds,
} from '../cost-adjusted-edge-gate';
import { broadcastTopSignals } from '../telegram-broadcast';

const mockedEdge = evaluateCostAdjustedEdge as jest.MockedFunction<typeof evaluateCostAdjustedEdge>;
const mockedApprovals = getStrictlyApprovedSignalIds as jest.MockedFunction<typeof getStrictlyApprovedSignalIds>;
const mockedReadLive = readLiveSignals as jest.MockedFunction<typeof readLiveSignals>;
const mockedTracked = getTrackedSignals as jest.MockedFunction<typeof getTrackedSignals>;

describe('broadcastTopSignals cost-adjusted safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks before reading or sending signals when aggregate evidence is denied', async () => {
    mockedEdge.mockResolvedValueOnce({
      allowed: false,
      reason: 'negative',
    } as never);
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await broadcastTopSignals('channel', 'token', { freeOnly: true });

    expect(result).toEqual({
      success: false,
      error: 'Cost-adjusted edge gate blocked broadcast: negative',
      signalCount: 0,
    });
    expect(mockedReadLive).not.toHaveBeenCalled();
    expect(mockedTracked).not.toHaveBeenCalled();
    expect(mockedApprovals).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
