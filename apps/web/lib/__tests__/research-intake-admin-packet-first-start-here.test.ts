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
        bytes: 6_070,
        sha256: '4827be6e4de261b10460ad1ca2822e9d9840063e45974d1714e0581c7801c535',
      },
      publicOverview: {
        bytes: 7_637,
        sha256: 'a5fe58400cd6b9991147157cecd3b7ac83e000174d331b6be3f6245f08e37bf1',
      },
      publicIndex: {
        bytes: 17_739,
        sha256: '953e5b9045c16f98ff320dd94f28d2694f4088181fb4729d6c9824011032c7e2',
      },
      publicCatalogCsv: {
        bytes: 37_222,
        sha256: '2a9b607cf4fd0adcc5efb4486ff7d2d28c4575a46e35fa64e1dc8df152ff571e',
      },
      publicEvidenceCsv: {
        bytes: 7_958,
        sha256: '14fd4f3c2b6e87acadebe77076791436b2e01239507ebe8931a39c736a0b48b4',
      },
      protectedEvidenceCsv: {
        bytes: 18_299,
        sha256: 'e4bfbec42a10c29b013aa8816f29fc925bfa5623d4e1084cfac496af04f67015',
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
