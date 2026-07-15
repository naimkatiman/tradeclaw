jest.mock('../research-jobs', () => ({
  MAX_RESEARCH_JOB_ATTEMPTS: 4,
  markResearchJobFailed: jest.fn(),
  markResearchJobRetry: jest.fn(),
  updateJobStatus: jest.fn(),
}));

import {
  runResearchPipeline,
  validateTradingAgentsRunResult,
} from '../mock-pipeline';
import { updateJobStatus } from '../research-jobs';

const mockedUpdateJobStatus = updateJobStatus as jest.MockedFunction<typeof updateJobStatus>;
const originalDisableBridge = process.env.TRADING_AGENTS_DISABLE_BRIDGE;

describe('TradingAgents research integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpdateJobStatus.mockResolvedValue();
  });

  afterAll(() => {
    if (originalDisableBridge === undefined) {
      delete process.env.TRADING_AGENTS_DISABLE_BRIDGE;
    } else {
      process.env.TRADING_AGENTS_DISABLE_BRIDGE = originalDisableBridge;
    }
  });

  it('accepts complete, sourced bridge output', () => {
    expect(() => validateTradingAgentsRunResult({
      request: { symbol: 'BTCUSD', tradeDate: '2026-07-15' },
      analyst: {
        summary: 'Observed market structure.',
        bullishFactors: ['Factor A'],
        bearishFactors: [],
        confidence: 61,
        sources: ['https://example.test/source'],
      },
      risk: {
        summary: 'Risk remains elevated.',
        veto: false,
        risks: ['Volatility'],
        maxPositionSizePct: 0.5,
      },
      portfolioManager: {
        recommendation: 'HOLD',
        rationale: 'Wait for additional evidence.',
        positionSizingPct: 0,
      },
    })).not.toThrow();
  });

  it.each([
    [null, /not a JSON object/i],
    [{ analyst: { summary: 'x', bullishFactors: [], bearishFactors: [], confidence: 50, sources: [] } }, /analyst\.sources/i],
    [{ analyst: { summary: 'x', bullishFactors: [], bearishFactors: [], confidence: 50, sources: ['Provider name only'] } }, /non-reconstructable analyst\.sources/i],
    [{ risk: { summary: 'x', veto: 'no', risks: [] } }, /risk\.veto/i],
    [{ portfolioManager: { recommendation: 'BUY', rationale: '' } }, /portfolioManager\.rationale/i],
  ])('rejects malformed or incomplete output %#', (output, expected) => {
    expect(() => validateTradingAgentsRunResult(output)).toThrow(expected);
  });

  it('marks the job failed instead of generating local fallback research', async () => {
    process.env.TRADING_AGENTS_DISABLE_BRIDGE = '1';

    await expect(runResearchPipeline('job-1', 'BTCUSD', 'H1')).rejects.toThrow(
      /bridge is disabled; no fallback research is generated/i,
    );

    expect(mockedUpdateJobStatus).toHaveBeenCalledTimes(1);
    expect(mockedUpdateJobStatus).toHaveBeenCalledWith(
      'job-1',
      'failed',
      undefined,
      undefined,
      undefined,
    );
  });
});
