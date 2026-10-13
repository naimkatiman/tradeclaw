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
  buildResearchIntakeAdminReviewItemPayload,
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

const REPO_ROOT = resolve(__dirname, '../../..');
const MODULE_PATH = resolve(
  REPO_ROOT,
  'scripts/research/research-marketing-publication-action-request.ts',
);
const CLI_PATH = resolve(
  REPO_ROOT,
  'scripts/research/prepare-marketing-publication-action-request.ts',
);
const PACKAGE_PATH = resolve(REPO_ROOT, 'package.json');
const README_PATH = resolve(REPO_ROOT, 'README.md');
const LOOP_PLAN_PATH = resolve(
  REPO_ROOT,
  'docs/plans/2026-08-29-three-hour-research-marketing-loop.md',
);
const COMMAND =
  'npm run prepare:research-publication-action-request -- --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>';
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REVIEWED_AT = '2026-08-29T16:05:00.000Z';
const DECIDED_AT = '2026-08-29T16:10:00.000Z';
const VALIDATION_NOW = '2026-08-30T00:00:00.000Z';

interface Fingerprint {
  algorithm: 'sha256';
  canonicalization: 'json-pretty-2-space-lf-utf8-v1';
  bytes: number;
  sha256: string;
}

interface PublicationActionRequest {
  schemaVersion: 1;
  status: 'request-for-separate-publication-action-not-performed';
  taskId: string;
  candidateId: string;
  approvedBySubmittedOwnerDecision: true;
  ownerIdentityAuthenticated: false;
  cryptographicSignatureVerified: false;
  ownerDecision: {
    owner: string;
    decidedAt: string;
    outcome: 'approve-draft-for-separate-publication-action';
    notes: string;
  };
  bindings: {
    completedHandoff: { bytes: number; sha256: string };
    decisionForm: { bytes: number; sha256: string };
    evidenceManifestSha256: string;
    ownerDecisionRequestFingerprintSha256: string;
    draftFingerprint: Fingerprint;
  };
  draft: Record<string, unknown>;
  links: {
    adminCandidate: string;
    publicCandidate: string;
    exactReview: string;
    reviewPacket: string;
  };
  publicationActionRequired: true;
  publicationActionPerformed: false;
  publicationTarget: null;
  socialQueueEnqueued: false;
  automaticPublication: false;
  automaticPosting: false;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
  externalActions: 'none';
}

