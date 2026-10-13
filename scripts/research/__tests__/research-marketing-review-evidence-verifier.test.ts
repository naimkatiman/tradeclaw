import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
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

const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REPO_ROOT = resolve(__dirname, '../../..');
const VERIFIER_PATH = resolve(
  REPO_ROOT,
  'scripts/research/research-marketing-review-evidence-verifier.ts',
);
const CLI_PATH = resolve(
  REPO_ROOT,
  'scripts/research/verify-marketing-review-evidence.ts',
);
const TASK_IDS = ['TC-255', 'TC-257', 'TC-258', 'TC-259'] as const;

interface VerificationMetadata {
  status: 'not-run-by-read-only-api';
  command: string;
  successMeaning: 'current-repository-evidence-matches-pinned-manifest';
  recordsReviewCompletion: false;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

interface EvidenceIntegrity {
  schemaVersion: 2;
  manifestSha256: string;
  verification: VerificationMetadata;
}

interface VerificationReport {
  schemaVersion: 1;
  ok: boolean;
  scope: 'repository-evidence-bytes-only';
  requestedTaskIds: string[];
  tasks: Array<{
    taskId: string;
    ok: boolean;
    expectedManifestSha256: string;
    actualManifestSha256: string | null;
    files: Array<{
      path: string;
      ok: boolean;
      expectedNormalizedBytes: number;
      actualNormalizedBytes: number | null;
      expectedSha256: string;
      actualSha256: string | null;
      error: string | null;
    }>;
  }>;
  controls: {
    recordsReviewCompletion: false;
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
  };
}

interface VerifierModule {
  parseResearchMarketingReviewEvidenceArgs(args: readonly string[]): readonly string[];
  verifyResearchMarketingReviewEvidence(options?: {
    root?: string;
    taskIds?: readonly string[];
    readText?: (absolutePath: string, repositoryPath: string) => Promise<string>;
  }): Promise<VerificationReport>;
}

function verifierModule(): VerifierModule {
  expect(readFileSync(VERIFIER_PATH, 'utf8')).toContain(
    'verifyResearchMarketingReviewEvidence',
  );
  return require(VERIFIER_PATH) as VerifierModule;
}

function exactIntegrity(taskId: string): EvidenceIntegrity | null {
  const exact = buildResearchIntakeAdminReviewItemPayload(taskId, AUDIT_AT) as
    | {
        claimVerification: { evidenceIntegrity?: EvidenceIntegrity };
        reviewHandoffTemplate: { evidenceIntegrity?: EvidenceIntegrity };
      }
    | null;
  if (!exact?.claimVerification.evidenceIntegrity) return null;
  expect(exact.reviewHandoffTemplate.evidenceIntegrity).toBe(
    exact.claimVerification.evidenceIntegrity,
  );
  return exact.claimVerification.evidenceIntegrity;
}

describe('research marketing-review evidence verifier', () => {
  it('exposes one repository-root npm command and checked-in verifier entrypoint', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts['verify:research-review']).toBe(
      'npx tsx scripts/research/verify-marketing-review-evidence.ts',
    );
    expect(readFileSync(CLI_PATH, 'utf8')).toContain(
      'verifyResearchMarketingReviewEvidence',
    );
    expect(readFileSync(VERIFIER_PATH, 'utf8')).toContain(
      'verifyResearchMarketingReviewEvidence',
    );
  });

