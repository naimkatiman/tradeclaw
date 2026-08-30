import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidenceIndexPayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildOpenApiSpec } from '../openapi';
import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';
import { buildResearchIntakeAdminStartHere } from '../research-intake-start-here';

const TC260 = 'a-risk-based-approach-to-tactical-asset-allocation';

interface StartHere {
  audience: 'public' | 'admin';
  kind:
    | 'browse-evidence-index'
    | 'inspect-complete-evidence'
    | 'resolve-receipt-conflict'
    | 'screen-current-window'
    | 'review-marketing-drafts';
  label: string;
  reason: string;
  href: string;
  targetResource: 'catalog' | 'evidence-index' | 'evidence' | 'marketing-review';
  targetIsCurrentResource: boolean;
  itemCount: number;
  automaticAction: false;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

function startHere(payload: unknown): StartHere | undefined {
  return (payload as { startHere?: StartHere }).startHere;
}

describe('research intake start-here guidance', () => {
  it('gives public summary projections one compact target while preserving the open complete desk', () => {
    const catalog = buildResearchIntakePublicPayload();
    const candidate = buildResearchIntakePublicCandidatePayload(TC260);
    const index = buildResearchIntakePublicEvidenceIndexPayload();
    const evidence = buildResearchIntakePublicEvidencePayload();
    if (!candidate) throw new Error('TC-260 public candidate fixture is missing');

    const compactExpected = {
      audience: 'public',
      kind: 'browse-evidence-index',
      label: 'Browse 10 examined candidates',
      reason:
        'This lightweight index includes every TradeClaw source audit and replication in pinned source order, with exact candidate-detail links and no performance ranking.',
      href: '/api/research/intake/evidence/index',
      targetResource: 'evidence-index',
      itemCount: 10,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    } as const;

    for (const [payload, targetIsCurrentResource] of [
      [catalog, false],
      [candidate, false],
      [index, true],
    ] as const) {
      expect(startHere(payload)).toEqual({
        ...compactExpected,
        targetIsCurrentResource,
      });
      expect(JSON.stringify(payload)).not.toContain('/api/admin/research-intake');
    }

    expect(startHere(evidence)).toEqual({
      audience: 'public',
      kind: 'inspect-complete-evidence',
      label: 'Inspect 10 examined candidates',
      reason:
        'This complete evidence desk includes every TradeClaw source audit and replication in pinned source order, including adverse and no-performance-result records. It is not performance-ranked.',
      href: '/api/research/intake/evidence',
      targetResource: 'evidence',
      targetIsCurrentResource: true,
      itemCount: 10,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('makes a current-window receipt conflict the protected priority', () => {
    const at = '2026-08-29T08:29:58.000Z';
    const candidate = buildResearchIntakeAdminCandidatePayload(TC260, at);
    if (!candidate) throw new Error('TC-260 admin candidate fixture is missing');
    const payloads = [
      buildResearchIntakeAdminPayload(new URLSearchParams(), at),
      candidate,
      buildResearchIntakeAdminEvidenceIndexPayload(at),
      buildResearchIntakeAdminEvidencePayload(at),
      buildResearchIntakeAdminReviewPayload(at),
    ];
    const expected = {
      audience: 'admin',
      kind: 'resolve-receipt-conflict',
      label: 'Resolve 2 receipts in the current UTC window',
      reason:
        'The window 2026-08-29T06:00:00.000Z/PT3H has conflicting receipts. Reconcile the receipt ledger before relying on it; this guidance takes no automatic action.',
      href: '/api/admin/research-intake',
      targetResource: 'catalog',
      itemCount: 2,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    } as const;

    payloads.forEach((payload, index) => {
      expect(startHere(payload)).toEqual({
        ...expected,
        targetIsCurrentResource: index === 0,
      });
    });
  });

  it('makes an awaiting current-window receipt outrank the existing review queue', () => {
    const at = '2026-08-29T18:00:39.999Z';
    const candidate = buildResearchIntakeAdminCandidatePayload(TC260, at);
    if (!candidate) throw new Error('TC-260 admin candidate fixture is missing');
    const catalog = buildResearchIntakeAdminPayload(new URLSearchParams(), at);
    const payloads = [
      catalog,
      candidate,
      buildResearchIntakeAdminEvidenceIndexPayload(at),
      buildResearchIntakeAdminEvidencePayload(at),
      buildResearchIntakeAdminReviewPayload(at),
    ];

    expect(catalog.marketingReview.summary.availableDrafts).toBe(4);
    const expected = {
      audience: 'admin',
      kind: 'screen-current-window',
      label: 'Screen one candidate for the current UTC window',
      reason:
        'No receipt exists in 2026-08-29T18:00:00.000Z/PT3H. Use the protected catalog manually and keep the frozen cost-first gate; this guidance creates no receipt.',
      href: '/api/admin/research-intake',
      targetResource: 'catalog',
      itemCount: 1,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    } as const;

    payloads.forEach((payload, index) => {
      expect(startHere(payload)).toEqual({
        ...expected,
        targetIsCurrentResource: index === 0,
      });
    });
  });

  it('authors one identical review action across all protected projections after closure', () => {
    const at = '2026-08-29T18:00:40.000Z';
    const candidate = buildResearchIntakeAdminCandidatePayload(TC260, at);
    if (!candidate) throw new Error('TC-260 admin candidate fixture is missing');
    const payloads = [
      buildResearchIntakeAdminPayload(new URLSearchParams(), at),
      candidate,
      buildResearchIntakeAdminEvidenceIndexPayload(at),
      buildResearchIntakeAdminEvidencePayload(at),
      buildResearchIntakeAdminReviewPayload(at),
    ];
    const expected = {
      audience: 'admin',
      kind: 'review-marketing-drafts',
      label: 'Review next draft: A high-turnover Bitcoin trend idea failed after realistic costs',
      reason:
        'The oldest visible human-review handoff is first in an observation-consistent queue of 4 drafts with 0 publication approvals. Review remains manual and this guidance creates no approval.',
      href: '/api/admin/research-intake/review',
      targetResource: 'marketing-review',
      itemCount: 4,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    } as const;

    payloads.forEach((payload, index) => {
      expect(startHere(payload)).toEqual({
        ...expected,
        targetIsCurrentResource: index === 4,
      });
    });
  });

  it('falls back to the complete protected evidence desk when no higher priority exists', () => {
    expect(buildResearchIntakeAdminStartHere({
      currentWindowStatus: 'complete',
      currentWindowId: '2026-08-30T00:00:00.000Z/PT3H',
      currentWindowReceiptCount: 1,
      availableDrafts: 0,
      publicationApprovedDrafts: 0,
      nextReviewHeadline: null,
      evidenceCount: 9,
      resources: {
        catalog: '/api/admin/research-intake',
        evidenceIndex: '/api/admin/research-intake/evidence/index',
        evidence: '/api/admin/research-intake/evidence',
        marketingReview: '/api/admin/research-intake/review',
      },
      currentResource: 'evidence',
    })).toEqual({
      audience: 'admin',
      kind: 'inspect-complete-evidence',
      label: 'Inspect 9 evidence records',
      reason:
        'No higher-priority receipt or review action is present. Inspect the complete source-ordered evidence desk; it is not performance-ranked.',
      href: '/api/admin/research-intake/evidence',
      targetResource: 'evidence',
      targetIsCurrentResource: true,
      itemCount: 9,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('falls back to the lightweight protected index outside the complete desk', () => {
    expect(buildResearchIntakeAdminStartHere({
      currentWindowStatus: 'complete',
      currentWindowId: '2026-08-30T00:00:00.000Z/PT3H',
      currentWindowReceiptCount: 1,
      availableDrafts: 0,
      publicationApprovedDrafts: 0,
      nextReviewHeadline: null,
      evidenceCount: 9,
      resources: {
        catalog: '/api/admin/research-intake',
        evidenceIndex: '/api/admin/research-intake/evidence/index',
        evidence: '/api/admin/research-intake/evidence',
        marketingReview: '/api/admin/research-intake/review',
      },
      currentResource: 'evidence-index',
    })).toEqual({
      audience: 'admin',
      kind: 'browse-evidence-index',
      label: 'Browse 9 evidence records',
      reason:
        'No higher-priority receipt or review action is present. Browse the lightweight source-ordered evidence index, then open exact candidate detail as needed; it is not performance-ranked.',
      href: '/api/admin/research-intake/evidence/index',
      targetResource: 'evidence-index',
      targetIsCurrentResource: true,
      itemCount: 9,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('documents the required public field and simple API handoff', () => {
    const schemas = (buildOpenApiSpec() as unknown as {
      components: {
        schemas: {
          ResearchIntakeStartHere: {
            required: string[];
            properties: Record<string, unknown>;
          };
          ResearchIntakeResponse: { required: string[] };
          ResearchIntakeEvidenceResponse: { required: string[] };
          ResearchIntakeCandidateResponse: { required: string[] };
        };
      };
    }).components.schemas;
    const readme = readFileSync(resolve(__dirname, '../../../../README.md'), 'utf8');
    const api = readme.slice(readme.indexOf('## API'), readme.indexOf('## Notifications'));

    expect(schemas.ResearchIntakeStartHere.required).toEqual([
      'audience',
      'kind',
      'label',
      'reason',
      'href',
      'targetResource',
      'targetIsCurrentResource',
      'itemCount',
      'automaticAction',
      'grantsPublicationAuthority',
      'grantsTradingAuthority',
    ]);
    expect(schemas.ResearchIntakeStartHere.properties).toHaveProperty('href');
    expect(schemas.ResearchIntakeStartHere.properties).toHaveProperty('targetResource');
    expect(schemas.ResearchIntakeStartHere.properties).toHaveProperty(
      'targetIsCurrentResource',
    );
    for (const schema of [
      schemas.ResearchIntakeResponse,
      schemas.ResearchIntakeEvidenceResponse,
      schemas.ResearchIntakeCandidateResponse,
    ]) {
      expect(schema.required).toContain('startHere');
    }
    expect(api).toContain('startHere');
    expect(api).toContain('targetIsCurrentResource');
    expect(api).toMatch(/one server-authored.*evidence.*not.*recommendation|not.*authority/i);
  });
});
