jest.mock('../cost-adjusted-edge-gate', () => ({
  evaluateCostAdjustedEdge: jest.fn(),
  getStrictlyApprovedSignalIds: jest.fn(),
}));

import {
  evaluateCostAdjustedEdge,
  getStrictlyApprovedSignalIds,
} from '../cost-adjusted-edge-gate';
import { evaluateEntryFanoutGate } from '../entry-fanout-gate';

const mockEvaluateEdge = evaluateCostAdjustedEdge as jest.MockedFunction<
  typeof evaluateCostAdjustedEdge
>;
const mockApprovedIds = getStrictlyApprovedSignalIds as jest.MockedFunction<
  typeof getStrictlyApprovedSignalIds
>;

const READY_EDGE = {
  allowed: true,
  reason: 'ready',
  usableCount: 140,
  activeDays: 45,
  coverage: 0.96,
  perSignalMeanNetR: 0.12,
  equalDayLowerBoundNetR: 0.03,
} as const;

describe('evaluateEntryFanoutGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateEdge.mockResolvedValue(READY_EDGE as never);
    mockApprovedIds.mockResolvedValue(new Set(['sig-approved']));
  });

  it('fails closed on aggregate evidence before checking the candidate', async () => {
    mockEvaluateEdge.mockResolvedValueOnce({
      ...READY_EDGE,
      allowed: false,
      reason: 'negative',
      perSignalMeanNetR: -0.2,
    } as never);

    const verdict = await evaluateEntryFanoutGate({
      symbol: 'XAUUSD',
      signalId: 'sig-approved',
    });

    expect(verdict).toEqual(expect.objectContaining({
      allowed: false,
      reason: 'cost_adjusted_edge:negative',
    }));
    expect(mockEvaluateEdge).toHaveBeenCalledWith({ symbols: ['XAUUSD'] });
    expect(mockApprovedIds).not.toHaveBeenCalled();
  });

  it('denies an entry without a persisted signal id', async () => {
    const verdict = await evaluateEntryFanoutGate({ symbol: 'BTCUSD' });

    expect(verdict.reason).toBe('signal_approval:missing');
    expect(verdict.allowed).toBe(false);
    expect(mockApprovedIds).not.toHaveBeenCalled();
  });

  it('denies a candidate without explicit persisted approval', async () => {
    mockApprovedIds.mockResolvedValueOnce(new Set());

    const verdict = await evaluateEntryFanoutGate({
      symbol: 'BTCUSD',
      signalId: 'sig-denied',
    });

    expect(verdict.reason).toBe('signal_approval:denied');
    expect(verdict.allowed).toBe(false);
    expect(mockApprovedIds).toHaveBeenCalledWith(['sig-denied']);
  });

  it('allows only a candidate approved by both checks', async () => {
    const verdict = await evaluateEntryFanoutGate({
      symbol: 'BTCUSD',
      signalId: 'sig-approved',
    });

    expect(verdict).toEqual(expect.objectContaining({
      allowed: true,
      reason: 'cost_adjusted_edge:ready',
    }));
  });
});
