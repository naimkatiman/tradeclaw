export type ProofLedgerState =
  | 'negative'
  | 'nonnegative'
  | 'indeterminate'
  | 'empty'
  | 'unavailable';

interface ProofHeadline {
  outcome: string;
  direction: 'down' | 'up' | 'neutral';
}

/**
 * The headline follows the current environment's evidence. Self-hosted
 * instances must never inherit tradeclaw.win's negative finding as though it
 * were their own result.
 */
export function getProofHeadline(state: ProofLedgerState): ProofHeadline {
  switch (state) {
    case 'negative':
      return { outcome: 'Our average trade lost after costs.', direction: 'down' };
    case 'nonnegative':
      return { outcome: 'Our average trade held up after costs.', direction: 'up' };
    case 'indeterminate':
      return { outcome: 'The result is still open.', direction: 'neutral' };
    case 'empty':
      return { outcome: 'Ready for an honest test.', direction: 'neutral' };
    case 'unavailable':
      return { outcome: 'Evidence over promises.', direction: 'neutral' };
  }
}
