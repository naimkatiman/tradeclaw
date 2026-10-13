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
import { buildResearchMarketingReviewCsv } from '../../../apps/web/lib/research-marketing-review-csv';
import { buildResearchMarketingReviewHandoff } from '../../../apps/web/lib/research-marketing-review-handoff';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicOverviewPayload,
} from '../../../apps/web/lib/research-intake-public';

const REPO_ROOT = resolve(__dirname, '../../..');
const MODULE_PATH = resolve(
  REPO_ROOT,
  'scripts/research/research-marketing-owner-decision-request-artifact.ts',
);
const CLI_PATH = resolve(
  REPO_ROOT,
  'scripts/research/prepare-marketing-owner-decision-request.ts',
);
const PACKAGE_PATH = resolve(REPO_ROOT, 'package.json');
const README_PATH = resolve(REPO_ROOT, 'README.md');
const LOOP_PLAN_PATH = resolve(
  REPO_ROOT,
  'docs/plans/2026-08-29-three-hour-research-marketing-loop.md',
);
const COMMAND =
  'npm run prepare:research-owner-decision-request -- --file <completed-handoff.yaml>';
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REVIEWED_AT = '2026-08-29T16:05:00.000Z';
const VALIDATION_NOW = '2026-08-30T00:00:00.000Z';

interface OwnerDecisionRequest {
  taskId: string;
  candidateId: string;
  completedHandoffSha256: string;
  evidenceManifestSha256: string;
  ownerDecisionRecorded: false;
  publicationApproved: false;
  automaticPublication: false;
  automaticPosting: false;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
  externalActions: 'none';
}

interface OwnerRequestArtifact {
  schemaVersion: 1;
  ok: boolean;
  scope: 'validated-owner-decision-request-artifact';
  status:
    | 'invalid-handoff'
    | 'draft-rejected'
    | 'revision-required'
    | 'ready-for-separate-owner-decision';
  source: {
    completedHandoffBytes: number;
    completedHandoffSha256: string;
    evidenceManifestSha256: string | null;
  };
  requestFingerprint: {
    algorithm: 'sha256';
    canonicalization: 'json-pretty-2-space-lf-utf8-v1';
    bytes: number;
    sha256: string;
  } | null;
  ownerDecisionRequest: OwnerDecisionRequest | null;
  nextAction: string;
  issueCount: number;
  controls: {
    writesFiles: false;
    recordsReviewCompletion: false;
    recordsOwnerDecision: false;
    publicationApproved: false;
    automaticPublication: false;
    automaticPosting: false;
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
    externalActions: 'none';
  };
}

interface ArtifactModule {
  canonicalizeResearchMarketingOwnerDecisionRequest(
    request: OwnerDecisionRequest,
  ): string;
  prepareResearchMarketingOwnerDecisionRequestArtifact(options: {
    yamlText: string;
    root?: string;
    now?: Date | string | number;
  }): Promise<OwnerRequestArtifact>;
}

function loadModule(): ArtifactModule | undefined {
  if (!existsSync(MODULE_PATH)) return undefined;
  return require(MODULE_PATH) as ArtifactModule;
}

function completedYaml(
  outcome:
    | 'reject-draft'
    | 'needs-revision'
    | 'ready-for-separate-owner-decision',
  mutate?: (record: Record<string, unknown>) => void,
): string {
  const blank = buildResearchMarketingReviewHandoff('TC-255', AUDIT_AT);
  if (!blank) throw new Error('TC-255 handoff fixture is missing');
  const record = parse(blank) as Record<string, unknown>;
  record.reviewer = 'Research operator';
  record.reviewedAt = REVIEWED_AT;
  record.completedCheckIds = [...(record.requiredCheckIds as string[])];
  record.verifiedClaimIds = [...(record.claimIds as string[])];
  record.outcome = outcome;
  record.notes = outcome === 'ready-for-separate-owner-decision'
    ? 'Evidence and framing checks are complete.'
    : outcome === 'needs-revision'
      ? 'Replace the unsupported live-performance sentence.'
      : 'Reject this draft because its headline overstates the evidence.';
  mutate?.(record);
  return stringify(record, { lineWidth: 0 });
}

