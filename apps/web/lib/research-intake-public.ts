import {
  RESEARCH_INTAKE_SELECTION_POLICY,
  RESEARCH_INTAKE_WORKFLOW,
  SYSTEMATIC_RESEARCH_INTAKE,
  SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
  summarizeResearchIntake,
  type ResearchIntakeRecord,
} from './research-intake';
import {
  buildResearchIntakeCandidateHref,
  buildResearchIntakeCandidateNavigation,
  type ResearchIntakeCandidateNavigation,
} from './research-intake-candidate-navigation';
import {
  buildResearchIntakeEvidenceState,
  summarizeResearchIntakeEvidenceStates,
  type ResearchIntakeEvidenceState,
} from './research-intake-evidence-state';
import {
  buildResearchIntakePublicStartHere,
  type ResearchIntakeCurrentResource,
  type ResearchIntakePublicStartHere,
} from './research-intake-start-here';

export type ResearchIntakePublicEvidenceBasis =
  | 'upstream-gross-discovery-only'
  | 'tradeclaw-source-audit-only'
  | 'tradeclaw-replication-record';

export const RESEARCH_INTAKE_PUBLIC_RESOURCES = Object.freeze({
  overview: '/api/research/intake/overview',
  evidenceBrief: '/api/research/intake/brief.md',
  catalog: '/api/research/intake',
  catalogCsv: '/api/research/intake.csv',
  evidenceIndex: '/api/research/intake/evidence/index',
  evidenceIndexBrief: '/api/research/intake/evidence/index.md',
  evidence: '/api/research/intake/evidence',
  evidenceCsv: '/api/research/intake/evidence.csv',
} as const);

const RESEARCH_INTAKE_PUBLIC_EVIDENCE_RECORDS = SYSTEMATIC_RESEARCH_INTAKE.filter(
  (record) => record.tradeClawSourceAudit !== null || record.tradeClawEvidence !== null,
);

export interface ResearchIntakePublicRecordLinks {
  candidate: string;
}

export type ResearchIntakePublicRecord = Omit<
  ResearchIntakeRecord,
  'nextAction' | 'marketingDisposition'
> & {
  evidenceBasis: ResearchIntakePublicEvidenceBasis;
  evidenceState: ResearchIntakeEvidenceState;
  links: ResearchIntakePublicRecordLinks;
};

export interface ResearchIntakePublicPayload {
  schemaVersion: 1;
  access: {
    mode: 'public-read-only';
    requiresAuthentication: false;
    requiresApiKey: false;
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
  };
  resources: typeof RESEARCH_INTAKE_PUBLIC_RESOURCES;
  startHere: ResearchIntakePublicStartHere;
  source: typeof SYSTEMATIC_RESEARCH_INTAKE_SOURCE;
  selectionPolicy: string;
  workflow: typeof RESEARCH_INTAKE_WORKFLOW;
  claimBoundary: {
    upstreamMetrics: string;
    sourceAudit: string;
    replication: string;
    authority: string;
  };
  catalogSummary: ReturnType<typeof summarizeResearchIntake>;
  catalogEvidenceStateSummary: ReturnType<typeof summarizeResearchIntakeEvidenceStates>;
  records: readonly ResearchIntakePublicRecord[];
}

export type ResearchIntakePublicCandidatePayload = Omit<
  ResearchIntakePublicPayload,
  'records'
> & {
  navigation: ResearchIntakeCandidateNavigation;
  record: ResearchIntakePublicRecord;
};

export type ResearchIntakePublicEvidencePayload = Omit<
  ResearchIntakePublicPayload,
  'records'
> & {
  evidenceIndex: {
    selection: 'all-candidates-with-tradeclaw-source-audit-or-replication';
    order: 'pinned-source-order';
    performanceRanked: false;
    includesEveryAvailableOverlay: true;
  };
  evidenceSummary: ReturnType<typeof summarizeResearchIntake>;
  evidenceStateSummary: ReturnType<typeof summarizeResearchIntakeEvidenceStates>;
  records: readonly ResearchIntakePublicRecord[];
};

export type ResearchIntakePublicOverviewPayload = Omit<
  ResearchIntakePublicPayload,
  'records'
> & Pick<
  ResearchIntakePublicEvidencePayload,
  'evidenceSummary' | 'evidenceStateSummary'
>;

export type ResearchIntakeEvidenceIndexState = Pick<
  ResearchIntakeEvidenceState,
  'performanceEvidenceStatus' | 'label' | 'performanceGatesEvaluated' | 'taskId'
