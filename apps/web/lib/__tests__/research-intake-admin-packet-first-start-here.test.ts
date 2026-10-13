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
      href: '/api/admin/research-intake/screening/index.md',
      targetResource: 'screening-queue',
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
        bytes: 11_609,
        sha256: 'd8e554f7799fbe6ee0e91463c24495cf5c9082e7e9af3e1124a181261cbb8fc8',
      },
      publicOverview: {
        bytes: 7_758,
        sha256: 'bfe147f9c5bbe293f9b966b0f902c029a45d099918cbb32338a350f939a8d274',
      },
      publicIndex: {
        bytes: 22_083,
        sha256: 'f33f5fcf6df43a0a26228b429d66a719a59724aba46429a8cbd0abb68f14813c',
      },
      publicCatalogCsv: {
        bytes: 37_522,
        sha256: 'e6f1023e3adfa4672bfe285b9f206d91bb2704488270818a9ef3fee9b5d615cf',
      },
      publicEvidenceCsv: {
        bytes: 9_820,
        sha256: '091b91a4a5ccaf5278456964b29e3c77e889fa14278cc07f4ae6100f477ab31c',
      },
      protectedEvidenceCsv: {
        bytes: 20_948,
        sha256: 'a7cc6415ba8f02802d6922d2e5088a0c7fed2abb9e8cc1b523fb1f170e085661',
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
