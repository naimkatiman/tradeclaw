import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiSpec } from '../openapi';
import {
  buildResearchIntakeAdminEvidenceIndexPayload,
  buildResearchIntakeAdminEvidencePayload,
} from '../research-intake-admin';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicEvidencePayload,
} from '../research-intake-public';
import { SYSTEMATIC_RESEARCH_INTAKE, type ResearchIntakeRecord } from '../research-intake';

const AUDIT_AT = '2026-08-30T03:44:18.789Z';
const REPO_ROOT = resolve(__dirname, '../../../..');
const TC255_REASON =
  "The frozen BTC/ETH replication failed after modeled costs: BTC and ETH each lost more than 99% net, neither produced a positive fold, and the fixed portfolio lost 29.53% in holdout; BTC's 0.045% mean gross edge per trade was below 0.40% round-trip friction.";

interface CompactEvidenceStateWithDecision {
  taskId: string;
  decisionSummary: string;
}

interface PublicDecisionItem {
  candidate: {
    evidenceState: CompactEvidenceStateWithDecision;
  };
}

interface AdminDecisionItem extends PublicDecisionItem {
  workflow: {
    nextAction: string;
  };
}

function taskIdOf(record: ResearchIntakeRecord): string | null {
  return record.tradeClawEvidence?.taskId ?? record.tradeClawSourceAudit?.taskId ?? null;
}

function reasonOf(record: ResearchIntakeRecord): string {
  const evidenceReason = (record.tradeClawEvidence as { reason?: unknown } | null)?.reason;
  const auditReason = (record.tradeClawSourceAudit as { reason?: unknown } | null)?.reason;
  const reason = evidenceReason ?? auditReason;
  if (typeof reason !== 'string') {
    throw new Error(`${taskIdOf(record) ?? record.id} has no canonical evidence reason`);
  }
  return reason;
}

describe('compact evidence decision-summary contract', () => {
  it('normalizes the original TC-255 replication with one canonical result reason', () => {
    const record = SYSTEMATIC_RESEARCH_INTAKE.find((candidate) => taskIdOf(candidate) === 'TC-255');
    if (!record) throw new Error('TC-255 record is missing');

    expect((record.tradeClawEvidence as { reason?: string } | null)?.reason).toBe(TC255_REASON);
    expect(reasonOf(record)).toBe(TC255_REASON);
  });

  it('gives every public compact row its evidence-derived reason without exposing next action', () => {
    const payload = buildResearchIntakePublicEvidenceIndexPayload() as unknown as {
      items: readonly PublicDecisionItem[];
    };
    const complete = buildResearchIntakePublicEvidencePayload();
    const recordsByTask = new Map(
      SYSTEMATIC_RESEARCH_INTAKE
        .filter((record) => taskIdOf(record) !== null)
        .map((record) => [taskIdOf(record), record] as const),
    );

    expect(payload.items).toHaveLength(10);
    for (const item of payload.items) {
      const record = recordsByTask.get(item.candidate.evidenceState.taskId);
      if (!record) throw new Error(`${item.candidate.evidenceState.taskId} is not in the catalog`);
      expect(item.candidate.evidenceState.decisionSummary).toBe(reasonOf(record));
      expect(item.candidate.evidenceState.decisionSummary).toBe(
        item.candidate.evidenceState.decisionSummary.trim(),
      );
      expect(item.candidate.evidenceState.decisionSummary.length).toBeLessThanOrEqual(320);
    }
    expect(JSON.stringify(payload.items)).not.toContain('"nextAction"');
    expect(Buffer.byteLength(JSON.stringify(payload), 'utf8')).toBeLessThan(
      Buffer.byteLength(JSON.stringify(complete), 'utf8') * 0.4,
    );
  });

  it('reuses the public reason and adds only the compiled next action to protected workflow', () => {
    const publicPayload = buildResearchIntakePublicEvidenceIndexPayload() as unknown as {
      items: readonly PublicDecisionItem[];
    };
    const adminPayload = buildResearchIntakeAdminEvidenceIndexPayload(AUDIT_AT) as unknown as {
      items: readonly AdminDecisionItem[];
    };
    const complete = buildResearchIntakeAdminEvidencePayload(AUDIT_AT);
    const publicByTask = new Map(publicPayload.items.map((item) => [
      item.candidate.evidenceState.taskId,
      item.candidate.evidenceState.decisionSummary,
    ]));
    const recordsByTask = new Map(
      SYSTEMATIC_RESEARCH_INTAKE
        .filter((record) => taskIdOf(record) !== null)
        .map((record) => [taskIdOf(record), record] as const),
    );

    expect(adminPayload.items).toHaveLength(10);
    for (const item of adminPayload.items) {
      const taskId = item.candidate.evidenceState.taskId;
      const record = recordsByTask.get(taskId);
      if (!record) throw new Error(`${taskId} is not in the catalog`);
      expect(item.candidate.evidenceState.decisionSummary).toBe(publicByTask.get(taskId));
      expect(item.workflow.nextAction).toBe(record.nextAction);
    }
    expect(JSON.stringify(adminPayload.items)).not.toMatch(
      /"(?:tradeClawSourceAudit|tradeClawEvidence|receipts|latestReceipt|marketingHandoff|draft)"/,
    );
    expect(Buffer.byteLength(JSON.stringify(adminPayload), 'utf8')).toBeLessThan(
      Buffer.byteLength(JSON.stringify(complete), 'utf8') * 0.4,
    );
  });

  it('documents the public decision summary and audience boundary', () => {
    const spec = buildOpenApiSpec() as unknown as {
      components: {
        schemas: Record<string, {
          required?: string[];
          properties?: Record<string, { type?: string; description?: string }>;
        }>;
      };
    };
    const stateSchema = spec.components.schemas.ResearchIntakeEvidenceIndexState;
    const readme = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');
    const api = readme.slice(readme.indexOf('## API'), readme.indexOf('## Notifications'));

    expect(stateSchema.required).toContain('decisionSummary');
    expect(stateSchema.properties?.decisionSummary).toMatchObject({ type: 'string' });
    expect(stateSchema.properties?.decisionSummary?.description).toMatch(
      /candidate-specific.*reason|reason.*candidate-specific/i,
    );
    expect(api).toMatch(/evidence-derived decision summary/i);
    expect(api).toMatch(/admin.*next action/i);
  });
});