> & {
  decisionSummary: string;
  evidenceRecordedOn: string;
};

export interface ResearchIntakePublicEvidenceIndexItem {
  evidencePosition: number;
  candidate: Pick<
    ResearchIntakePublicRecord,
    | 'id'
    | 'title'
    | 'assetClass'
    | 'sourcePosition'
    | 'stage'
    | 'verdict'
    | 'costStatus'
    | 'evidenceBasis'
  > & {
    evidenceState: ResearchIntakeEvidenceIndexState;
  };
  links: ResearchIntakePublicRecordLinks;
}

export interface ResearchIntakePublicEvidenceIndexPayload
  extends ResearchIntakePublicOverviewPayload {
  evidenceIndex: ResearchIntakePublicEvidencePayload['evidenceIndex'];
  items: readonly ResearchIntakePublicEvidenceIndexItem[];
}

function evidenceBasisFor(record: ResearchIntakeRecord): ResearchIntakePublicEvidenceBasis {
  if (record.tradeClawEvidence) return 'tradeclaw-replication-record';
  if (record.tradeClawSourceAudit) return 'tradeclaw-source-audit-only';
  return 'upstream-gross-discovery-only';
}

function toPublicRecord(record: ResearchIntakeRecord): ResearchIntakePublicRecord {
  // Deliberate allow-list: adding an admin field to ResearchIntakeRecord cannot
  // silently expose it through this public read model.
  return {
    id: record.id,
    title: record.title,
    sourceUrl: record.sourceUrl,
    assetClass: record.assetClass,
    upstreamGrossSharpe: record.upstreamGrossSharpe,
    upstreamTStatistic: record.upstreamTStatistic,
    upstreamVolatilityPct: record.upstreamVolatilityPct,
    upstreamYearsTested: record.upstreamYearsTested,
    sourcePosition: record.sourcePosition,
    discoveryBasis: record.discoveryBasis,
    stage: record.stage,
    verdict: record.verdict,
    costStatus: record.costStatus,
    evidenceBasis: evidenceBasisFor(record),
    evidenceState: buildResearchIntakeEvidenceState(record),
    links: {
      candidate: buildResearchIntakeCandidateHref(record.id, 'public'),
    },
    tradeClawSourceAudit: record.tradeClawSourceAudit,
    tradeClawEvidence: record.tradeClawEvidence,
  };
}

function compactEvidenceState(
  record: ResearchIntakeRecord,
): ResearchIntakeEvidenceIndexState {
  const state = buildResearchIntakeEvidenceState(record);
  if (state.decisionSummary === null || state.evidenceRecordedOn === null) {
    throw new Error(`examined research record ${record.id} has incomplete decision context`);
  }
  return {
    performanceEvidenceStatus: state.performanceEvidenceStatus,
    label: state.label,
    performanceGatesEvaluated: state.performanceGatesEvaluated,
    taskId: state.taskId,
    decisionSummary: state.decisionSummary,
    evidenceRecordedOn: state.evidenceRecordedOn,
  };
}

function toPublicEvidenceIndexItem(
  record: ResearchIntakeRecord,
  index: number,
): ResearchIntakePublicEvidenceIndexItem {
  const projected = toPublicRecord(record);
  return {
    evidencePosition: index + 1,
    candidate: {
      id: projected.id,
      title: projected.title,
      assetClass: projected.assetClass,
      sourcePosition: projected.sourcePosition,
      stage: projected.stage,
      verdict: projected.verdict,
      costStatus: projected.costStatus,
      evidenceBasis: projected.evidenceBasis,
      evidenceState: compactEvidenceState(record),
    },
    links: projected.links,
  };
}

function buildResearchIntakePublicContext(
  currentResource: ResearchIntakeCurrentResource,
): Omit<ResearchIntakePublicPayload, 'records'> {
  return {
    schemaVersion: 1,
    access: {
      mode: 'public-read-only',
      requiresAuthentication: false,
      requiresApiKey: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    },
    resources: RESEARCH_INTAKE_PUBLIC_RESOURCES,
    startHere: buildResearchIntakePublicStartHere(
      RESEARCH_INTAKE_PUBLIC_EVIDENCE_RECORDS.length,
      RESEARCH_INTAKE_PUBLIC_RESOURCES,
      currentResource,
    ),
    source: SYSTEMATIC_RESEARCH_INTAKE_SOURCE,
    selectionPolicy: RESEARCH_INTAKE_SELECTION_POLICY,
    workflow: RESEARCH_INTAKE_WORKFLOW,
    claimBoundary: {
      upstreamMetrics:
        'Sharpe, t-statistic, volatility, and years are upstream gross discovery-only metadata. They are not TradeClaw results, scores, or promotion evidence.',
      sourceAudit:
        'A TradeClaw source audit records reconstructibility and feasibility. A no-go is not a local performance failure when no TradeClaw backtest ran.',
      replication:
        'TradeClaw replication records are modeled historical research, not live performance or broker fills. A QA-stopped record can contain no performance result.',
      authority:
        'This read-only response grants no authority to publish claims, select a strategy, allocate capital, broadcast a signal, or place a trade.',
    },
    catalogSummary: summarizeResearchIntake(SYSTEMATIC_RESEARCH_INTAKE),
    catalogEvidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      SYSTEMATIC_RESEARCH_INTAKE,
    ),
  };
}