  it.each(TASK_IDS)('gives exact review %s one frozen task-specific command', (taskId) => {
    const integrity = exactIntegrity(taskId);
    expect(integrity).not.toBeNull();
    if (!integrity) return;

    expect(integrity).toMatchObject({
      schemaVersion: 2,
      verification: {
        status: 'not-run-by-read-only-api',
        command: `npm run verify:research-review -- --task ${taskId}`,
        successMeaning: 'current-repository-evidence-matches-pinned-manifest',
        recordsReviewCompletion: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
    });
    expect(Object.isFrozen(integrity.verification)).toBe(true);
  });

  it.each(TASK_IDS)('reuses the exact %s command in its packet and YAML handoff', (taskId) => {
    const integrity = exactIntegrity(taskId);
    const packet = buildResearchMarketingReviewPacket(taskId, AUDIT_AT);
    const handoff = buildResearchMarketingReviewHandoff(taskId, AUDIT_AT);
    expect(integrity).not.toBeNull();
    if (!integrity || !packet || !handoff) return;

    const parsed = parse(handoff) as {
      evidenceIntegrity?: EvidenceIntegrity;
    };
    expect(parsed.evidenceIntegrity?.verification).toEqual(
      integrity.verification,
    );
    expect(packet).toContain('Run from the repository root');
    expect(packet).toContain(integrity.verification.command);
    expect(packet).toContain('does not complete the human review');
  });

  it('verifies all four current manifests and all twelve evidence files', async () => {
    const report = await verifierModule().verifyResearchMarketingReviewEvidence({
      root: REPO_ROOT,
    });

    expect(report).toMatchObject({
      schemaVersion: 1,
      ok: true,
      scope: 'repository-evidence-bytes-only',
      requestedTaskIds: TASK_IDS,
      controls: {
        recordsReviewCompletion: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
    });
    expect(report.tasks).toHaveLength(4);
    expect(report.tasks.flatMap((task) => task.files)).toHaveLength(12);
    expect(report.tasks.every((task) => task.ok)).toBe(true);
    expect(
      report.tasks.every(
        (task) => task.actualManifestSha256 === task.expectedManifestSha256,
      ),
    ).toBe(true);
  });

  it('supports one exact task without reading the other manifests', async () => {
    const report = await verifierModule().verifyResearchMarketingReviewEvidence({
      root: REPO_ROOT,
      taskIds: ['TC-258'],
    });

    expect(report.ok).toBe(true);
    expect(report.requestedTaskIds).toEqual(['TC-258']);
    expect(report.tasks.map((task) => task.taskId)).toEqual(['TC-258']);
    expect(report.tasks[0].files).toHaveLength(3);
  });

  it('fails closed and reports exact drift without changing the expected manifest', async () => {
    const originalRead = async (absolutePath: string): Promise<string> =>
      readFileSync(absolutePath, 'utf8');
    const report = await verifierModule().verifyResearchMarketingReviewEvidence({
      root: REPO_ROOT,
      taskIds: ['TC-255'],
      readText: async (absolutePath, repositoryPath) => {
        const value = await originalRead(absolutePath);
        return repositoryPath.endsWith('-result.md') ? `${value}\ndrift` : value;
      },
    });

    expect(report.ok).toBe(false);
    expect(report.tasks[0].ok).toBe(false);
    expect(report.tasks[0].actualManifestSha256).not.toBe(
      report.tasks[0].expectedManifestSha256,
    );
    expect(report.tasks[0].files.filter((file) => !file.ok)).toEqual([
      expect.objectContaining({
        path: expect.stringMatching(/-result\.md$/),
        error: null,
      }),
    ]);
  });

  it('rejects missing, unknown, repeated, and positional task arguments before reads', () => {
    const { parseResearchMarketingReviewEvidenceArgs } = verifierModule();
    expect(parseResearchMarketingReviewEvidenceArgs([])).toEqual(TASK_IDS);
    expect(parseResearchMarketingReviewEvidenceArgs(['--task', 'TC-257'])).toEqual([
      'TC-257',
    ]);
    expect(() => parseResearchMarketingReviewEvidenceArgs(['--task'])).toThrow(
      '--task requires',
    );
    expect(() =>
      parseResearchMarketingReviewEvidenceArgs(['--task', 'TC-999']),
    ).toThrow('unknown review task');
    expect(() =>
      parseResearchMarketingReviewEvidenceArgs([
        '--task',
        'TC-255',
        '--task',
        'TC-257',
      ]),
    ).toThrow('at most once');
    expect(() => parseResearchMarketingReviewEvidenceArgs(['TC-255'])).toThrow(
      'unexpected argument',
    );
  });

  it('keeps verifier metadata off queue, compact, public, and CSV surfaces', () => {
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
        (body) =>
          !body.includes('verify:research-review') &&
          !body.includes('not-run-by-read-only-api'),
      ),
    ).toBe(true);
  });
});
