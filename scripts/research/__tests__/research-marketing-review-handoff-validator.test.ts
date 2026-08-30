import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import {
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminReviewItemPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../../../apps/web/lib/research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../../../apps/web/lib/research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../../../apps/web/lib/research-intake-csv';
import { buildResearchMarketingReviewCsv } from '../../../apps/web/lib/research-marketing-review-csv';
import { buildResearchMarketingReviewHandoff } from '../../../apps/web/lib/research-marketing-review-handoff';
import { buildResearchMarketingReviewPacket } from '../../../apps/web/lib/research-marketing-review-packet';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicOverviewPayload,
} from '../../../apps/web/lib/research-intake-public';

const REPO_ROOT = resolve(__dirname, '../../..');
const VALIDATOR_PATH = resolve(
  REPO_ROOT,
  'scripts/research/research-marketing-review-handoff-validator.ts',
);
const CLI_PATH = resolve(
  REPO_ROOT,
  'scripts/research/validate-marketing-review-handoff.ts',
);
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REVIEWED_AT = '2026-08-29T16:05:00.000Z';
const VALIDATION_NOW = '2026-08-30T00:00:00.000Z';
const VALIDATOR_COMMAND =
  'npm run validate:research-review-handoff -- --file <completed-handoff.yaml>';

interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

interface ValidationReport {
  schemaVersion: 2;
  ok: boolean;
  scope: 'completed-review-handoff-and-repository-evidence';
  source: {
    bytes: number;
    sha256: string;
  };
  review: {
    taskId: string | null;
    candidateId: string | null;
    reviewedProjectionObservedAt: string | null;
    reviewer: string | null;
    reviewedAt: string | null;
    outcome: string | null;
    expectedRequiredCheckCount: number | null;
    completedCheckCount: number | null;
    expectedClaimCount: number | null;
    verifiedClaimCount: number | null;
    evidenceManifestSha256: string | null;
    completedHandoffContractSatisfied: boolean;
  };
  issues: ValidationIssue[];
  evidenceVerification: {
    scope: 'repository-evidence-bytes-only';
    ok: boolean;
    task: {
      taskId: string;
      ok: boolean;
      expectedManifestSha256: string;
      actualManifestSha256: string | null;
      files: unknown[];
    };
  } | null;
  controls: {
    recordsReviewCompletion: false;
    recordsOwnerDecision: false;
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
    externalActions: 'none';
  };
}

interface ValidatorModule {
  parseResearchMarketingReviewHandoffArgs(args: readonly string[]): string;
  validateResearchMarketingReviewHandoff(options: {
    yamlText: string;
    root?: string;
    now?: Date | string | number;
    readEvidenceText?: (
      absolutePath: string,
      repositoryPath: string,
    ) => Promise<string>;
  }): Promise<ValidationReport>;
}

function validatorModule(): ValidatorModule | undefined {
  if (!existsSync(VALIDATOR_PATH)) return undefined;
  return require(VALIDATOR_PATH) as ValidatorModule;
}

function completedRecord(): Record<string, unknown> {
  const blank = buildResearchMarketingReviewHandoff('TC-255', AUDIT_AT);
  if (!blank) throw new Error('TC-255 handoff fixture is missing');
  const record = parse(blank) as Record<string, unknown>;
  record.reviewer = 'Research operator';
  record.reviewedAt = REVIEWED_AT;
  record.completedCheckIds = [...(record.requiredCheckIds as string[])].reverse();
  record.verifiedClaimIds = [...(record.claimIds as string[])].reverse();
  record.outcome = 'ready-for-separate-owner-decision';
  record.notes = 'All checks completed against the pinned evidence.';
  return record;
}

function completedYaml(
  mutate?: (record: Record<string, unknown>) => void,
): string {
  const record = completedRecord();
  mutate?.(record);
  return stringify(record, { lineWidth: 0 });
}