async function prepare(yamlText: string): Promise<OwnerRequestArtifact | undefined> {
  const module = loadModule();
  expect(module).toBeDefined();
  if (!module) return undefined;
  return module.prepareResearchMarketingOwnerDecisionRequestArtifact({
    yamlText,
    root: REPO_ROOT,
    now: VALIDATION_NOW,
  });
}

describe('canonical owner-decision request artifact', () => {
  it('registers one explicit stdout-only admin command', () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(existsSync(MODULE_PATH)).toBe(true);
    expect(existsSync(CLI_PATH)).toBe(true);
    expect(packageJson.scripts['prepare:research-owner-decision-request']).toBe(
      'npx tsx scripts/research/prepare-marketing-owner-decision-request.ts',
    );
  });

  it('emits a compact fingerprinted artifact only for a fully valid ready handoff', async () => {
    const yamlText = completedYaml('ready-for-separate-owner-decision');
    const artifact = await prepare(yamlText);
    if (!artifact) return;
    const module = loadModule();
    if (!module || !artifact.ownerDecisionRequest) return;
    const canonical = module.canonicalizeResearchMarketingOwnerDecisionRequest(
      artifact.ownerDecisionRequest,
    );

    expect(artifact).toMatchObject({
      schemaVersion: 1,
      ok: true,
      scope: 'validated-owner-decision-request-artifact',
      status: 'ready-for-separate-owner-decision',
      source: {
        completedHandoffBytes: Buffer.byteLength(yamlText, 'utf8'),
        completedHandoffSha256: createHash('sha256').update(yamlText).digest('hex'),
        evidenceManifestSha256:
          'baa1778585d32bd9a5b99f2dc7a7157d8b29f32f7046b5c83610e4b051c170a8',
      },
      requestFingerprint: {
        algorithm: 'sha256',
        canonicalization: 'json-pretty-2-space-lf-utf8-v1',
        bytes: Buffer.byteLength(canonical, 'utf8'),
        sha256: createHash('sha256').update(canonical).digest('hex'),
      },
      ownerDecisionRequest: {
        taskId: 'TC-255',
        candidateId:
          'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
        completedHandoffSha256: createHash('sha256').update(yamlText).digest('hex'),
        evidenceManifestSha256:
          'baa1778585d32bd9a5b99f2dc7a7157d8b29f32f7046b5c83610e4b051c170a8',
        ownerDecisionRecorded: false,
        publicationApproved: false,
        automaticPublication: false,
        automaticPosting: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
        externalActions: 'none',
      },
      nextAction:
        'Send this exact fingerprinted artifact to a separate owner workflow; it records no decision and grants no publication or posting authority.',
      issueCount: 0,
      controls: {
        writesFiles: false,
        recordsReviewCompletion: false,
        recordsOwnerDecision: false,
        publicationApproved: false,
        automaticPublication: false,
        automaticPosting: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
        externalActions: 'none',
      },
    });
    expect(canonical).toBe(`${JSON.stringify(artifact.ownerDecisionRequest, null, 2)}\n`);
  });

  it('is byte-deterministic and changes both bindings when the completed handoff changes', async () => {
    const first = await prepare(completedYaml('ready-for-separate-owner-decision'));
    const replay = await prepare(completedYaml('ready-for-separate-owner-decision'));
    const changed = await prepare(completedYaml(
      'ready-for-separate-owner-decision',
      (record) => {
        record.notes = 'Evidence and framing checks are complete. Second note.';
      },
    ));
    if (!first || !replay || !changed) return;

    expect(replay).toEqual(first);
    expect(changed.source.completedHandoffSha256).not.toBe(
      first.source.completedHandoffSha256,
    );
    expect(changed.requestFingerprint?.sha256).not.toBe(
      first.requestFingerprint?.sha256,
    );
  });

  it.each([
    ['reject-draft', 'draft-rejected'],
    ['needs-revision', 'revision-required'],
  ] as const)('fails closed for %s without emitting a request', async (outcome, status) => {
    const artifact = await prepare(completedYaml(outcome));
    if (!artifact) return;

    expect(artifact).toMatchObject({
      ok: false,
      status,
      requestFingerprint: null,
      ownerDecisionRequest: null,
      issueCount: 0,
    });
  });

  it('fails closed for an invalid ready handoff and preserves issue count', async () => {
    const artifact = await prepare(completedYaml(
      'ready-for-separate-owner-decision',
      (record) => {
        record.completedCheckIds = [];
      },
    ));
    if (!artifact) return;

    expect(artifact).toMatchObject({
      ok: false,
      status: 'invalid-handoff',
      requestFingerprint: null,
      ownerDecisionRequest: null,
    });
    expect(artifact.issueCount).toBeGreaterThan(0);
  });

  it('documents the exact command, fingerprint, and non-authorizing boundary', () => {
    for (const body of [
      readFileSync(README_PATH, 'utf8'),
      readFileSync(LOOP_PLAN_PATH, 'utf8'),
    ]) {
      expect(body).toContain(COMMAND);
      expect(body).toMatch(/canonical.*SHA-256/i);
      expect(body).toMatch(/stdout.*does not (?:write|record)/i);
      expect(body).toMatch(/does not.*(?:approve|publication authority)/i);
    }
  });

  it('keeps the module and CLI free of persistence, network, and authority paths', () => {
    expect(existsSync(MODULE_PATH)).toBe(true);
    expect(existsSync(CLI_PATH)).toBe(true);
    if (!existsSync(MODULE_PATH) || !existsSync(CLI_PATH)) return;
    const source = `${readFileSync(MODULE_PATH, 'utf8')}\n${readFileSync(CLI_PATH, 'utf8')}`;

    expect(source).not.toMatch(
      /(?:writeFile|appendFile|rename\(|unlink\(|rm\(|fetch\(|https?:\/\/|INSERT|UPDATE|DELETE|publicationApproved:\s*true|grantsPublicationAuthority:\s*true|grantsTradingAuthority:\s*true)/,
    );
  });

  it('executes the real CLI with ready-only stdout and no output-file side effect', () => {
    const directory = mkdtempSync(join(tmpdir(), 'tradeclaw-owner-request-'));
    try {
      const readyPath = join(directory, 'ready.yaml');
      const rejectedPath = join(directory, 'rejected.yaml');
      writeFileSync(
        readyPath,
        completedYaml('ready-for-separate-owner-decision'),
        'utf8',
      );
      writeFileSync(rejectedPath, completedYaml('reject-draft'), 'utf8');
      const tsxCli = require.resolve('tsx/cli');
      const ready = spawnSync(process.execPath, [tsxCli, CLI_PATH, '--file', readyPath], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
      const rejected = spawnSync(
        process.execPath,
        [tsxCli, CLI_PATH, '--file', rejectedPath],
        { cwd: REPO_ROOT, encoding: 'utf8' },
      );

      expect(ready.status).toBe(0);
      expect(ready.stderr).toBe('');
      expect(JSON.parse(ready.stdout)).toMatchObject({
        ok: true,
        status: 'ready-for-separate-owner-decision',
        requestFingerprint: { algorithm: 'sha256' },
      });
      expect(rejected.status).toBe(1);
      expect(rejected.stderr).toBe('');
      expect(JSON.parse(rejected.stdout)).toMatchObject({
        ok: false,
        status: 'draft-rejected',
        requestFingerprint: null,
        ownerDecisionRequest: null,
      });
      expect(readdirSync(directory).sort()).toEqual([
        'ready.yaml',
        'rejected.yaml',
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('keeps the artifact out of queues, public projections, and CSV exports', () => {
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
        (body) => !body.includes('validated-owner-decision-request-artifact'),
      ),
    ).toBe(true);
  });
});