interface PublicationActionArtifact {
  schemaVersion: 1;
  ok: boolean;
  scope: 'validated-publication-action-request-artifact';
  status:
    | 'invalid-owner-decision'
    | 'publication-declined'
    | 'draft-revision-requested'
    | 'approved-for-separate-publication-action';
  sources: {
    completedHandoff: { bytes: number; sha256: string };
    decisionForm: { bytes: number; sha256: string };
  };
  draftFingerprint: Fingerprint | null;
  requestFingerprint: Fingerprint | null;
  publicationActionRequest: PublicationActionRequest | null;
  nextAction: string;
  issueCount: number;
  controls: {
    writesFiles: false;
    recordsOwnerDecision: false;
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

interface PublicationActionModule {
  canonicalizeResearchMarketingPublicationDraft(
    draft: Record<string, unknown>,
  ): string;
  canonicalizeResearchMarketingPublicationActionRequest(
    request: PublicationActionRequest,
  ): string;
  prepareResearchMarketingPublicationActionRequestArtifact(options: {
    handoffYamlText: string;
    decisionYamlText: string;
    root?: string;
    now?: Date | string | number;
    readEvidenceText?: (
      absolutePath: string,
      repositoryPath: string,
    ) => Promise<string>;
  }): Promise<PublicationActionArtifact>;
}

function loadModule(): PublicationActionModule | undefined {
  if (!existsSync(MODULE_PATH)) return undefined;
  return require(MODULE_PATH) as PublicationActionModule;
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

describe('approval-only publication-action request artifact', () => {
  it('registers the module, stdout-only CLI, and package command', () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(existsSync(MODULE_PATH)).toBe(true);
    expect(existsSync(CLI_PATH)).toBe(true);
    expect(packageJson.scripts['prepare:research-publication-action-request']).toBe(
      'npx tsx scripts/research/prepare-marketing-publication-action-request.ts',
    );
  });

  it('builds one exact-draft request only from a valid approval', async () => {
    const module = loadModule();
    expect(module).toBeDefined();
    if (!module) return;
    const handoffYamlText = completedHandoffYaml();
    const decisionYamlText = await completedDecisionYaml(handoffYamlText);
    const artifact = await module.prepareResearchMarketingPublicationActionRequestArtifact({
      handoffYamlText,
      decisionYamlText,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });
    const review = buildResearchIntakeAdminReviewItemPayload('TC-255', AUDIT_AT);
    if (!review) throw new Error('TC-255 exact review fixture is missing');

    expect(artifact).toMatchObject({
      schemaVersion: 1,
      ok: true,
      scope: 'validated-publication-action-request-artifact',
      status: 'approved-for-separate-publication-action',
      sources: {
        completedHandoff: {
          bytes: Buffer.byteLength(handoffYamlText, 'utf8'),
          sha256: sha256(handoffYamlText),
        },
        decisionForm: {
          bytes: Buffer.byteLength(decisionYamlText, 'utf8'),
          sha256: sha256(decisionYamlText),
        },
      },
      publicationActionRequest: {
        schemaVersion: 1,
        status: 'request-for-separate-publication-action-not-performed',
        taskId: 'TC-255',
        candidateId:
          'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
        approvedBySubmittedOwnerDecision: true,
        ownerIdentityAuthenticated: false,
        cryptographicSignatureVerified: false,
        ownerDecision: {
          owner: 'TradeClaw owner',
          decidedAt: DECIDED_AT,
          outcome: 'approve-draft-for-separate-publication-action',
          notes: 'Approved only for a separately authorized publication action.',
        },
        draft: review.reviewItem.handoff.draft,
        links: {
          adminCandidate: review.reviewItem.links.adminCandidate,
          publicCandidate: review.reviewItem.links.publicCandidate,
          exactReview: review.reviewItem.links.reviewItem,
          reviewPacket: review.reviewItem.links.reviewPacket,
        },
        publicationActionRequired: true,
        publicationActionPerformed: false,
        publicationTarget: null,
        socialQueueEnqueued: false,
        automaticPublication: false,
        automaticPosting: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
        externalActions: 'none',
      },
      controls: {
        writesFiles: false,
        recordsOwnerDecision: false,
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
    expect(artifact.issueCount).toBe(0);
    expect(artifact.nextAction).toMatch(/separate.*authoriz/i);
  });

  it('fingerprints the exact draft and complete request with canonical bytes', async () => {
    const module = loadModule();
    expect(module).toBeDefined();
    if (!module) return;
    const handoffYamlText = completedHandoffYaml();
    const decisionYamlText = await completedDecisionYaml(handoffYamlText);
    const artifact = await module.prepareResearchMarketingPublicationActionRequestArtifact({
      handoffYamlText,
      decisionYamlText,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });
    if (!artifact.publicationActionRequest) return;
    const draftCanonical = module.canonicalizeResearchMarketingPublicationDraft(
      artifact.publicationActionRequest.draft,
    );
    const requestCanonical =
      module.canonicalizeResearchMarketingPublicationActionRequest(
        artifact.publicationActionRequest,
      );

    expect(artifact.draftFingerprint).toEqual({
      algorithm: 'sha256',
      canonicalization: 'json-pretty-2-space-lf-utf8-v1',
      bytes: Buffer.byteLength(draftCanonical, 'utf8'),
      sha256: sha256(draftCanonical),
    });
    expect(artifact.publicationActionRequest.bindings.draftFingerprint).toEqual(
      artifact.draftFingerprint,
    );
    expect(artifact.requestFingerprint).toEqual({
      algorithm: 'sha256',
      canonicalization: 'json-pretty-2-space-lf-utf8-v1',
      bytes: Buffer.byteLength(requestCanonical, 'utf8'),
      sha256: sha256(requestCanonical),
    });
  });

  it('replays byte-identically and rebinds when the submitted decision changes', async () => {
    const module = loadModule();
    expect(module).toBeDefined();
    if (!module) return;
    const handoffYamlText = completedHandoffYaml();
    const firstDecision = await completedDecisionYaml(handoffYamlText);
    const changedDecision = await completedDecisionYaml(
      handoffYamlText,
      'approve-draft-for-separate-publication-action',
      (record) => {
        record.notes = 'Approved for a separate action after an additional wording check.';
      },
    );
    const first = await module.prepareResearchMarketingPublicationActionRequestArtifact({
      handoffYamlText,
      decisionYamlText: firstDecision,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });
    const replay = await module.prepareResearchMarketingPublicationActionRequestArtifact({
      handoffYamlText,
      decisionYamlText: firstDecision,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });
    const changed = await module.prepareResearchMarketingPublicationActionRequestArtifact({
      handoffYamlText,
      decisionYamlText: changedDecision,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });

    expect(JSON.stringify(replay)).toBe(JSON.stringify(first));
    expect(changed.sources.decisionForm.sha256).not.toBe(
      first.sources.decisionForm.sha256,
    );
    expect(changed.requestFingerprint?.sha256).not.toBe(
      first.requestFingerprint?.sha256,
    );
    expect(changed.draftFingerprint).toEqual(first.draftFingerprint);
  });

  it.each([
    ['decline-publication', 'publication-declined'],
    ['request-draft-revision', 'draft-revision-requested'],
  ] as const)('refuses the valid non-approval outcome %s', async (outcome, status) => {
    const module = loadModule();
    expect(module).toBeDefined();
    if (!module) return;
    const handoffYamlText = completedHandoffYaml();
    const artifact = await module.prepareResearchMarketingPublicationActionRequestArtifact({
      handoffYamlText,
      decisionYamlText: await completedDecisionYaml(handoffYamlText, outcome),
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });

    expect(artifact).toMatchObject({
      ok: false,
      status,
      draftFingerprint: null,
      requestFingerprint: null,
      publicationActionRequest: null,
      controls: {
        enqueuesSocialQueue: false,
        performsPublication: false,
        externalActions: 'none',
      },
    });
  });

  it('fails closed for a tampered decision and current evidence drift', async () => {
    const module = loadModule();
    expect(module).toBeDefined();
    if (!module) return;
    const handoffYamlText = completedHandoffYaml();
    const tamperedDecision = await completedDecisionYaml(
      handoffYamlText,
      'approve-draft-for-separate-publication-action',
      (record) => {
        const binding = record.requestBinding as Record<string, unknown>;
        binding.candidateId = 'tampered-candidate';
      },
    );
    const validDecision = await completedDecisionYaml(handoffYamlText);
    const tampered = await module.prepareResearchMarketingPublicationActionRequestArtifact({
      handoffYamlText,
      decisionYamlText: tamperedDecision,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });
    const drifted = await module.prepareResearchMarketingPublicationActionRequestArtifact({
      handoffYamlText,
      decisionYamlText: validDecision,
      root: REPO_ROOT,
      now: VALIDATION_NOW,
      readEvidenceText: async (absolutePath) =>
        `${readFileSync(absolutePath, 'utf8')}\nintentional-drift`,
    });

    for (const artifact of [tampered, drifted]) {
      expect(artifact.ok).toBe(false);
      expect(artifact.status).toBe('invalid-owner-decision');
      expect(artifact.publicationActionRequest).toBeNull();
      expect(artifact.requestFingerprint).toBeNull();
      expect(artifact.controls.performsPublication).toBe(false);
    }
  });

  it('runs the real CLI through stdout only and exits nonzero without approval', async () => {
    expect(existsSync(CLI_PATH)).toBe(true);
    if (!existsSync(CLI_PATH)) return;
    const directory = mkdtempSync(join(tmpdir(), 'tradeclaw-publication-request-'));
    try {
      const handoffPath = join(directory, 'completed-handoff.yaml');
      const approvedPath = join(directory, 'approved-decision.yaml');
      const declinedPath = join(directory, 'declined-decision.yaml');
      const handoffYamlText = completedHandoffYaml();
      writeFileSync(handoffPath, handoffYamlText, 'utf8');
      writeFileSync(
        approvedPath,
        await completedDecisionYaml(handoffYamlText),
        'utf8',
      );
      writeFileSync(
        declinedPath,
        await completedDecisionYaml(handoffYamlText, 'decline-publication'),
        'utf8',
      );
      const tsxCli = require.resolve('tsx/cli');
      const approved = spawnSync(
        process.execPath,
        [tsxCli, CLI_PATH, '--handoff', handoffPath, '--decision', approvedPath],
        { cwd: REPO_ROOT, encoding: 'utf8' },
      );
      const declined = spawnSync(
        process.execPath,
        [tsxCli, CLI_PATH, '--handoff', handoffPath, '--decision', declinedPath],
        { cwd: REPO_ROOT, encoding: 'utf8' },
      );

      expect(approved.status).toBe(0);
      expect(approved.stderr).toBe('');
      expect(JSON.parse(approved.stdout)).toMatchObject({
        ok: true,
        status: 'approved-for-separate-publication-action',
        publicationActionRequest: {
          publicationActionPerformed: false,
          socialQueueEnqueued: false,
        },
      });
      expect(declined.status).toBe(1);
      expect(declined.stderr).toBe('');
      expect(JSON.parse(declined.stdout)).toMatchObject({
        ok: false,
        status: 'publication-declined',
        publicationActionRequest: null,
      });
      expect(readdirSync(directory).sort()).toEqual([
        'approved-decision.yaml',
        'completed-handoff.yaml',
        'declined-decision.yaml',
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fails closed at the CLI boundary for missing arguments', () => {
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
      scope: 'validated-publication-action-request-artifact',
      status: 'invalid-owner-decision',
      publicationActionRequest: null,
      controls: {
        enqueuesSocialQueue: false,
        performsPublication: false,
        externalActions: 'none',
      },
    });
  });

  it('documents the exact command and the separate-action boundary', () => {
    const text = `${readFileSync(README_PATH, 'utf8')}\n${readFileSync(
      LOOP_PLAN_PATH,
      'utf8',
    )}`;

    expect(text).toContain(COMMAND);
    expect(text).toMatch(/exact reviewed draft/i);
    expect(text).toMatch(/does not (?:select|choose) a publication (?:target|channel)/i);
    expect(text).toMatch(/does not (?:enqueue|write to) (?:the )?social queue/i);
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
    const module = loadModule();
    expect(module).toBeDefined();
    if (!module) return;
    const before = projectionReceipt();
    const handoffYamlText = completedHandoffYaml();
    await module.prepareResearchMarketingPublicationActionRequestArtifact({
      handoffYamlText,
      decisionYamlText: await completedDecisionYaml(handoffYamlText),
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });
    expect(projectionReceipt()).toBe(before);
  });
});