describe('completed research marketing-review handoff validator', () => {
  it('exposes one repository-root command and checked-in read-only entrypoint', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts['validate:research-review-handoff']).toBe(
      'npx tsx scripts/research/validate-marketing-review-handoff.ts',
    );
    expect(existsSync(VALIDATOR_PATH)).toBe(true);
    expect(existsSync(CLI_PATH)).toBe(true);
    expect(validatorModule()).toBeDefined();
  });

  it('advertises one non-authorizing validator in the exact template and packet', () => {
    const exact = buildResearchIntakeAdminReviewItemPayload('TC-255', AUDIT_AT) as
      | {
          reviewHandoffTemplate?: {
            schemaVersion?: number;
            validation?: unknown;
          };
        }
      | null;
    const packet = buildResearchMarketingReviewPacket('TC-255', AUDIT_AT);
    if (!exact?.reviewHandoffTemplate || !packet) {
      throw new Error('TC-255 exact review fixture is missing');
    }

    expect(exact.reviewHandoffTemplate).toMatchObject({
      schemaVersion: 2,
      validation: {
        status: 'not-run-by-read-only-api',
        command: VALIDATOR_COMMAND,
        successMeaning:
          'completed-handoff-and-current-repository-evidence-match-review-contract',
        recordsReviewCompletion: false,
        recordsOwnerDecision: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
    });
    expect(Object.isFrozen(exact.reviewHandoffTemplate.validation)).toBe(true);
    expect(packet).toContain('Validate the completed YAML from the repository root');
    expect(packet).toContain(VALIDATOR_COMMAND);
    expect(packet).toContain(
      'does not record review completion or grant publication or trading authority',
    );
  });

  it('accepts a complete observation-bound handoff and re-verifies its repository evidence', async () => {
    const module = validatorModule();
    expect(module).toBeDefined();
    if (!module) return;

    const report = await module.validateResearchMarketingReviewHandoff({
      yamlText: completedYaml(),
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });

    expect(report).toMatchObject({
      schemaVersion: 2,
      ok: true,
      scope: 'completed-review-handoff-and-repository-evidence',
      review: {
        taskId: 'TC-255',
        candidateId:
          'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
        reviewedProjectionObservedAt: AUDIT_AT,
        reviewer: 'Research operator',
        reviewedAt: REVIEWED_AT,
        outcome: 'ready-for-separate-owner-decision',
        expectedRequiredCheckCount: 4,
        completedCheckCount: 4,
        expectedClaimCount: 5,
        verifiedClaimCount: 5,
        evidenceManifestSha256:
          'baa1778585d32bd9a5b99f2dc7a7157d8b29f32f7046b5c83610e4b051c170a8',
        completedHandoffContractSatisfied: true,
      },
      issues: [],
      evidenceVerification: {
        scope: 'repository-evidence-bytes-only',
        ok: true,
        task: {
          taskId: 'TC-255',
          ok: true,
          files: expect.any(Array),
        },
      },
      controls: {
        recordsReviewCompletion: false,
        recordsOwnerDecision: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
        externalActions: 'none',
      },
    });
    expect(report.source.bytes).toBeGreaterThan(0);
    expect(report.source.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.evidenceVerification?.task.files).toHaveLength(3);
  });

  it.each([
    {
      name: 'missing required checks',
      mutate: (record: Record<string, unknown>) => {
        record.completedCheckIds = [];
      },
      code: 'completed-check-ids',
    },
    {
      name: 'duplicate verified claims',
      mutate: (record: Record<string, unknown>) => {
        const claims = record.claimIds as string[];
        record.verifiedClaimIds = [claims[0], claims[0], ...claims.slice(1)];
      },
      code: 'verified-claim-ids',
    },
    {
      name: 'tampered evidence manifest',
      mutate: (record: Record<string, unknown>) => {
        (record.evidenceIntegrity as Record<string, unknown>).manifestSha256 =
          '0'.repeat(64);
      },
      code: 'immutable-field',
    },
    {
      name: 'invented approval outcome',
      mutate: (record: Record<string, unknown>) => {
        record.outcome = 'approved';
      },
      code: 'outcome',
    },
    {
      name: 'publication authority changed to true',
      mutate: (record: Record<string, unknown>) => {
        record.grantsPublicationAuthority = true;
      },
      code: 'immutable-field',
    },
    {
      name: 'revision without actionable notes',
      mutate: (record: Record<string, unknown>) => {
        record.outcome = 'needs-revision';
        record.notes = null;
      },
      code: 'notes',
    },
    {
      name: 'timezone-less reviewed instant',
      mutate: (record: Record<string, unknown>) => {
        record.reviewedAt = '2026-08-29T16:05:00';
      },
      code: 'reviewed-at',
    },
    {
      name: 'unknown top-level field',
      mutate: (record: Record<string, unknown>) => {
        record.publishApproved = true;
      },
      code: 'unknown-field',
    },
    {
      name: 'stale schema version',
      mutate: (record: Record<string, unknown>) => {
        record.schemaVersion = 1;
      },
      code: 'schema-version',
    },
  ])('fails closed for $name', async ({ mutate, code }) => {
    const module = validatorModule();
    expect(module).toBeDefined();
    if (!module) return;

    const report = await module.validateResearchMarketingReviewHandoff({
      yamlText: completedYaml(mutate),
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });

    expect(report.ok).toBe(false);
    expect(report.review.completedHandoffContractSatisfied).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    );
    expect(report.controls).toEqual({
      recordsReviewCompletion: false,
      recordsOwnerDecision: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
      externalActions: 'none',
    });
  });

  it('fails the completed handoff when current repository evidence drifts', async () => {
    const module = validatorModule();
    expect(module).toBeDefined();
    if (!module) return;

    const report = await module.validateResearchMarketingReviewHandoff({
      yamlText: completedYaml(),
      root: REPO_ROOT,
      now: VALIDATION_NOW,
      readEvidenceText: async (absolutePath, repositoryPath) => {
        const text = readFileSync(absolutePath, 'utf8');
        return repositoryPath.endsWith('-result.md') ? `${text}\ndrift` : text;
      },
    });

    expect(report.ok).toBe(false);
    expect(report.evidenceVerification).toMatchObject({
      ok: false,
      task: { taskId: 'TC-255', ok: false },
    });
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'repository-evidence',
          path: '/evidenceIntegrity',
        }),
      ]),
    );
  });

  it('rejects multiple YAML documents and an oversized document before review', async () => {
    const module = validatorModule();
    expect(module).toBeDefined();
    if (!module) return;

    const multiple = await module.validateResearchMarketingReviewHandoff({
      yamlText: `${completedYaml()}---\n{}\n`,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });
    const oversized = await module.validateResearchMarketingReviewHandoff({
      yamlText: `notes: ${'x'.repeat(70_000)}`,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });

    expect(multiple.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'yaml-document-count' }),
      ]),
    );
    expect(oversized.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'yaml-byte-limit' }),
      ]),
    );
    expect(multiple.ok).toBe(false);
    expect(oversized.ok).toBe(false);
  });

  it('rejects missing, repeated, positional, and extra CLI arguments', () => {
    const module = validatorModule();
    expect(module).toBeDefined();
    if (!module) return;

    expect(module.parseResearchMarketingReviewHandoffArgs([
      '--file',
      'review.yaml',
    ])).toBe('review.yaml');
    expect(() => module.parseResearchMarketingReviewHandoffArgs([])).toThrow(
      '--file is required',
    );
    expect(() =>
      module.parseResearchMarketingReviewHandoffArgs(['--file']),
    ).toThrow('--file requires');
    expect(() =>
      module.parseResearchMarketingReviewHandoffArgs([
        '--file',
        'one.yaml',
        '--file',
        'two.yaml',
      ]),
    ).toThrow('at most once');
    expect(() =>
      module.parseResearchMarketingReviewHandoffArgs(['review.yaml']),
    ).toThrow('unexpected argument');
  });

  it('keeps validator guidance off queues, public projections, and CSVs', () => {
    const excludedJson = [
      buildResearchIntakeAdminReviewPayload(AUDIT_AT),
      buildResearchIntakeAdminOverviewPayload(AUDIT_AT),
      buildResearchIntakePublicOverviewPayload(),
      buildResearchIntakePublicEvidenceIndexPayload(),
    ].map((value) => JSON.stringify(value));
    const excludedCsv = [
      buildResearchIntakeCsv(),
      buildResearchIntakeEvidenceCsv(),
      buildResearchIntakeAdminEvidenceCsv(AUDIT_AT),
      buildResearchMarketingReviewCsv(AUDIT_AT),
    ];
    expect(
      [...excludedJson, ...excludedCsv].every(
        (body) => !body.includes('validate:research-review-handoff'),
      ),
    ).toBe(true);
  });

  it('keeps the validator implementation read-only and non-authorizing', () => {
    expect(readFileSync(VALIDATOR_PATH, 'utf8')).not.toMatch(
      /(?:writeFile|appendFile|rename\(|unlink\(|fetch\(|INSERT|UPDATE|DELETE|grantsPublicationAuthority:\s*true|grantsTradingAuthority:\s*true)/,
    );
    expect(readFileSync(CLI_PATH, 'utf8')).not.toMatch(
      /(?:writeFile|appendFile|rename\(|unlink\(|fetch\(|INSERT|UPDATE|DELETE|grantsPublicationAuthority:\s*true|grantsTradingAuthority:\s*true)/,
    );
  });
});
