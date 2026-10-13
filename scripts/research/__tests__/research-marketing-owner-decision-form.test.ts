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

const REPO_ROOT = resolve(__dirname, '../../..');
const TEMPLATE_MODULE_PATH = resolve(
  REPO_ROOT,
  'scripts/research/research-marketing-owner-decision-template.ts',
);
const VALIDATOR_MODULE_PATH = resolve(
  REPO_ROOT,
  'scripts/research/research-marketing-owner-decision-validator.ts',
);
const PREPARE_CLI_PATH = resolve(
  REPO_ROOT,
  'scripts/research/prepare-marketing-owner-decision-template.ts',
);
const VALIDATE_CLI_PATH = resolve(
  REPO_ROOT,
  'scripts/research/validate-marketing-owner-decision.ts',
);
const PACKAGE_PATH = resolve(REPO_ROOT, 'package.json');
const README_PATH = resolve(REPO_ROOT, 'README.md');
const LOOP_PLAN_PATH = resolve(
  REPO_ROOT,
  'docs/plans/2026-08-29-three-hour-research-marketing-loop.md',
);
const PREPARE_COMMAND =
  'npm run prepare:research-owner-decision-template -- --file <completed-handoff.yaml>';
const VALIDATE_COMMAND =
  'npm run validate:research-owner-decision -- --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>';
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REVIEWED_AT = '2026-08-29T16:05:00.000Z';
const DECIDED_AT = '2026-08-29T16:10:00.000Z';
const VALIDATION_NOW = '2026-08-30T00:00:00.000Z';
const ALLOWED_OUTCOMES = [
  'decline-publication',
  'request-draft-revision',
  'approve-draft-for-separate-publication-action',
] as const;

type OwnerOutcome = (typeof ALLOWED_OUTCOMES)[number];

interface OwnerDecisionTemplate {
  schemaVersion: 1;
  formStatus: 'manual-owner-decision-not-recorded-by-tradeclaw';
  requestBinding: {
    taskId: string;
    candidateId: string;
    completedHandoffBytes: number;
    completedHandoffSha256: string;
    evidenceManifestSha256: string;
    requestFingerprint: {
      algorithm: 'sha256';
      canonicalization: 'json-pretty-2-space-lf-utf8-v1';
      bytes: number;
      sha256: string;
    };
  };
  ownerDecisionRequest: Record<string, unknown>;
  allowedOutcomes: readonly OwnerOutcome[];
  owner: string;
  decidedAt: string;
  outcome: string;
  notes: string;
  decisionRecordedByTradeClaw: false;
  publicationActionPerformed: false;
  automaticPublication: false;
  automaticPosting: false;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
  externalActions: 'none';
}

interface TemplatePreparation {
  schemaVersion: 1;
  ok: boolean;
  scope: 'validated-owner-decision-template';
  status: string;
  template: OwnerDecisionTemplate | null;
  yaml: string | null;
  nextAction: string;
  issueCount: number;
  controls: {
    writesFiles: false;
    recordsOwnerDecision: false;
    performsPublication: false;
    automaticPublication: false;
    automaticPosting: false;
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
    externalActions: 'none';
  };
}

interface DecisionValidationReport {
  schemaVersion: 1;
  ok: boolean;
  scope: 'manual-owner-decision-form-and-current-evidence';
  workflow: {
    status:
      | 'invalid-owner-decision'
      | 'publication-declined'
      | 'draft-revision-requested'
      | 'approved-for-separate-publication-action';
    nextAction: string;
  };
  request: {
    taskId: string | null;
    candidateId: string | null;
    completedHandoffSha256: string | null;
    evidenceManifestSha256: string | null;
    requestFingerprintSha256: string | null;
    readyHandoffSatisfied: boolean;
  };
  decision: {
    owner: string | null;
    decidedAt: string | null;
    outcome: string | null;
    notes: string | null;
    publicationApprovedForSeparateAction: boolean;
  };
  issues: { code: string; path: string; message: string }[];
  controls: {
    writesFiles: false;
    recordsOwnerDecision: false;
    performsPublication: false;
    automaticPublication: false;
    automaticPosting: false;
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
    externalActions: 'none';
  };
}

interface TemplateModule {
  prepareResearchMarketingOwnerDecisionTemplate(options: {
    yamlText: string;
    root?: string;
    now?: Date | string | number;
    readEvidenceText?: (
      absolutePath: string,
      repositoryPath: string,
    ) => Promise<string>;
  }): Promise<TemplatePreparation>;
}

