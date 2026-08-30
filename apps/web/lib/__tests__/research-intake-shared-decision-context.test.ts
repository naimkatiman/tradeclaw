import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiSpec } from '../openapi';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidenceIndexPayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeEvidenceState } from '../research-intake-evidence-state';
import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';
import { SYSTEMATIC_RESEARCH_INTAKE, type ResearchIntakeRecord } from '../research-intake';

const AUDIT_AT = '2026-08-30T04:04:38.102Z';
const REPO_ROOT = resolve(__dirname, '../../../..');

interface DecisionContext {
  decisionSummary: string | null;
  evidenceRecordedOn: string | null;
}

interface DecisionContextCarrier {
  id: string;
  evidenceState: DecisionContext;
}

interface CompactDecisionItem {
  candidate: DecisionContextCarrier;
}

function canonicalContext(record: ResearchIntakeRecord): DecisionContext {
  return {
    decisionSummary:
      record.tradeClawEvidence?.reason ?? record.tradeClawSourceAudit?.reason ?? null,
    evidenceRecordedOn:
      record.tradeClawEvidence?.studyDate ?? record.tradeClawSourceAudit?.auditDate ?? null,
  };
}

function contextOf(value: unknown): DecisionContext {
  const state = (value as DecisionContextCarrier).evidenceState;
  return {
    decisionSummary: state.decisionSummary,
    evidenceRecordedOn: state.evidenceRecordedOn,
  };
}

describe('shared research decision context', () => {
  it('derives one validated decision summary and evidence date, with nulls for untouched rows', () => {
    for (const record of SYSTEMATIC_RESEARCH_INTAKE) {
      const expected = canonicalContext(record);
      const state = buildResearchIntakeEvidenceState(record) as unknown as DecisionContext;

      expect(state).toMatchObject(expected);
      if (expected.decisionSummary === null) {
        expect(expected.evidenceRecordedOn).toBeNull();
      } else {
        expect(state.decisionSummary).toBe(state.decisionSummary?.trim());
        expect(state.decisionSummary?.length).toBeLessThanOrEqual(320);
        expect(state.evidenceRecordedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('keeps public catalog, compact index, complete evidence, and exact detail context identical', () => {
    const catalog = buildResearchIntakePublicPayload() as unknown as {
      records: readonly DecisionContextCarrier[];
    };
    const evidence = buildResearchIntakePublicEvidencePayload() as unknown as {
      records: readonly DecisionContextCarrier[];
    };
    const index = buildResearchIntakePublicEvidenceIndexPayload() as unknown as {
      items: readonly CompactDecisionItem[];
    };
    const catalogById = new Map(catalog.records.map((record) => [record.id, record]));
    const evidenceById = new Map(evidence.records.map((record) => [record.id, record]));

    for (const item of index.items) {
      const id = item.candidate.id;
      const detail = buildResearchIntakePublicCandidatePayload(id) as unknown as {
        record: DecisionContextCarrier;
      } | null;
      if (!detail) throw new Error(`${id} public detail is missing`);

      expect(contextOf(catalogById.get(id))).toEqual(contextOf(item.candidate));
      expect(contextOf(evidenceById.get(id))).toEqual(contextOf(item.candidate));
      expect(contextOf(detail.record)).toEqual(contextOf(item.candidate));
    }
    expect(JSON.stringify(index.items)).not.toContain('"nextAction"');
  });

  it('keeps protected catalog, index, evidence, review, and exact detail context identical', () => {
    const catalog = buildResearchIntakeAdminPayload(
      new URLSearchParams('limit=100'),
      AUDIT_AT,
    ) as unknown as { records: readonly DecisionContextCarrier[] };
    const evidence = buildResearchIntakeAdminEvidencePayload(AUDIT_AT) as unknown as {
      items: readonly { record: DecisionContextCarrier }[];
    };
    const index = buildResearchIntakeAdminEvidenceIndexPayload(AUDIT_AT) as unknown as {
      items: readonly CompactDecisionItem[];
    };
    const review = buildResearchIntakeAdminReviewPayload(AUDIT_AT) as unknown as {
      queue: { items: readonly { candidate: DecisionContextCarrier }[] };
    };
    const catalogById = new Map(catalog.records.map((record) => [record.id, record]));
    const evidenceById = new Map(evidence.items.map(({ record }) => [record.id, record]));

    for (const item of index.items) {
      const id = item.candidate.id;
      const detail = buildResearchIntakeAdminCandidatePayload(id, AUDIT_AT) as unknown as {
        record: DecisionContextCarrier;
      } | null;
      if (!detail) throw new Error(`${id} protected detail is missing`);

      expect(contextOf(catalogById.get(id))).toEqual(contextOf(item.candidate));
      expect(contextOf(evidenceById.get(id))).toEqual(contextOf(item.candidate));
      expect(contextOf(detail.record)).toEqual(contextOf(item.candidate));
    }
    for (const item of review.queue.items) {
      expect(contextOf(item.candidate)).toEqual(
        contextOf(catalogById.get(item.candidate.id)),
      );
    }
  });

  it('documents the shared nullable detail fields and required non-null compact fields', () => {
    const spec = buildOpenApiSpec() as unknown as {
      components: {
        schemas: Record<string, {
          required?: string[];
          properties?: Record<string, {
            type?: string | string[];
            format?: string;
            description?: string;
          }>;
        }>;
      };
    };
    const fullState = spec.components.schemas.ResearchIntakePublicRecord
      .properties?.evidenceState as unknown as {
        required?: string[];
        properties?: Record<string, { type?: string | string[]; format?: string }>;
      };
    const compactState = spec.components.schemas.ResearchIntakeEvidenceIndexState;
    const readme = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');
    const api = readme.slice(readme.indexOf('## API'), readme.indexOf('## Notifications'));

    expect(fullState.required).toEqual(expect.arrayContaining([
      'decisionSummary',
      'evidenceRecordedOn',
    ]));
    expect(fullState.properties?.decisionSummary?.type).toEqual(['string', 'null']);
    expect(fullState.properties?.evidenceRecordedOn).toMatchObject({
      type: ['string', 'null'],
      format: 'date',
    });
    expect(compactState.required).toEqual(expect.arrayContaining([
      'decisionSummary',
      'evidenceRecordedOn',
    ]));
    expect(compactState.properties?.decisionSummary?.type).toBe('string');
    expect(compactState.properties?.evidenceRecordedOn).toMatchObject({
      type: 'string',
      format: 'date',
    });
    expect(api).toMatch(/same decision summary.*exact.*detail/i);
    expect(api).toMatch(/canonical evidence date/i);
  });
});
