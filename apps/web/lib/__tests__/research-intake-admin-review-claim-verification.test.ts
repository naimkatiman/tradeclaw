import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminReviewItemPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';
import { buildResearchMarketingReviewPacket } from '../research-marketing-review-packet';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicOverviewPayload,
} from '../research-intake-public';

const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REPO_ROOT = resolve(__dirname, '../../../..');
const TASK_IDS = ['TC-255', 'TC-257', 'TC-258', 'TC-259'] as const;
const EXPECTED_CLAIM_IDS = {
  'TC-255': [
    'tc255-btc-full-history',
    'tc255-eth-full-history',
    'tc255-fixed-portfolio',
    'tc255-fold-stability',
    'tc255-cost-boundary',
  ],
  'TC-257': [
    'tc257-qa-check-count',
    'tc257-evaluation-window',
    'tc257-qa-tolerance-breach',
  ],
  'TC-258': [
    'tc258-rule-and-holdout-window',
    'tc258-paper-window-control',
    'tc258-btc-full-and-holdout',
    'tc258-eth-holdout-and-folds',
    'tc258-intraday-cost-no-go',
  ],
  'TC-259': [
    'tc259-rule-cost-and-holdout-window',
    'tc259-full-history',
    'tc259-stability-and-holdout',
    'tc259-prior-only-control',
  ],
} as const;

interface CandidateJsonReference {
  source: 'protected-candidate-json';
  path: string;
  jsonPointer: string;
  rawValue: unknown;
  renderedValue: string;
}

interface PreregistrationReference {
  source: 'preregistration-file';
  path: string;
  locator: string;
  renderedValue: string;
}

interface ClaimVerification {
  schemaVersion: 1;
  status: 'manual-cross-check-required';
  mappingPurpose: 'draft-claim-to-canonical-evidence-navigation';
  sourceOfTruth: 'result-and-artifact-files';
  verificationRecorded: false;
  mutationSupported: false;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
  files: {
    candidateJsonHref: string;
    preregistrationPath: string;
    resultPath: string;
    artifactPath: string;
  };
  claims: readonly {
    id: string;
    statement: string;
    references: readonly (CandidateJsonReference | PreregistrationReference)[];
  }[];
}

function claimVerification(taskId: string): ClaimVerification | undefined {
  return (
    buildResearchIntakeAdminReviewItemPayload(taskId, AUDIT_AT) as
      | { claimVerification?: ClaimVerification }
      | null
  )?.claimVerification;
}

function resolveJsonPointer(value: unknown, pointer: string): unknown {
  if (!pointer.startsWith('/')) throw new Error(`invalid JSON pointer: ${pointer}`);
  return pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce<unknown>((current, segment) => {
      if (current === null || typeof current !== 'object') {
        throw new Error(`JSON pointer does not resolve: ${pointer}`);
      }
      return (current as Record<string, unknown>)[segment];
    }, value);
}

function numericTokens(value: string): Set<string> {
  return new Set(
    value.match(/[+-]\d[\d,]*(?:\.\d+)?%|\d[\d,]*(?:\.\d+)?(?:%| bp)?/g) ?? [],
  );
}

