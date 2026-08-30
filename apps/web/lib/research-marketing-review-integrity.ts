import type { ResearchLoopMarketingTaskId } from './research-loop-marketing';

export type ResearchMarketingReviewEvidenceRole =
  | 'preregistration'
  | 'result'
  | 'artifact';

export interface ResearchMarketingReviewEvidenceFileFingerprint {
  role: ResearchMarketingReviewEvidenceRole;
  path: string;
  normalizedBytes: number;
  sha256: string;
}

export interface ResearchMarketingReviewEvidenceIntegrity {
  schemaVersion: 1;
  status: 'repository-evidence-pinned';
  algorithm: 'sha256';
  normalization: 'utf8-lf';
  manifestCanonicalization:
    'role-tab-path-tab-normalizedBytes-tab-sha256-lf-v1';
  manifestSha256: string;
  files: readonly ResearchMarketingReviewEvidenceFileFingerprint[];
}

function fingerprint(
  role: ResearchMarketingReviewEvidenceRole,
  path: string,
  normalizedBytes: number,
  sha256: string,
): ResearchMarketingReviewEvidenceFileFingerprint {
  return Object.freeze({ role, path, normalizedBytes, sha256 });
}

function integrity(
  manifestSha256: string,
  files: readonly ResearchMarketingReviewEvidenceFileFingerprint[],
): ResearchMarketingReviewEvidenceIntegrity {
  return Object.freeze({
    schemaVersion: 1,
    status: 'repository-evidence-pinned',
    algorithm: 'sha256',
    normalization: 'utf8-lf',
    manifestCanonicalization:
      'role-tab-path-tab-normalizedBytes-tab-sha256-lf-v1',
    manifestSha256,
    files: Object.freeze(files),
  });
}

const RESEARCH_MARKETING_REVIEW_EVIDENCE_INTEGRITY = Object.freeze({
  'TC-255': integrity(
    'baa1778585d32bd9a5b99f2dc7a7157d8b29f32f7046b5c83610e4b051c170a8',
    [
      fingerprint(
        'preregistration',
        'docs/plans/2026-08-29-external-multi-timeframe-replication.md',
        8_176,
        '8679c1aa033b5e52f1cc6c9097ed14d34aa101a6fd592188d8edb20f8a23cb8f',
      ),
      fingerprint(
        'result',
        'docs/research/2026-08-29-external-multi-timeframe-replication-result.md',
        5_942,
        '843efae10645f32650939dc2a9ece26d0a461e6265e98fbcc394caa280389847',
      ),
      fingerprint(
        'artifact',
        'docs/research/experiments/external-multi-timeframe-BTCUSD_ETHUSD-H1-D1-2018-12-01-2026-07-17-f4.json',
        93_077,
        '762bb52991db266f79b08a104c811b7309668bf3f12b96f70f0fa15bd67f2c53',
      ),
    ],
  ),
  'TC-257': integrity(
    'e1de6d592c497ccbe0b7dcc2cdf7ff63d398d8f79a2a24bedaa3c5a60a31c642',
    [
      fingerprint(
        'preregistration',
        'docs/plans/2026-08-29-end-of-month-treasury-replication.md',
        12_968,
        '4e3d9ed5392aa9cbe8eed9865483f583a31336c6cc770e9773230f4fe829b3de',
      ),
      fingerprint(
        'result',
        'docs/research/2026-08-29-end-of-month-treasury-replication-result.md',
        4_891,
        '1d38f9ded9eddc995514a3e09c03da418f62b60956fb968f37ed0b5c379d5f6b',
      ),
      fingerprint(
        'artifact',
        'docs/research/experiments/end-of-month-treasury-US-NOMINAL-DTWEXBGS-1990-01-2026-07-f4.json',
        4_540,
        'f8707913da4714c967d58f0fd2630c5f2316d6c5ede53507340ad54f35af36cf',
      ),
    ],
  ),
  'TC-258': integrity(
    'f5c1807e044af3370e267391d77224190b1d2bf93f8f99ba6b55751e3cce9c0b',
    [
      fingerprint(
        'preregistration',
        'docs/plans/2026-08-29-bitcoin-max-min-replication.md',
        9_409,
        '52b16a106559213c3fd42d42b25fd552dbab19bc250a61922ce7fb7fcc0f8e8a',
      ),
      fingerprint(
        'result',
        'docs/research/2026-08-29-bitcoin-max-min-replication-result.md',
        8_648,
        'f231a521dc677082804561fe70ca98b453571f4cd78bdeacf7d6cbf49b33e07e',
      ),
      fingerprint(
        'artifact',
        'docs/research/experiments/bitcoin-max-min-BTCUSD_ETHUSD-D1-2015-11-26-2026-07-31-f4.json',
        665_712,
        '90778b74e93028278d434ea6269db9aa0bd960962413c99e9d8c3f58eba022dc',
      ),
    ],
  ),
  'TC-259': integrity(
    '7608fc20c7d49978875e6ae85caef7c7f6a569e7ca1026add84796a5a89f704d',
    [
      fingerprint(
        'preregistration',
        'docs/plans/2026-08-29-trading-term-premium-replication.md',
        12_757,
        '74b138499e36ea55f03490069a3c3f3823e458997c4cb00daf82903bd3f6387b',
      ),
      fingerprint(
        'result',
        'docs/research/2026-08-29-trading-term-premium-replication-result.md',
        9_438,
        'f1f9281a100a21a3a5988eb8c6896dd2e157554e1b7c1bf9b4b2c33942176d6e',
      ),
      fingerprint(
        'artifact',
        'docs/research/experiments/trading-term-premium-US-NOMINAL-MA40-1968-01-2026-07-f4.json',
        966_688,
        'e30db6b2cbd9f7e9865c0c6c65699c6f2dd2a772f43e449ff63e9120ee6fb18e',
      ),
    ],
  ),
} satisfies Record<
  ResearchLoopMarketingTaskId,
  ResearchMarketingReviewEvidenceIntegrity
>);

export function getResearchMarketingReviewEvidenceIntegrity(
  taskId: ResearchLoopMarketingTaskId,
): ResearchMarketingReviewEvidenceIntegrity {
  return RESEARCH_MARKETING_REVIEW_EVIDENCE_INTEGRITY[taskId];
}