interface ValidatorModule {
  validateResearchMarketingOwnerDecision(options: {
    handoffYamlText: string;
    decisionYamlText: string;
    root?: string;
    now?: Date | string | number;
    readEvidenceText?: (
      absolutePath: string,
      repositoryPath: string,
    ) => Promise<string>;
  }): Promise<DecisionValidationReport>;
}

function loadTemplateModule(): TemplateModule | undefined {
  if (!existsSync(TEMPLATE_MODULE_PATH)) return undefined;
  return require(TEMPLATE_MODULE_PATH) as TemplateModule;
}

function loadValidatorModule(): ValidatorModule | undefined {
  if (!existsSync(VALIDATOR_MODULE_PATH)) return undefined;
  return require(VALIDATOR_MODULE_PATH) as ValidatorModule;
}

function completedHandoffYaml(
  outcome:
    | 'reject-draft'
    | 'needs-revision'
    | 'ready-for-separate-owner-decision' = 'ready-for-separate-owner-decision',
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

function completedDecisionYaml(
  templateYaml: string,
  outcome: OwnerOutcome,
  mutate?: (record: Record<string, unknown>) => void,
): string {
  const record = parse(templateYaml) as Record<string, unknown>;
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

async function prepare(
  handoffYamlText: string,
): Promise<TemplatePreparation | undefined> {
  const module = loadTemplateModule();
  expect(module).toBeDefined();
  if (!module) return undefined;
  return module.prepareResearchMarketingOwnerDecisionTemplate({
    yamlText: handoffYamlText,
    root: REPO_ROOT,
    now: VALIDATION_NOW,
  });
}

async function readyFixture(): Promise<{
  handoffYaml: string;
  templateYaml: string;
}> {
  const handoffYaml = completedHandoffYaml();
  const prepared = await prepare(handoffYaml);
  if (!prepared?.yaml) throw new Error('owner-decision template is unavailable');
  return { handoffYaml, templateYaml: prepared.yaml };
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

describe('canonical manual owner-decision form', () => {
  it('registers preparation and validation modules, CLIs, and package commands', () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(existsSync(TEMPLATE_MODULE_PATH)).toBe(true);
    expect(existsSync(VALIDATOR_MODULE_PATH)).toBe(true);
    expect(existsSync(PREPARE_CLI_PATH)).toBe(true);
    expect(existsSync(VALIDATE_CLI_PATH)).toBe(true);
    expect(packageJson.scripts['prepare:research-owner-decision-template']).toBe(
      'npx tsx scripts/research/prepare-marketing-owner-decision-template.ts',
    );
    expect(packageJson.scripts['validate:research-owner-decision']).toBe(
      'npx tsx scripts/research/validate-marketing-owner-decision.ts',
    );
  });

  it('builds a ready-only blank YAML form bound to the exact request and evidence', async () => {
    const handoffYaml = completedHandoffYaml();
    const prepared = await prepare(handoffYaml);
    if (!prepared?.template || !prepared.yaml) return;
    const parsed = parse(prepared.yaml) as OwnerDecisionTemplate;

    expect(prepared).toMatchObject({
      schemaVersion: 1,
      ok: true,
      scope: 'validated-owner-decision-template',
      status: 'ready-for-separate-owner-decision',
      issueCount: 0,
      controls: {
        writesFiles: false,
        recordsOwnerDecision: false,
        performsPublication: false,
        automaticPublication: false,
        automaticPosting: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
        externalActions: 'none',
      },
    });
    expect(parsed).toEqual(prepared.template);
    expect(prepared.template).toMatchObject({
      schemaVersion: 1,
      formStatus: 'manual-owner-decision-not-recorded-by-tradeclaw',
      requestBinding: {
        taskId: 'TC-255',
        candidateId:
          'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
        completedHandoffBytes: Buffer.byteLength(handoffYaml, 'utf8'),
        completedHandoffSha256: createHash('sha256').update(handoffYaml).digest('hex'),
        evidenceManifestSha256:
          'baa1778585d32bd9a5b99f2dc7a7157d8b29f32f7046b5c83610e4b051c170a8',
        requestFingerprint: {
          algorithm: 'sha256',
          canonicalization: 'json-pretty-2-space-lf-utf8-v1',
        },
      },
      allowedOutcomes: ALLOWED_OUTCOMES,
      owner: '',
      decidedAt: '',
      outcome: '',
      notes: '',
      decisionRecordedByTradeClaw: false,
      publicationActionPerformed: false,
      automaticPublication: false,
      automaticPosting: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
      externalActions: 'none',
    });
  });

  it('replays byte-identically and changes its request binding with the handoff', async () => {
    const first = await prepare(completedHandoffYaml());
    const replay = await prepare(completedHandoffYaml());
    const changed = await prepare(completedHandoffYaml(
      'ready-for-separate-owner-decision',
      (record) => {
        record.notes = 'Evidence and framing checks are complete. Owner context changed.';
      },
    ));
    if (!first?.template || !replay?.template || !changed?.template) return;

    expect(replay.yaml).toBe(first.yaml);
    expect(changed.template.requestBinding.completedHandoffSha256).not.toBe(
      first.template.requestBinding.completedHandoffSha256,
    );
    expect(changed.template.requestBinding.requestFingerprint.sha256).not.toBe(
      first.template.requestBinding.requestFingerprint.sha256,
    );
  });

  it.each([
    ['reject-draft', 'draft-rejected'],
    ['needs-revision', 'revision-required'],
  ] as const)('refuses a %s handoff without producing a decision form', async (outcome, status) => {
    const prepared = await prepare(completedHandoffYaml(outcome));
    if (!prepared) return;
    expect(prepared).toMatchObject({
      ok: false,
      status,
      template: null,
      yaml: null,
    });
  });

  it.each([
    ['decline-publication', 'publication-declined', false],
    ['request-draft-revision', 'draft-revision-requested', false],
    [
      'approve-draft-for-separate-publication-action',
      'approved-for-separate-publication-action',
      true,
    ],
  ] as const)(
    'validates %s without persisting or performing an action',
    async (outcome, status, approved) => {
      const validator = loadValidatorModule();
      expect(validator).toBeDefined();
      if (!validator) return;
      const { handoffYaml, templateYaml } = await readyFixture();
      const report = await validator.validateResearchMarketingOwnerDecision({
        handoffYamlText: handoffYaml,
        decisionYamlText: completedDecisionYaml(templateYaml, outcome),
        root: REPO_ROOT,
        now: VALIDATION_NOW,
      });

      expect(report).toMatchObject({
        schemaVersion: 1,
        ok: true,
        scope: 'manual-owner-decision-form-and-current-evidence',
        workflow: { status },
        request: {
          taskId: 'TC-255',
          candidateId:
            'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
          readyHandoffSatisfied: true,
        },
        decision: {
          owner: 'TradeClaw owner',
          decidedAt: DECIDED_AT,
          outcome,
          publicationApprovedForSeparateAction: approved,
        },
        issues: [],
        controls: {
          writesFiles: false,
          recordsOwnerDecision: false,
          performsPublication: false,
          automaticPublication: false,
          automaticPosting: false,
          grantsPublicationAuthority: false,
          grantsTradingAuthority: false,
          externalActions: 'none',
        },
      });
      expect(report.workflow.nextAction).toMatch(/separate|archive|revision/i);
    },
  );

  it.each([
    ['unknown field', (record: Record<string, unknown>) => { record.surprise = true; }],
    ['changed request', (record: Record<string, unknown>) => {
      const request = record.ownerDecisionRequest as Record<string, unknown>;
      request.taskId = 'TC-999';
    }],
    ['blank owner', (record: Record<string, unknown>) => { record.owner = ' '; }],
    ['timezone-less decision', (record: Record<string, unknown>) => {
      record.decidedAt = '2026-08-29T16:10:00';
    }],
    ['decision before review', (record: Record<string, unknown>) => {
      record.decidedAt = '2026-08-29T16:00:00.000Z';
    }],
    ['future decision', (record: Record<string, unknown>) => {
      record.decidedAt = '2026-08-30T00:00:00.001Z';
    }],
    ['invented outcome', (record: Record<string, unknown>) => {
      record.outcome = 'approve-trading';
    }],
    ['blank notes', (record: Record<string, unknown>) => { record.notes = ''; }],
  ] as const)('fails closed for %s', async (_label, mutate) => {
    const validator = loadValidatorModule();
    expect(validator).toBeDefined();
    if (!validator) return;
    const { handoffYaml, templateYaml } = await readyFixture();
    const report = await validator.validateResearchMarketingOwnerDecision({
      handoffYamlText: handoffYaml,
      decisionYamlText: completedDecisionYaml(
        templateYaml,
        'approve-draft-for-separate-publication-action',
        mutate,
      ),
      root: REPO_ROOT,
      now: VALIDATION_NOW,
    });

    expect(report.ok).toBe(false);
    expect(report.workflow.status).toBe('invalid-owner-decision');
    expect(report.decision.publicationApprovedForSeparateAction).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.controls.performsPublication).toBe(false);
  });

  it('fails closed when current repository evidence no longer matches', async () => {
    const validator = loadValidatorModule();
    expect(validator).toBeDefined();
    if (!validator) return;
    const { handoffYaml, templateYaml } = await readyFixture();
    const report = await validator.validateResearchMarketingOwnerDecision({
      handoffYamlText: handoffYaml,
      decisionYamlText: completedDecisionYaml(
        templateYaml,
        'approve-draft-for-separate-publication-action',
      ),
      root: REPO_ROOT,
      now: VALIDATION_NOW,
      readEvidenceText: async (absolutePath) =>
        `${readFileSync(absolutePath, 'utf8')}\nintentional-drift`,
    });

    expect(report.ok).toBe(false);
    expect(report.workflow.status).toBe('invalid-owner-decision');
    expect(report.request.readyHandoffSatisfied).toBe(false);
    expect(report.decision.publicationApprovedForSeparateAction).toBe(false);
  });

  it('runs both real CLIs with explicit local files and no implicit output file', async () => {
    expect(existsSync(PREPARE_CLI_PATH)).toBe(true);
    expect(existsSync(VALIDATE_CLI_PATH)).toBe(true);
    if (!existsSync(PREPARE_CLI_PATH) || !existsSync(VALIDATE_CLI_PATH)) return;
    const directory = mkdtempSync(join(tmpdir(), 'tradeclaw-owner-decision-'));
    try {
      const handoffPath = join(directory, 'completed-handoff.yaml');
      const decisionPath = join(directory, 'completed-owner-decision.yaml');
      const handoffYaml = completedHandoffYaml();
      writeFileSync(handoffPath, handoffYaml, 'utf8');
      const tsxCli = require.resolve('tsx/cli');
      const prepared = spawnSync(
        process.execPath,
        [tsxCli, PREPARE_CLI_PATH, '--file', handoffPath],
        { cwd: REPO_ROOT, encoding: 'utf8' },
      );

      expect(prepared.status).toBe(0);
      expect(prepared.stderr).toBe('');
      expect(parse(prepared.stdout)).toMatchObject({ owner: '', outcome: '' });
      writeFileSync(
        decisionPath,
        completedDecisionYaml(
          prepared.stdout,
          'approve-draft-for-separate-publication-action',
        ),
        'utf8',
      );
      const validated = spawnSync(
        process.execPath,
        [
          tsxCli,
          VALIDATE_CLI_PATH,
          '--handoff',
          handoffPath,
          '--decision',
          decisionPath,
        ],
        { cwd: REPO_ROOT, encoding: 'utf8' },
      );

      expect(validated.status).toBe(0);
      expect(validated.stderr).toBe('');
      expect(JSON.parse(validated.stdout)).toMatchObject({
        ok: true,
        workflow: { status: 'approved-for-separate-publication-action' },
        controls: { performsPublication: false, externalActions: 'none' },
      });
      expect(readdirSync(directory).sort()).toEqual([
        'completed-handoff.yaml',
        'completed-owner-decision.yaml',
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('keeps both real CLIs fail-closed for non-ready, tampered, and missing input', async () => {
    expect(existsSync(PREPARE_CLI_PATH)).toBe(true);
    expect(existsSync(VALIDATE_CLI_PATH)).toBe(true);
    if (!existsSync(PREPARE_CLI_PATH) || !existsSync(VALIDATE_CLI_PATH)) return;
    const directory = mkdtempSync(join(tmpdir(), 'tradeclaw-owner-decision-invalid-'));
    try {
      const rejectedHandoffPath = join(directory, 'rejected-handoff.yaml');
      const readyHandoffPath = join(directory, 'ready-handoff.yaml');
      const tamperedDecisionPath = join(directory, 'tampered-decision.yaml');
      const { handoffYaml, templateYaml } = await readyFixture();
      writeFileSync(rejectedHandoffPath, completedHandoffYaml('reject-draft'), 'utf8');
      writeFileSync(readyHandoffPath, handoffYaml, 'utf8');
      writeFileSync(
        tamperedDecisionPath,
        completedDecisionYaml(
          templateYaml,
          'approve-draft-for-separate-publication-action',
          (record) => {
            const request = record.ownerDecisionRequest as Record<string, unknown>;
            request.taskId = 'TC-999';
          },
        ),
        'utf8',
      );
      const tsxCli = require.resolve('tsx/cli');
      const rejected = spawnSync(
        process.execPath,
        [tsxCli, PREPARE_CLI_PATH, '--file', rejectedHandoffPath],
        { cwd: REPO_ROOT, encoding: 'utf8' },
      );
      const tampered = spawnSync(
        process.execPath,
        [
          tsxCli,
          VALIDATE_CLI_PATH,
          '--handoff',
          readyHandoffPath,
          '--decision',
          tamperedDecisionPath,
        ],
        { cwd: REPO_ROOT, encoding: 'utf8' },
      );
      const missing = spawnSync(
        process.execPath,
        [tsxCli, VALIDATE_CLI_PATH, '--handoff', readyHandoffPath],
        { cwd: REPO_ROOT, encoding: 'utf8' },
      );

      expect(rejected.status).toBe(1);
      expect(rejected.stdout).toBe('');
      expect(JSON.parse(rejected.stderr)).toMatchObject({
        ok: false,
        status: 'draft-rejected',
        template: null,
        controls: { performsPublication: false, externalActions: 'none' },
      });
      expect(tampered.status).toBe(1);
      expect(tampered.stderr).toBe('');
      expect(JSON.parse(tampered.stdout)).toMatchObject({
        ok: false,
        workflow: { status: 'invalid-owner-decision' },
        decision: { publicationApprovedForSeparateAction: false },
        controls: { performsPublication: false, externalActions: 'none' },
      });
      expect(missing.status).toBe(1);
      expect(missing.stdout).toBe('');
      expect(JSON.parse(missing.stderr)).toMatchObject({
        ok: false,
        workflow: { status: 'invalid-owner-decision' },
        controls: { performsPublication: false, externalActions: 'none' },
      });
      expect(readdirSync(directory).sort()).toEqual([
        'ready-handoff.yaml',
        'rejected-handoff.yaml',
        'tampered-decision.yaml',
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('documents both commands, the manual identity limit, and the non-action boundary', () => {
    for (const body of [
      readFileSync(README_PATH, 'utf8'),
      readFileSync(LOOP_PLAN_PATH, 'utf8'),
    ]) {
      expect(body).toContain(PREPARE_COMMAND);
      expect(body).toContain(VALIDATE_COMMAND);
      expect(body).toMatch(/identity.*(?:not authenticated|not a signature)/i);
      expect(body).toMatch(/does not.*(?:persist|record).*owner decision/i);
      expect(body).toMatch(/does not.*(?:publish|publication action)/i);
      expect(body).toMatch(/separate.*publication action/i);
    }
  });

  it('keeps implementation sources free of persistence, network, and outbound actions', () => {
    for (const path of [
      TEMPLATE_MODULE_PATH,
      VALIDATOR_MODULE_PATH,
      PREPARE_CLI_PATH,
      VALIDATE_CLI_PATH,
    ]) {
      expect(existsSync(path)).toBe(true);
    }
    if ([
      TEMPLATE_MODULE_PATH,
      VALIDATOR_MODULE_PATH,
      PREPARE_CLI_PATH,
      VALIDATE_CLI_PATH,
    ].some((path) => !existsSync(path))) return;
    const source = [
      TEMPLATE_MODULE_PATH,
      VALIDATOR_MODULE_PATH,
      PREPARE_CLI_PATH,
      VALIDATE_CLI_PATH,
    ].map((path) => readFileSync(path, 'utf8')).join('\n');

    expect(source).not.toMatch(
      /(?:writeFile|appendFile|rename\(|unlink\(|rm\(|fetch\(|https?:\/\/|INSERT|UPDATE|DELETE|publishDraft|postTo|executeTrade|placeOrder)/,
    );
  });

  it('does not alter queue, receipt, public, or CSV projections', async () => {
    const before = projectionReceipt();
    const templateModule = loadTemplateModule();
    const validatorModule = loadValidatorModule();
    if (templateModule && validatorModule) {
      const handoffYaml = completedHandoffYaml();
      const prepared = await templateModule.prepareResearchMarketingOwnerDecisionTemplate({
        yamlText: handoffYaml,
        root: REPO_ROOT,
        now: VALIDATION_NOW,
      });
      if (prepared.yaml) {
        await validatorModule.validateResearchMarketingOwnerDecision({
          handoffYamlText: handoffYaml,
          decisionYamlText: completedDecisionYaml(
            prepared.yaml,
            'approve-draft-for-separate-publication-action',
          ),
          root: REPO_ROOT,
          now: VALIDATION_NOW,
        });
      }
    }
    expect(projectionReceipt()).toBe(before);
  });
});
