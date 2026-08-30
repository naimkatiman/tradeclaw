import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildOpenApiSpec } from '../openapi';
import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';
import { buildResearchIntakeAdminStartHere } from '../research-intake-start-here';

const TC260 = 'a-risk-based-approach-to-tactical-asset-allocation';

interface StartHere {
  audience: 'public' | 'admin';
  kind:
    | 'inspect-complete-evidence'
    | 'resolve-receipt-conflict'
    | 'screen-current-window'
    | 'review-marketing-drafts';
  label: string;
  reason: string;
  href: string;
  itemCount: number;
  automaticAction: false;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

function startHere(payload: unknown): StartHere | undefined {
  return (payload as { startHere?: StartHere }).startHere;
}

describe('research intake start-here guidance', () => {
  it('gives every public JSON projection one identical evidence-first action', () => {
    const catalog = buildResearchIntakePublicPayload();
    const candidate = buildResearchIntakePublicCandidatePayload(TC260);
    const evidence = buildResearchIntakePublicEvidencePayload();
    if (!candidate) throw new Error('TC-260 public candidate fixture is missing');

    const expected: StartHere = {
      audience: 'public',
      kind: 'inspect-complete-evidence',
      label: 'Start with 9 examined candidates',
      reason:
        'This complete evidence desk includes every TradeClaw source audit and replication in pinned source order, including adverse and no-performance-result records. It is not performance-ranked.',
      href: '/api/research/intake/evidence',
      itemCount: 9,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    };

    for (const payload of [catalog, candidate, evidence]) {
      expect(startHere(payload)).toEqual(expected);
      expect(JSON.stringify(payload)).not.toContain('/api/admin/research-intake');
    }
  });

  it('makes a current-window receipt conflict the protected priority', () => {
    const payload = buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      '2026-08-29T08:29:58.000Z',
    );

    expect(startHere(payload)).toEqual({
      audience: 'admin',
      kind: 'resolve-receipt-conflict',
      label: 'Resolve 2 receipts in the current UTC window',
      reason:
        'The window 2026-08-29T06:00:00.000Z/PT3H has conflicting receipts. Reconcile the receipt ledger before relying on it; this guidance takes no automatic action.',
      href: '/api/admin/research-intake',
      itemCount: 2,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('makes an awaiting current-window receipt outrank the existing review queue', () => {
    const payload = buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      '2026-08-29T18:00:39.999Z',
    );

    expect(payload.marketingReview.summary.availableDrafts).toBe(4);
    expect(startHere(payload)).toEqual({
      audience: 'admin',
      kind: 'screen-current-window',
      label: 'Screen one candidate for the current UTC window',
      reason:
        'No receipt exists in 2026-08-29T18:00:00.000Z/PT3H. Use the protected catalog manually and keep the frozen cost-first gate; this guidance creates no receipt.',
      href: '/api/admin/research-intake',
      itemCount: 0,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('authors one identical review action across all protected projections after closure', () => {
    const at = '2026-08-29T18:00:40.000Z';
    const candidate = buildResearchIntakeAdminCandidatePayload(TC260, at);
    if (!candidate) throw new Error('TC-260 admin candidate fixture is missing');
    const payloads = [
      buildResearchIntakeAdminPayload(new URLSearchParams(), at),
      candidate,
      buildResearchIntakeAdminEvidencePayload(at),
      buildResearchIntakeAdminReviewPayload(at),
    ];
    const expected: StartHere = {
      audience: 'admin',
      kind: 'review-marketing-drafts',
      label: 'Review 4 human-review drafts',
      reason:
        'The observation-consistent queue has 4 drafts and 0 publication approvals. Review remains manual.',
      href: '/api/admin/research-intake/review',
      itemCount: 4,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    };

    for (const payload of payloads) expect(startHere(payload)).toEqual(expected);
  });

  it('falls back to the complete protected evidence desk when no higher priority exists', () => {
    expect(buildResearchIntakeAdminStartHere({
      currentWindowStatus: 'complete',
      currentWindowId: '2026-08-30T00:00:00.000Z/PT3H',
      currentWindowReceiptCount: 1,
      availableDrafts: 0,
      publicationApprovedDrafts: 0,
      evidenceCount: 9,
      resources: {
        catalog: '/api/admin/research-intake',
        evidence: '/api/admin/research-intake/evidence',
        marketingReview: '/api/admin/research-intake/review',
      },
    })).toEqual({
      audience: 'admin',
      kind: 'inspect-complete-evidence',
      label: 'Inspect 9 evidence records',
      reason:
        'No higher-priority receipt or review action is present. Inspect the complete source-ordered evidence desk; it is not performance-ranked.',
      href: '/api/admin/research-intake/evidence',
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
      'itemCount',
      'automaticAction',
      'grantsPublicationAuthority',
      'grantsTradingAuthority',
    ]);
    expect(schemas.ResearchIntakeStartHere.properties).toHaveProperty('href');
    for (const schema of [
      schemas.ResearchIntakeResponse,
      schemas.ResearchIntakeEvidenceResponse,
      schemas.ResearchIntakeCandidateResponse,
    ]) {
      expect(schema.required).toContain('startHere');
    }
    expect(api).toContain('startHere');
    expect(api).toMatch(/one server-authored.*evidence.*not.*recommendation|not.*authority/i);
  });
});
