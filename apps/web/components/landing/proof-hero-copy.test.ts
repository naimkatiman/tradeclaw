import { getProofHeadline, type ProofLedgerState } from './proof-hero-copy';

describe('getProofHeadline', () => {
  test('states a loss only when this environment has a negative result', () => {
    expect(getProofHeadline('negative')).toEqual({
      outcome: 'Ours lost after costs.',
      direction: 'down',
    });

    const otherStates: ProofLedgerState[] = [
      'nonnegative',
      'indeterminate',
      'empty',
      'unavailable',
    ];
    for (const state of otherStates) {
      expect(getProofHeadline(state).outcome).not.toMatch(/lost|failed/i);
    }
  });

  test('describes a non-negative result without borrowing the public loss', () => {
    expect(getProofHeadline('nonnegative')).toEqual({
      outcome: 'Ours held up after costs.',
      direction: 'up',
    });
  });
});
