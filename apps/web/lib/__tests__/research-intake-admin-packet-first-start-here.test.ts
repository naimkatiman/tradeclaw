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

  it('pins the enriched packet while keeping public projections and CSV exports byte-identical', () => {
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
        bytes: 11_286,
        sha256: 'b196b34b8bacb345d3f1ed17227e88ef16ec3a59982ebc593919f8ffd651bb08',
      },
      publicOverview: {
        bytes: 7_749,
        sha256: 'ad38ae1c4caa50b7e21afd524e8ff188346b34cee535e108f9245de0722d5870',
      },
      publicIndex: {
        bytes: 19_649,
        sha256: 'af7a440f6306d82ab2fac0935ce7444ee93d8cb68e92cbac22113cfedf137431',
      },
      publicCatalogCsv: {
        bytes: 37_418,
        sha256: '2b990e994ec88fbea657170a673702daa3cf208de01b0ca61e0a555d9dc0288f',
      },
      publicEvidenceCsv: {
        bytes: 9_138,
        sha256: 'e6cfe5fdaee58678f734ffbd8ea05e719d585eb4ae0477c054420f4dff53b941',
      },
      protectedEvidenceCsv: {
        bytes: 19_965,
        sha256: 'e641315a42b9f66768b3420619e77072474c6dc94392fb6bc9fd37af5aeac35f',
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
