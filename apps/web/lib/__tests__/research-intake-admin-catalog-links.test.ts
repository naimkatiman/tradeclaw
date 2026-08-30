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
const TC261_CANDIDATE_ID =
  'know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space';

interface CandidateLinks {
  adminCandidate: string;
  publicCandidate: string;
}

interface CatalogRecordWithLinks {
  id: string;
  sourcePosition: number;
  links?: CandidateLinks;
}

function records(payload: unknown): CatalogRecordWithLinks[] {
  return (payload as { records: CatalogRecordWithLinks[] }).records;
}

function expectedLinks(candidateId: string): CandidateLinks {
  const encodedCandidateId = encodeURIComponent(candidateId);
  return {
    adminCandidate: `/api/admin/research-intake/${encodedCandidateId}`,
    publicCandidate: `/api/research/intake/${encodedCandidateId}`,
  };
}

describe('protected research catalog record links', () => {
  it('gives every default-page record exact protected and public detail links', () => {
    const catalogRecords = records(buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      OBSERVED_AT,
    ));

    expect(catalogRecords).toHaveLength(25);
    expect(catalogRecords[0]).toMatchObject({
      id: 'a-study-of-differences-in-returns-between-large-and-small-companies-in-europe',
      sourcePosition: 0,
      links: expectedLinks(
        'a-study-of-differences-in-returns-between-large-and-small-companies-in-europe',
      ),
    });
    expect(catalogRecords.at(-1)).toMatchObject({
      sourcePosition: 24,
      links: expectedLinks(catalogRecords.at(-1)?.id ?? ''),
    });
    expect(catalogRecords.every((record) => (
      JSON.stringify(record.links) === JSON.stringify(expectedLinks(record.id))
    ))).toBe(true);
  });

  it('keeps record links aligned after filtering and pagination', () => {
    const catalogRecords = records(buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&page=2&limit=3'),
      OBSERVED_AT,
    ));

    expect(catalogRecords).toHaveLength(3);
    expect(catalogRecords.map(({ id, links }) => ({ id, links }))).toEqual(
      catalogRecords.map(({ id }) => ({ id, links: expectedLinks(id) })),
    );
  });

  it('authors query-independent detail links from encoded canonical IDs', () => {
    const catalogRecords = records(buildResearchIntakeAdminPayload(
      new URLSearchParams(
        'q=bitcoin&assetClass=Cryptocurrencies&stage=replicated&verdict=fail&page=1&limit=1',
      ),
      OBSERVED_AT,
    ));

    expect(catalogRecords).toHaveLength(1);
    expect(catalogRecords[0].links).toEqual(expectedLinks(catalogRecords[0].id));
    const serializedLinks = JSON.stringify(catalogRecords[0].links);
    expect(serializedLinks).not.toContain('?');
    expect(serializedLinks).not.toMatch(
      /(?:q|assetClass|stage|verdict|sourceAuditDisposition|page|limit)=/,
    );
  });

  it('serializes default, complete, and filtered record-link projections deterministically', () => {
    const defaultLinks = JSON.stringify(records(buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      DETERMINISTIC_AT,
    )).map(({ id, links }) => ({ id, links })));
    const completeLinks = JSON.stringify(records(buildResearchIntakeAdminPayload(
      new URLSearchParams('limit=100'),
      DETERMINISTIC_AT,
    )).map(({ id, links }) => ({ id, links })));
    const filteredLinks = JSON.stringify(records(buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&page=2&limit=3'),
      DETERMINISTIC_AT,
    )).map(({ id, links }) => ({ id, links })));

    expect(Buffer.byteLength(defaultLinks, 'utf8')).toBe(7_361);
    expect(createHash('sha256').update(defaultLinks).digest('hex')).toBe(
      '7a09efc5ac17cdf2fb386f5d3a908273b91c83f40a86505dd4c423e01c9800b6',
    );
    expect(Buffer.byteLength(completeLinks, 'utf8')).toBe(18_527);
    expect(createHash('sha256').update(completeLinks).digest('hex')).toBe(
      '0423769d0e57426d1ff6ebe5e7a64d515f057429bb75a74ede852395bea2ca72',
    );
    expect(Buffer.byteLength(filteredLinks, 'utf8')).toBe(901);
    expect(createHash('sha256').update(filteredLinks).digest('hex')).toBe(
      'c72e01661d06584ead6ef1c198655b028cb2f6c4596967c03a9f22721b45ed39',
    );
  });

  it('keeps protected links catalog-only while public rows get only public detail links', () => {
    const candidate = buildResearchIntakeAdminCandidatePayload(
      TC261_CANDIDATE_ID,
      OBSERVED_AT,
    );
    if (!candidate) throw new Error('TC-261 admin candidate fixture is missing');
    const evidence = buildResearchIntakeAdminEvidencePayload(OBSERVED_AT);
    const review = buildResearchIntakeAdminReviewPayload(OBSERVED_AT);
    const publicCatalog = buildResearchIntakePublicPayload();

    expect(candidate.record).not.toHaveProperty('links');
    expect(evidence.items[0].record).not.toHaveProperty('links');
    expect(evidence.items[0].links).toEqual(expectedLinks(evidence.items[0].record.id));
    expect(review.queue.items[0].candidate).not.toHaveProperty('links');
    expect(review.queue.items[0].links).toEqual({
      ...expectedLinks(review.queue.items[0].candidate.id),
      reviewItem: '/api/admin/research-intake/review/TC-255',
      reviewPacket: '/api/admin/research-intake/review/TC-255/packet.md',
    });
    expect(publicCatalog.records.every((record) => (
      JSON.stringify(record.links) === JSON.stringify({
        candidate: `/api/research/intake/${encodeURIComponent(record.id)}`,
      })
    ))).toBe(true);
    expect(JSON.stringify(publicCatalog.records.map((record) => record.links))).not.toContain(
      '/api/admin/research-intake',
    );
  });
});
