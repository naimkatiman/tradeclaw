import { createHash } from 'node:crypto';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakePublicPayload } from '../research-intake-public';

const OBSERVED_AT = '2026-08-29T18:00:40.000Z';
const DETERMINISTIC_AT = '2026-08-29T15:59:59.999Z';
const CANDIDATE_ID =
  'know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space';

interface ResultView {
  status: 'showing-results' | 'no-matches' | 'page-out-of-range';
  summary: string;
  range: {
    firstRecord: number;
    lastRecord: number;
    totalRecords: number;
  } | null;
  recoveryAction: {
    kind: 'clear-filters' | 'last-page';
    label: string;
    href: string;
  } | null;
}

function resultView(payload: unknown): ResultView | undefined {
  return (payload as { resultView?: ResultView }).resultView;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const serialized = JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(serialized, 'utf8'),
    sha256: createHash('sha256').update(serialized).digest('hex'),
  };
}

describe('protected research catalog result view', () => {
  it('authors the visible one-based result range for the default page', () => {
    const payload = buildResearchIntakeAdminPayload(new URLSearchParams(), OBSERVED_AT);

    expect(resultView(payload)).toEqual({
      status: 'showing-results',
      summary: 'Showing 1–25 of 61 candidates.',
      range: {
        firstRecord: 1,
        lastRecord: 25,
        totalRecords: 61,
      },
      recoveryAction: null,
    });
  });

  it('keeps the visible range aligned with filtering and pagination', () => {
    const payload = buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&page=2&limit=3'),
      OBSERVED_AT,
    );

    expect(resultView(payload)).toEqual({
      status: 'showing-results',
      summary: 'Showing 4–6 of 12 candidates.',
      range: {
        firstRecord: 4,
        lastRecord: 6,
        totalRecords: 12,
      },
      recoveryAction: null,
    });
  });

  it('distinguishes no filter matches and authors one clear-all recovery', () => {
    const payload = buildResearchIntakeAdminPayload(
      new URLSearchParams('q=no-such-research-candidate&page=99&limit=3'),
      OBSERVED_AT,
    );

    expect(resultView(payload)).toEqual({
      status: 'no-matches',
      summary: 'No candidates match the current filters.',
      range: null,
      recoveryAction: {
        kind: 'clear-filters',
        label: 'Clear all filters',
        href: '/api/admin/research-intake?page=1&limit=3',
      },
    });
  });

  it('distinguishes an out-of-range page and recovers to the actual last page', () => {
    const payload = buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&page=99&limit=3'),
      OBSERVED_AT,
    );

    expect(payload.pagination).toMatchObject({
      page: 99,
      totalRecords: 12,
      totalPages: 4,
      returnedRecords: 0,
      links: {
        self: '/api/admin/research-intake?assetClass=Equities&page=99&limit=3',
        previous: '/api/admin/research-intake?assetClass=Equities&page=98&limit=3',
        last: '/api/admin/research-intake?assetClass=Equities&page=4&limit=3',
      },
    });
    expect(resultView(payload)).toEqual({
      status: 'page-out-of-range',
      summary: 'Page 99 is outside the 4 available pages.',
      range: null,
      recoveryAction: {
        kind: 'last-page',
        label: 'Go to page 4',
        href: '/api/admin/research-intake?assetClass=Equities&page=4&limit=3',
      },
    });
  });

  it('serializes every result state and empty recovery payload deterministically', () => {
    const defaultCatalog = buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      DETERMINISTIC_AT,
    );
    const filteredCatalog = buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&page=2&limit=3'),
      DETERMINISTIC_AT,
    );
    const noMatchesCatalog = buildResearchIntakeAdminPayload(
      new URLSearchParams('q=no-such-research-candidate&page=99&limit=3'),
      DETERMINISTIC_AT,
    );
    const outOfRangeCatalog = buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&page=99&limit=3'),
      DETERMINISTIC_AT,
    );

    expect({
      defaultResultView: fingerprint(defaultCatalog.resultView),
      filteredResultView: fingerprint(filteredCatalog.resultView),
      noMatchesResultView: fingerprint(noMatchesCatalog.resultView),
      outOfRangeResultView: fingerprint(outOfRangeCatalog.resultView),
      noMatchesCatalog: fingerprint(noMatchesCatalog),
      outOfRangeCatalog: fingerprint(outOfRangeCatalog),
    }).toEqual({
      defaultResultView: {
        bytes: 155,
        sha256: '48406d23c822cfad6d5cb8e5d731e646fad84e911b93c8d943d18b28cdaa5f6e',
      },
      filteredResultView: {
        bytes: 153,
        sha256: '4f051a3fbc04565de8ff34e5b2ca77c9e337ad5ea8ee05ff8c234e2078c7350c',
      },
      noMatchesResultView: {
        bytes: 210,
        sha256: 'cbbb5ea966eb8e72219805139fac8be023518ab0391484ff687585c40c529fc1',
      },
      outOfRangeResultView: {
        bytes: 229,
        sha256: '8b6a57c2f009b530e4837352e72f51caca318a486890ca5bbc951adcf5ad1d07',
      },
      noMatchesCatalog: {
        bytes: 25_662,
        sha256: '7e0d3a5adc36b4c22d55f0a4ac0ac20ed4a0bed408640621c6138f9075d19af9',
      },
      outOfRangeCatalog: {
        bytes: 25_254,
        sha256: 'd9307b3408599d342ad19992c2dfbac2c70d5f525e5cefa13bea1a3e2d581c15',
      },
    });
  });

  it('keeps result interpretation protected-catalog-only', () => {
    const candidate = buildResearchIntakeAdminCandidatePayload(CANDIDATE_ID, OBSERVED_AT);
    if (!candidate) throw new Error('TC-261 admin candidate fixture is missing');

    for (const payload of [
      candidate,
      buildResearchIntakeAdminEvidencePayload(OBSERVED_AT),
      buildResearchIntakeAdminReviewPayload(OBSERVED_AT),
      buildResearchIntakePublicPayload(),
    ]) {
      expect(payload).not.toHaveProperty('resultView');
    }
  });
});
