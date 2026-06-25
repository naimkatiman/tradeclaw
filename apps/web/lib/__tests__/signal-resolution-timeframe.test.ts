import { getOutcomeResolutionTimeframe } from '../signal-history';

describe('getOutcomeResolutionTimeframe', () => {
  it.each(['M5', 'M15', 'H1', 'H4', 'D1'] as const)('keeps supported timeframe %s', (timeframe) => {
    expect(getOutcomeResolutionTimeframe({ timeframe, mode: 'swing' })).toBe(timeframe);
  });

  it('falls back to H1 for legacy or malformed rows', () => {
    expect(getOutcomeResolutionTimeframe({ timeframe: '??', mode: 'scalp' })).toBe('H1');
    expect(getOutcomeResolutionTimeframe({ timeframe: '', mode: 'swing' })).toBe('H1');
  });
});
