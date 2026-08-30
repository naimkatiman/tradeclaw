import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import {
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../../../apps/web/lib/research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../../../apps/web/lib/research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../../../apps/web/lib/research-intake-csv';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicOverviewPayload,
} from '../../../apps/web/lib/research-intake-public';
import { buildResearchMarketingReviewCsv } from '../../../apps/web/lib/research-marketing-review-csv';
import { buildResearchMarketingReviewHandoff } from '../../../apps/web/lib/research-marketing-review-handoff';
import { prepareResearchMarketingOwnerDecisionTemplate } from '../research-marketing-owner-decision-template';
import {
  prepareResearchMarketingPublicationActionRequestArtifact,
  type ResearchMarketingPublicationActionRequestArtifact,
} from '../research-marketing-publication-action-request';

const REPO_ROOT = resolve(__dirname, '../../..');
const MODULE_PATH = resolve(
  REPO_ROOT,
  'scripts/research/research-marketing-publication-action-request-verifier.ts',
);
const CLI_PATH = resolve(
  REPO_ROOT,
  'scripts/research/verify-marketing-publication-action-request.ts',
);
const PACKAGE_PATH = resolve(REPO_ROOT, 'package.json');
const README_PATH = resolve(REPO_ROOT, 'README.md');
const LOOP_PLAN_PATH = resolve(
  REPO_ROOT,
  'docs/plans/2026-08-29-three-hour-research-marketing-loop.md',
);
const COMMAND =
  'npm run verify:research-publication-action-request -- --artifact <publication-action-request.json> --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>';
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REVIEWED_AT = '2026-08-29T16:05:00.000Z';
const DECIDED_AT = '2026-08-29T16:10:00.000Z';
const VALIDATION_NOW = '2026-08-30T00:00:00.000Z';
const ARTIFACT_MAX_BYTES = 128 * 1024;

interface Fingerprint {
  algorithm: 'sha256';
  canonicalization: 'json-pretty-2-space-lf-utf8-v1';
  bytes: number;
  sha256: string;
}

interface VerificationIssue {
  code: string;
  path: string;
  message: string;
}

interface VerificationReport {
  schemaVersion: 1;
  ok: boolean;
  scope: 'publication-action-request-artifact-and-current-evidence';
  status:
    | 'invalid-publication-action-request-artifact'
    | 'request-artifact-verified-no-action-performed';
  sources: {
    artifact: { bytes: number; sha256: string };
    completedHandoff: { bytes: number; sha256: string };
    decisionForm: { bytes: number; sha256: string };
  };
  expected: {
    requestAvailable: boolean;
    artifactFingerprint: Fingerprint | null;
    draftFingerprintSha256: string | null;
    requestFingerprintSha256: string | null;
    taskId: string | null;
    candidateId: string | null;
  };
  observed: {
    jsonParsed: boolean;
    exactCanonicalBytesMatched: boolean;
    draftFingerprintSha256: string | null;
    requestFingerprintSha256: string | null;
    taskId: string | null;
    candidateId: string | null;
  };
  issues: VerificationIssue[];
  workflow: {
    status:
      | 'invalid-publication-action-request-artifact'
      | 'request-artifact-verified-no-action-performed';
    nextAction: string;
  };
  controls: {
    verifiesArtifactOnly: true;
    writesFiles: false;
    recordsOwnerDecision: false;
    authenticatesOwnerIdentity: false;
    verifiesCryptographicSignature: false;
    enqueuesSocialQueue: false;
    selectsPublicationTarget: false;
    performsPublication: false;
    automaticPublication: false;
    automaticPosting: false;
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
    externalActions: 'none';
  };
}

interface VerifierModule {
  RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_MAX_BYTES: number;
  verifyResearchMarketingPublicationActionRequestArtifact(options: {
    artifactJsonText: string;
    handoffYamlText: string;
    decisionYamlText: string;
    root?: string;
    now?: Date | string | number;
    readEvidenceText?: (
      absolutePath: string,
      repositoryPath: string,
    ) => Promise<string>;
  }): Promise<VerificationReport>;
}