describe('protected exact-review numeric claim verification map', () => {
  it.each(TASK_IDS)('maps every numeric draft token for %s to frozen evidence', (taskId) => {
    const exact = buildResearchIntakeAdminReviewItemPayload(taskId, AUDIT_AT);
    if (!exact) throw new Error(`${taskId} exact review fixture is missing`);
    const map = claimVerification(taskId);
    if (!map) throw new Error(`${taskId} claim verification map is missing`);
    const candidate = buildResearchIntakeAdminCandidatePayload(
      exact.reviewItem.candidate.id,
      AUDIT_AT,
    );
    if (!candidate) throw new Error(`${taskId} protected candidate fixture is missing`);

    expect(map).toMatchObject({
      schemaVersion: 1,
      status: 'manual-cross-check-required',
      mappingPurpose: 'draft-claim-to-canonical-evidence-navigation',
      sourceOfTruth: 'result-and-artifact-files',
      verificationRecorded: false,
      mutationSupported: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
      files: {
        candidateJsonHref: exact.reviewItem.links.adminCandidate,
        resultPath: exact.reviewItem.handoff.draft.resultPath,
        artifactPath: exact.reviewItem.handoff.draft.artifactPath,
      },
    });
    expect(map.claims.map((claim) => claim.id)).toEqual(EXPECTED_CLAIM_IDS[taskId]);
    expect(new Set(map.claims.map((claim) => claim.id)).size).toBe(map.claims.length);
    expect(Object.isFrozen(map)).toBe(true);
    expect(Object.isFrozen(map.files)).toBe(true);
    expect(Object.isFrozen(map.claims)).toBe(true);

    for (const claim of map.claims) {
      expect(Object.isFrozen(claim)).toBe(true);
      expect(Object.isFrozen(claim.references)).toBe(true);
      expect(claim.references.length).toBeGreaterThan(0);
      for (const reference of claim.references) {
        expect(Object.isFrozen(reference)).toBe(true);
        expect(claim.statement).toContain(reference.renderedValue);
        if (reference.source === 'protected-candidate-json') {
          expect(reference.path).toBe(map.files.candidateJsonHref);
          expect(reference.jsonPointer).toMatch(/^\/record\/tradeClawEvidence\//);
          expect(resolveJsonPointer(candidate, reference.jsonPointer)).toEqual(
            reference.rawValue,
          );
        } else {
          expect(reference.path).toBe(map.files.preregistrationPath);
          expect(reference.locator.length).toBeGreaterThan(0);
          expect(existsSync(resolve(REPO_ROOT, reference.path))).toBe(true);
        }
      }
    }

    const draft = exact.reviewItem.handoff.draft;
    const draftNumbers = numericTokens([draft.title, draft.summary, draft.body].join(' '));
    const mappedNumbers = numericTokens(map.claims.map((claim) => claim.statement).join(' '));
    expect([...draftNumbers].filter((token) => !mappedNumbers.has(token))).toEqual([]);
  });

  it('keeps the claim map exact-review-only and absent from compact, public, and CSV surfaces', () => {
    expect(JSON.stringify(buildResearchIntakeAdminReviewPayload(AUDIT_AT))).not.toContain(
      'claimVerification',
    );
    expect(JSON.stringify(buildResearchIntakePublicOverviewPayload())).not.toContain(
      'claimVerification',
    );
    expect(JSON.stringify(buildResearchIntakePublicEvidenceIndexPayload())).not.toContain(
      'claimVerification',
    );
    expect([
      buildResearchIntakeCsv(),
      buildResearchIntakeEvidenceCsv(),
      buildResearchIntakeAdminEvidenceCsv(AUDIT_AT),
      buildResearchMarketingReviewCsv(AUDIT_AT),
    ].every((body) => !body.includes('claimVerification'))).toBe(true);
  });

  it('renders the same structured map in the packet as an unverified review aid', () => {
    for (const taskId of TASK_IDS) {
      const map = claimVerification(taskId);
      const packet = buildResearchMarketingReviewPacket(taskId, AUDIT_AT);
      if (!map || !packet) throw new Error(`${taskId} review packet fixture is missing`);

      expect(packet).toContain('## Numeric claim map (manual cross-check required)');
      expect(packet).toContain(
        'This map is navigation assistance, not independent verification or approval.',
      );
      expect(packet).toContain(`- Result source of truth: \`${map.files.resultPath}\``);
      expect(packet).toContain(`- Artifact source of truth: \`${map.files.artifactPath}\``);
      for (const claim of map.claims) {
        expect(packet).toContain(`### \`${claim.id}\``);
        expect(packet).toContain(claim.statement);
        for (const reference of claim.references) {
          expect(packet).toContain(reference.renderedValue);
        }
      }
    }
  });
});