/**
 * Compact, record-free orientation projection. It preserves the complete
 * evidence interpretation and claim boundaries without transferring candidate
 * bodies merely to render a first screen.
 */
export function buildResearchIntakePublicOverviewPayload(): ResearchIntakePublicOverviewPayload {
  return {
    ...buildResearchIntakePublicContext('overview'),
    evidenceSummary: summarizeResearchIntake(RESEARCH_INTAKE_PUBLIC_EVIDENCE_RECORDS),
    evidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      RESEARCH_INTAKE_PUBLIC_EVIDENCE_RECORDS,
    ),
  };
}

/**
 * Lightweight source-ordered bridge from overview to exact candidate detail.
 * Complete source audits and replication bodies remain on the existing
 * evidence and candidate resources.
 */
export function buildResearchIntakePublicEvidenceIndexPayload(): ResearchIntakePublicEvidenceIndexPayload {
  return {
    ...buildResearchIntakePublicContext('evidence-index'),
    evidenceSummary: summarizeResearchIntake(RESEARCH_INTAKE_PUBLIC_EVIDENCE_RECORDS),
    evidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      RESEARCH_INTAKE_PUBLIC_EVIDENCE_RECORDS,
    ),
    evidenceIndex: {
      selection: 'all-candidates-with-tradeclaw-source-audit-or-replication',
      order: 'pinned-source-order',
      performanceRanked: false,
      includesEveryAvailableOverlay: true,
    },
    items: RESEARCH_INTAKE_PUBLIC_EVIDENCE_RECORDS.map(toPublicEvidenceIndexItem),
  };
}

/**
 * Stable, filter-free projection of the pinned source catalog and completed
 * TradeClaw evidence overlays. Admin timing, next-action, and marketing state
 * are intentionally absent.
 */
export function buildResearchIntakePublicPayload(): ResearchIntakePublicPayload {
  return {
    ...buildResearchIntakePublicContext('catalog'),
    records: SYSTEMATIC_RESEARCH_INTAKE.map(toPublicRecord),
  };
}

/**
 * Complete evidence-only projection. Every available source-audit or replication
 * overlay is retained in pinned source order, including adverse and no-go records.
 */
export function buildResearchIntakePublicEvidencePayload(): ResearchIntakePublicEvidencePayload {
  return {
    ...buildResearchIntakePublicContext('evidence'),
    evidenceIndex: {
      selection: 'all-candidates-with-tradeclaw-source-audit-or-replication',
      order: 'pinned-source-order',
      performanceRanked: false,
      includesEveryAvailableOverlay: true,
    },
    evidenceSummary: summarizeResearchIntake(RESEARCH_INTAKE_PUBLIC_EVIDENCE_RECORDS),
    evidenceStateSummary: summarizeResearchIntakeEvidenceStates(
      RESEARCH_INTAKE_PUBLIC_EVIDENCE_RECORDS,
    ),
    records: RESEARCH_INTAKE_PUBLIC_EVIDENCE_RECORDS.map(toPublicRecord),
  };
}

/**
 * Exact canonical-ID projection for one pinned candidate. No title, task-ID,
 * case-insensitive, trimmed, or fuzzy aliases are accepted.
 */
export function buildResearchIntakePublicCandidatePayload(
  candidateId: string,
): ResearchIntakePublicCandidatePayload | null {
  const candidate = SYSTEMATIC_RESEARCH_INTAKE.find((record) => record.id === candidateId);
  if (!candidate) return null;
  const navigation = buildResearchIntakeCandidateNavigation(candidateId, 'public');
  if (!navigation) return null;

  return {
    ...buildResearchIntakePublicContext('candidate'),
    navigation,
    record: toPublicRecord(candidate),
  };
}