function loadVerifier(): VerifierModule | undefined {
  if (!existsSync(MODULE_PATH)) return undefined;
  return require(MODULE_PATH) as VerifierModule;
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function completedHandoffYaml(): string {
  const blank = buildResearchMarketingReviewHandoff('TC-255', AUDIT_AT);
  if (!blank) throw new Error('TC-255 handoff fixture is missing');
  const record = parse(blank) as Record<string, unknown>;
  record.reviewer = 'Research operator';
  record.reviewedAt = REVIEWED_AT;
  record.completedCheckIds = [...(record.requiredCheckIds as string[])];
  record.verifiedClaimIds = [...(record.claimIds as string[])];
  record.outcome = 'ready-for-separate-owner-decision';
  record.notes = 'Evidence and framing checks are complete.';
  return stringify(record, { lineWidth: 0 });
}

async function completedDecisionYaml(
  handoffYamlText: string,
  outcome:
    | 'decline-publication'
    | 'request-draft-revision'
    | 'approve-draft-for-separate-publication-action' =
      'approve-draft-for-separate-publication-action',
  mutate?: (record: Record<string, unknown>) => void,
): Promise<string> {
  const prepared = await prepareResearchMarketingOwnerDecisionTemplate({
    yamlText: handoffYamlText,
    root: REPO_ROOT,
    now: VALIDATION_NOW,
  });
  if (!prepared.yaml) throw new Error('owner-decision template is unavailable');
  const record = parse(prepared.yaml) as Record<string, unknown>;
  record.owner = 'TradeClaw owner';
  record.decidedAt = DECIDED_AT;
  record.outcome = outcome;
  record.notes = outcome === 'decline-publication'
    ? 'Do not publish this draft.'
    : outcome === 'request-draft-revision'
      ? 'Revise the limitation sentence and repeat review.'
      : 'Approved only for a separately authorized publication action.';
  mutate?.(record);
  return stringify(record, { lineWidth: 0 });
}

async function approvedFixture(): Promise<{
  handoffYamlText: string;
  decisionYamlText: string;
  artifact: ResearchMarketingPublicationActionRequestArtifact;
  artifactJsonText: string;
}> {
  const handoffYamlText = completedHandoffYaml();
  const decisionYamlText = await completedDecisionYaml(handoffYamlText);
  const artifact =
    await prepareResearchMarketingPublicationActionRequestArtifact({
      handoffYamlText,
      decisionYamlText,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });
  if (!artifact.ok) throw new Error('publication-action artifact fixture failed');
  return {
    handoffYamlText,
    decisionYamlText,
    artifact,
    artifactJsonText: `${JSON.stringify(artifact, null, 2)}\n`,
  };
}

function projectionReceipt(): string {
  return JSON.stringify({
    adminOverview: buildResearchIntakeAdminOverviewPayload(AUDIT_AT),
    adminReview: buildResearchIntakeAdminReviewPayload(AUDIT_AT),
    publicOverview: buildResearchIntakePublicOverviewPayload(),
    publicEvidenceIndex: buildResearchIntakePublicEvidenceIndexPayload(),
    publicCatalogCsv: buildResearchIntakeCsv(),
    publicEvidenceCsv: buildResearchIntakeEvidenceCsv(),
    adminEvidenceCsv: buildResearchIntakeAdminEvidenceCsv(AUDIT_AT),
    marketingReviewCsv: buildResearchMarketingReviewCsv(AUDIT_AT),
  });
}

describe('publication-action request artifact verifier', () => {
  it('registers the verifier module, bounded CLI, and package command', () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(existsSync(MODULE_PATH)).toBe(true);
    expect(existsSync(CLI_PATH)).toBe(true);
    expect(packageJson.scripts['verify:research-publication-action-request']).toBe(
      'npx tsx scripts/research/verify-marketing-publication-action-request.ts',
    );
  });

  it('verifies only exact canonical artifact bytes against current inputs and evidence', async () => {
    const verifier = loadVerifier();
    expect(verifier).toBeDefined();
    if (!verifier) return;
    const fixture = await approvedFixture();
    const report =
      await verifier.verifyResearchMarketingPublicationActionRequestArtifact({
        artifactJsonText: fixture.artifactJsonText,
        handoffYamlText: fixture.handoffYamlText,
        decisionYamlText: fixture.decisionYamlText,
        root: REPO_ROOT,
        now: VALIDATION_NOW,
      });

    expect(verifier.RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_MAX_BYTES).toBe(
      ARTIFACT_MAX_BYTES,
    );
    expect(report).toMatchObject({
      schemaVersion: 1,
      ok: true,
      scope: 'publication-action-request-artifact-and-current-evidence',
      status: 'request-artifact-verified-no-action-performed',
      sources: {
        artifact: {
          bytes: Buffer.byteLength(fixture.artifactJsonText, 'utf8'),
          sha256: sha256(fixture.artifactJsonText),
        },
        completedHandoff: {
          bytes: Buffer.byteLength(fixture.handoffYamlText, 'utf8'),
          sha256: sha256(fixture.handoffYamlText),
        },
        decisionForm: {
          bytes: Buffer.byteLength(fixture.decisionYamlText, 'utf8'),
          sha256: sha256(fixture.decisionYamlText),
        },
      },
      expected: {
        requestAvailable: true,
        artifactFingerprint: {
          algorithm: 'sha256',
          canonicalization: 'json-pretty-2-space-lf-utf8-v1',
          bytes: Buffer.byteLength(fixture.artifactJsonText, 'utf8'),
          sha256: sha256(fixture.artifactJsonText),
        },
        draftFingerprintSha256: fixture.artifact.draftFingerprint?.sha256,
        requestFingerprintSha256: fixture.artifact.requestFingerprint?.sha256,
        taskId: fixture.artifact.publicationActionRequest?.taskId,
        candidateId: fixture.artifact.publicationActionRequest?.candidateId,
      },
      observed: {
        jsonParsed: true,
        exactCanonicalBytesMatched: true,
        draftFingerprintSha256: fixture.artifact.draftFingerprint?.sha256,
        requestFingerprintSha256: fixture.artifact.requestFingerprint?.sha256,
        taskId: fixture.artifact.publicationActionRequest?.taskId,
        candidateId: fixture.artifact.publicationActionRequest?.candidateId,
      },
      issues: [],
      workflow: {
        status: 'request-artifact-verified-no-action-performed',
      },
      controls: {
        verifiesArtifactOnly: true,
        writesFiles: false,
        recordsOwnerDecision: false,
        authenticatesOwnerIdentity: false,
        verifiesCryptographicSignature: false,
        enqueuesSocialQueue: false,
        selectsPublicationTarget: false,
        performsPublication: false,
        automaticPublication: false,
        automaticPosting: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
        externalActions: 'none',
      },
    });
    expect(report.workflow.nextAction).toMatch(/separate.*authoriz/i);
  });

  it('replays byte-identically', async () => {
    const verifier = loadVerifier();
    expect(verifier).toBeDefined();
    if (!verifier) return;
    const fixture = await approvedFixture();
    const options = {
      artifactJsonText: fixture.artifactJsonText,
      handoffYamlText: fixture.handoffYamlText,
      decisionYamlText: fixture.decisionYamlText,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    } as const;
    const first =
      await verifier.verifyResearchMarketingPublicationActionRequestArtifact(
        options,
      );
    const replay =
      await verifier.verifyResearchMarketingPublicationActionRequestArtifact(
        options,
      );
    expect(JSON.stringify(replay)).toBe(JSON.stringify(first));
  });

  it.each([
    ['draft body', (artifact: Record<string, unknown>) => {
      const request = artifact.publicationActionRequest as Record<string, unknown>;
      const draft = request.draft as Record<string, unknown>;
      draft.body = `${String(draft.body)} Tampered.`;
    }],
    ['request fingerprint', (artifact: Record<string, unknown>) => {
      const fingerprint = artifact.requestFingerprint as Record<string, unknown>;
      fingerprint.sha256 = '0'.repeat(64);
    }],
    ['source binding', (artifact: Record<string, unknown>) => {
      const sources = artifact.sources as Record<string, unknown>;
      const decision = sources.decisionForm as Record<string, unknown>;
      decision.sha256 = '1'.repeat(64);
    }],
    ['unknown field', (artifact: Record<string, unknown>) => {
      artifact.unexpected = true;
    }],
  ] as const)('rejects changed %s content', async (_label, mutate) => {
    const verifier = loadVerifier();
    expect(verifier).toBeDefined();
    if (!verifier) return;
    const fixture = await approvedFixture();
    const artifact = JSON.parse(fixture.artifactJsonText) as Record<string, unknown>;
    mutate(artifact);
    const report =
      await verifier.verifyResearchMarketingPublicationActionRequestArtifact({
        artifactJsonText: `${JSON.stringify(artifact, null, 2)}\n`,
        handoffYamlText: fixture.handoffYamlText,
        decisionYamlText: fixture.decisionYamlText,
        root: REPO_ROOT,
        now: VALIDATION_NOW,
      });

    expect(report.ok).toBe(false);
    expect(report.status).toBe('invalid-publication-action-request-artifact');
    expect(report.observed.exactCanonicalBytesMatched).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain(
      'artifact-canonical-mismatch',
    );
    expect(report.controls.performsPublication).toBe(false);
  });

  it.each([
    ['missing final LF', (text: string) => text.slice(0, -1)],
    ['leading whitespace', (text: string) => ` ${text}`],
    ['CRLF encoding', (text: string) => text.replace(/\n/g, '\r\n')],
  ] as const)('rejects %s even when parsed values are unchanged', async (_label, mutate) => {
    const verifier = loadVerifier();
    expect(verifier).toBeDefined();
    if (!verifier) return;
    const fixture = await approvedFixture();
    const report =
      await verifier.verifyResearchMarketingPublicationActionRequestArtifact({
        artifactJsonText: mutate(fixture.artifactJsonText),
        handoffYamlText: fixture.handoffYamlText,
        decisionYamlText: fixture.decisionYamlText,
        root: REPO_ROOT,
        now: VALIDATION_NOW,
      });

    expect(report.ok).toBe(false);
    expect(report.observed.jsonParsed).toBe(true);
    expect(report.observed.exactCanonicalBytesMatched).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain(
      'artifact-canonical-mismatch',
    );
  });

  it('rejects invalid JSON and input above the byte limit before trusting content', async () => {
    const verifier = loadVerifier();
    expect(verifier).toBeDefined();
    if (!verifier) return;
    const fixture = await approvedFixture();
    const invalid =
      await verifier.verifyResearchMarketingPublicationActionRequestArtifact({
        artifactJsonText: '{"broken":',
        handoffYamlText: fixture.handoffYamlText,
        decisionYamlText: fixture.decisionYamlText,
        root: REPO_ROOT,
        now: VALIDATION_NOW,
      });
    const oversized =
      await verifier.verifyResearchMarketingPublicationActionRequestArtifact({
        artifactJsonText: ' '.repeat(ARTIFACT_MAX_BYTES + 1),
        handoffYamlText: fixture.handoffYamlText,
        decisionYamlText: fixture.decisionYamlText,
        root: REPO_ROOT,
        now: VALIDATION_NOW,
      });

    expect(invalid.ok).toBe(false);
    expect(invalid.observed.jsonParsed).toBe(false);
    expect(invalid.issues.map((issue) => issue.code)).toContain(
      'artifact-json-invalid',
    );
    expect(oversized.ok).toBe(false);
    expect(oversized.observed.jsonParsed).toBe(false);
    expect(oversized.issues.map((issue) => issue.code)).toContain(
      'artifact-byte-limit',
    );
  });

  it('rejects a saved artifact when the otherwise-valid owner decision changes', async () => {
    const verifier = loadVerifier();
    expect(verifier).toBeDefined();
    if (!verifier) return;
    const fixture = await approvedFixture();
    const changedDecision = await completedDecisionYaml(
      fixture.handoffYamlText,
      'approve-draft-for-separate-publication-action',
      (record) => {
        record.notes = 'Approved after a different wording review.';
      },
    );
    const report =
      await verifier.verifyResearchMarketingPublicationActionRequestArtifact({
        artifactJsonText: fixture.artifactJsonText,
        handoffYamlText: fixture.handoffYamlText,
        decisionYamlText: changedDecision,
        root: REPO_ROOT,
        now: VALIDATION_NOW,
      });

    expect(report.ok).toBe(false);
    expect(report.expected.requestAvailable).toBe(true);
    expect(report.observed.exactCanonicalBytesMatched).toBe(false);
    expect(report.expected.requestFingerprintSha256).not.toBe(
      report.observed.requestFingerprintSha256,
    );
  });

  it('rejects decline, revision, invalid approval, and current evidence drift before artifact trust', async () => {
    const verifier = loadVerifier();
    expect(verifier).toBeDefined();
    if (!verifier) return;
    const fixture = await approvedFixture();
    const decline = await completedDecisionYaml(
      fixture.handoffYamlText,
      'decline-publication',
    );
    const revision = await completedDecisionYaml(
      fixture.handoffYamlText,
      'request-draft-revision',
    );
    const invalid = await completedDecisionYaml(
      fixture.handoffYamlText,
      'approve-draft-for-separate-publication-action',
      (record) => {
        const binding = record.requestBinding as Record<string, unknown>;
        binding.taskId = 'TC-999';
      },
    );
    const inputs = [
      { decisionYamlText: decline },
      { decisionYamlText: revision },
      { decisionYamlText: invalid },
      {
        decisionYamlText: fixture.decisionYamlText,
        readEvidenceText: async (absolutePath: string) =>
          `${readFileSync(absolutePath, 'utf8')}\nintentional-drift`,
      },
    ];

    for (const input of inputs) {
      const report =
        await verifier.verifyResearchMarketingPublicationActionRequestArtifact({
          artifactJsonText: fixture.artifactJsonText,
          handoffYamlText: fixture.handoffYamlText,
          root: REPO_ROOT,
          now: VALIDATION_NOW,
          ...input,
        });
      expect(report.ok).toBe(false);
      expect(report.expected.requestAvailable).toBe(false);
      expect(report.expected.artifactFingerprint).toBeNull();
      expect(report.issues.map((issue) => issue.code)).toContain(
        'expected-request-unavailable',
      );
      expect(report.controls.performsPublication).toBe(false);
    }
  });

  it('runs the real CLI through bounded local files and creates no output file', async () => {
    expect(existsSync(CLI_PATH)).toBe(true);
    if (!existsSync(CLI_PATH)) return;
    const fixture = await approvedFixture();
    const directory = mkdtempSync(join(tmpdir(), 'tradeclaw-publication-verify-'));
    try {
      const artifactPath = join(directory, 'publication-action-request.json');
      const tamperedPath = join(directory, 'tampered-request.json');
      const handoffPath = join(directory, 'completed-handoff.yaml');
      const decisionPath = join(directory, 'completed-owner-decision.yaml');
      writeFileSync(artifactPath, fixture.artifactJsonText, 'utf8');
      writeFileSync(tamperedPath, fixture.artifactJsonText.slice(0, -1), 'utf8');
      writeFileSync(handoffPath, fixture.handoffYamlText, 'utf8');
      writeFileSync(decisionPath, fixture.decisionYamlText, 'utf8');
      const tsxCli = require.resolve('tsx/cli');
      const args = [
        '--handoff',
        handoffPath,
        '--artifact',
        artifactPath,
        '--decision',
        decisionPath,
      ];
      const verified = spawnSync(process.execPath, [tsxCli, CLI_PATH, ...args], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
      const tampered = spawnSync(
        process.execPath,
        [
          tsxCli,
          CLI_PATH,
          '--artifact',
          tamperedPath,
          '--handoff',
          handoffPath,
          '--decision',
          decisionPath,
        ],
        { cwd: REPO_ROOT, encoding: 'utf8' },
      );

      expect(verified.status).toBe(0);
      expect(verified.stderr).toBe('');
      expect(JSON.parse(verified.stdout)).toMatchObject({
        ok: true,
        status: 'request-artifact-verified-no-action-performed',
        observed: { exactCanonicalBytesMatched: true },
        controls: { performsPublication: false, externalActions: 'none' },
      });
      expect(tampered.status).toBe(1);
      expect(tampered.stderr).toBe('');
      expect(JSON.parse(tampered.stdout)).toMatchObject({
        ok: false,
        status: 'invalid-publication-action-request-artifact',
        observed: { exactCanonicalBytesMatched: false },
      });
      expect(readdirSync(directory).sort()).toEqual([
        'completed-handoff.yaml',
        'completed-owner-decision.yaml',
        'publication-action-request.json',
        'tampered-request.json',
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fails closed at the CLI argument boundary', () => {
    expect(existsSync(CLI_PATH)).toBe(true);
    if (!existsSync(CLI_PATH)) return;
    const tsxCli = require.resolve('tsx/cli');
    const result = spawnSync(process.execPath, [tsxCli, CLI_PATH], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      scope: 'publication-action-request-artifact-and-current-evidence',
      status: 'invalid-publication-action-request-artifact',
      controls: {
        verifiesArtifactOnly: true,
        performsPublication: false,
        externalActions: 'none',
      },
    });
  });

  it('documents exact-byte verification and the unchanged authority boundary', () => {
    const text = `${readFileSync(README_PATH, 'utf8')}\n${readFileSync(
      LOOP_PLAN_PATH,
      'utf8',
    )}`;

    expect(text).toContain(COMMAND);
    expect(text).toMatch(/exact saved artifact bytes/i);
    expect(text).toMatch(/does not authenticate (?:the )?owner identity/i);
    expect(text).toMatch(/does not (?:authorize|perform) publication/i);
    expect(text).toMatch(/does not enqueue (?:the )?social queue/i);
    expect(text).toMatch(/separate(?:ly)? authorized publication action/i);
  });

  it('contains no write, queue, network, posting, or publication action path', () => {
    expect(existsSync(MODULE_PATH)).toBe(true);
    expect(existsSync(CLI_PATH)).toBe(true);
    if (!existsSync(MODULE_PATH) || !existsSync(CLI_PATH)) return;
    const moduleSource = readFileSync(MODULE_PATH, 'utf8');
    const cliSource = readFileSync(CLI_PATH, 'utf8');

    expect(moduleSource).not.toMatch(/node:(?:fs|http|https|net)|child_process/);
    expect(moduleSource).not.toMatch(/from ['"][^'"]*(?:social|queue|publisher|posting)[^'"]*['"]/i);
    expect(moduleSource).not.toMatch(/\b(?:fetch|writeFile|appendFile|createWriteStream)\s*\(/);
    expect(cliSource).not.toMatch(/\b(?:writeFile|appendFile|createWriteStream)\s*\(/);
  });

  it('leaves queue, receipt, public, and CSV projections byte-identical', async () => {
    const verifier = loadVerifier();
    expect(verifier).toBeDefined();
    if (!verifier) return;
    const before = projectionReceipt();
    const fixture = await approvedFixture();
    await verifier.verifyResearchMarketingPublicationActionRequestArtifact({
      artifactJsonText: fixture.artifactJsonText,
      handoffYamlText: fixture.handoffYamlText,
      decisionYamlText: fixture.decisionYamlText,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });
    expect(projectionReceipt()).toBe(before);
  });
});
