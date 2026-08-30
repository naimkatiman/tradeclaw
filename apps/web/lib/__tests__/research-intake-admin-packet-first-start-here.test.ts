import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidenceIndexPayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewItemPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicOverviewPayload,
} from '../research-intake-public';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';
import { buildResearchMarketingReviewPacket } from '../research-marketing-review-packet';

const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const CONFLICT_AT = '2026-08-29T08:29:58.000Z';
const AWAITING_AT = '2026-08-29T18:00:39.999Z';
const TC260 = 'a-risk-based-approach-to-tactical-asset-allocation';
const REPO_ROOT = resolve(__dirname, '../../../..');

function fingerprint(body: string): { bytes: number; sha256: string } {
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('protected packet-first startHere action', () => {
  it('targets the exact oldest-visible Markdown packet from all seven protected JSON projections', () => {
    const candidate = buildResearchIntakeAdminCandidatePayload(TC260, AUDIT_AT);
    const exact = buildResearchIntakeAdminReviewItemPayload('TC-255', AUDIT_AT);
    if (!candidate || !exact) throw new Error('Protected packet-first fixtures are missing');

    const payloads = [
      buildResearchIntakeAdminOverviewPayload(AUDIT_AT),
      buildResearchIntakeAdminPayload(new URLSearchParams(), AUDIT_AT),
      candidate,
      buildResearchIntakeAdminEvidenceIndexPayload(AUDIT_AT),
      buildResearchIntakeAdminEvidencePayload(AUDIT_AT),
      buildResearchIntakeAdminReviewPayload(AUDIT_AT),
      exact,
    ];

    for (const payload of payloads) {
      expect(payload.startHere).toEqual({
        audience: 'admin',
        kind: 'review-marketing-drafts',
        label:
          'Review next draft packet: A high-turnover Bitcoin trend idea failed after realistic costs',
        reason:
          'The oldest visible human-review handoff is first in an observation-consistent queue of 4 drafts with 0 publication approvals. Open its protected Markdown packet; review remains manual and this guidance creates no approval.',
        href: '/api/admin/research-intake/review/TC-255/packet.md',
        targetResource: 'marketing-review-packet',
        targetIsCurrentResource: false,
        itemCount: 4,
        automaticAction: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      });
    }

    expect(exact.reviewItem.links).toMatchObject({
      reviewItem: '/api/admin/research-intake/review/TC-255',
      reviewPacket: '/api/admin/research-intake/review/TC-255/packet.md',
    });
  });

  it('preserves conflict and awaiting-receipt priority over the existing draft queue', () => {
    const conflict = buildResearchIntakeAdminOverviewPayload(CONFLICT_AT);
    const awaiting = buildResearchIntakeAdminOverviewPayload(AWAITING_AT);

    expect(conflict.marketingReview.summary.availableDrafts).toBeGreaterThan(0);
    expect(conflict.startHere).toMatchObject({
      kind: 'resolve-receipt-conflict',
      href: '/api/admin/research-intake',
      targetResource: 'catalog',
      automaticAction: false,
    });
    expect(awaiting.marketingReview.summary.availableDrafts).toBe(4);
    expect(awaiting.startHere).toMatchObject({
      kind: 'screen-current-window',
      href: '/api/admin/research-intake',
      targetResource: 'catalog',
      automaticAction: false,
    });
  });

  it('keeps the packet, public projections, and all CSV exports byte-identical', () => {
    const packet = buildResearchMarketingReviewPacket('TC-255', AUDIT_AT);
    if (!packet) throw new Error('TC-255 packet fixture is missing');

    expect({
      packet: fingerprint(packet),
      publicOverview: fingerprint(JSON.stringify(buildResearchIntakePublicOverviewPayload())),
      publicIndex: fingerprint(JSON.stringify(buildResearchIntakePublicEvidenceIndexPayload())),
      publicCatalogCsv: fingerprint(buildResearchIntakeCsv()),
      publicEvidenceCsv: fingerprint(buildResearchIntakeEvidenceCsv()),
      protectedEvidenceCsv: fingerprint(buildResearchIntakeAdminEvidenceCsv(
        '2026-08-29T18:00:40.000Z',
      )),
      protectedReviewCsv: fingerprint(buildResearchMarketingReviewCsv(
        '2026-08-29T14:59:59.999Z',
      )),
    }).toEqual({
      packet: {
        bytes: 3_527,
        sha256: '869f59b3ca4b332f34b2a0b60f39b56e8d67d0ec3503d663e687d2b381ee9ffb',
      },
      publicOverview: {
        bytes: 7_637,
        sha256: '2696bd48c4e94712d1616a7af86ddea799c34d389caba289a1aaad341938e821',
      },
      publicIndex: {
        bytes: 16_892,
        sha256: '31d3e5fde66eddc73bdcee156baebe90fccc0a45e928bc432067db9ca068a811',
      },
      publicCatalogCsv: {
        bytes: 37_128,
        sha256: 'afd082b0dc564675bb0c781898fd2d15c624c3ea5dc0e8cdcb69b02bf453edef',
      },
      publicEvidenceCsv: {
        bytes: 7_415,
        sha256: '704187190f0eb96753066495bac241c76e1770b9cc0562798f08b0322d93102f',
      },
      protectedEvidenceCsv: {
        bytes: 17_543,
        sha256: '43518ae9b99cd4fd7ffea64f744d49c4e628a32b1f8beb8c3c004e86b877d4c6',
      },
      protectedReviewCsv: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });
  });

  it('documents the packet as the protected manual-review start action', () => {
    const readme = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');
    const api = readme.slice(readme.indexOf('## API'), readme.indexOf('## Notifications'));

    expect(api).toMatch(/protected.*startHere.*Markdown review packet/i);
    expect(api).toMatch(/human review.*does not approve publication/i);
  });
});
