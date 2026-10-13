import { stringify } from 'yaml';
import type {
  ResearchMarketingReviewHandoffWorkflowStatus,
  ResearchMarketingReviewOwnerDecisionRequest,
  ValidateResearchMarketingReviewHandoffOptions,
} from './research-marketing-review-handoff-validator';
import {
  prepareResearchMarketingOwnerDecisionRequestArtifact,
  type ResearchMarketingOwnerDecisionRequestFingerprint,
} from './research-marketing-owner-decision-request-artifact';

export const RESEARCH_MARKETING_OWNER_DECISION_OUTCOMES = Object.freeze([
  'decline-publication',
  'request-draft-revision',
  'approve-draft-for-separate-publication-action',
] as const);

export type ResearchMarketingOwnerDecisionOutcome =
  (typeof RESEARCH_MARKETING_OWNER_DECISION_OUTCOMES)[number];

export const RESEARCH_MARKETING_OWNER_DECISION_TEMPLATE_CONTROLS =
  Object.freeze({
    writesFiles: false,
    recordsOwnerDecision: false,
    performsPublication: false,
    automaticPublication: false,
    automaticPosting: false,
    grantsPublicationAuthority: false,
    grantsTradingAuthority: false,
    externalActions: 'none',
  } as const);

export interface ResearchMarketingOwnerDecisionTemplate {
  schemaVersion: 1;
  formStatus: 'manual-owner-decision-not-recorded-by-tradeclaw';
  requestBinding: {
    taskId: string;
    candidateId: string;
    completedHandoffBytes: number;
    completedHandoffSha256: string;
    evidenceManifestSha256: string;
    requestFingerprint: ResearchMarketingOwnerDecisionRequestFingerprint;
  };
  ownerDecisionRequest: ResearchMarketingReviewOwnerDecisionRequest;
  allowedOutcomes: readonly ResearchMarketingOwnerDecisionOutcome[];
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

export interface ResearchMarketingOwnerDecisionTemplatePreparation {
  schemaVersion: 1;
  ok: boolean;
  scope: 'validated-owner-decision-template';
  status: ResearchMarketingReviewHandoffWorkflowStatus;
  template: ResearchMarketingOwnerDecisionTemplate | null;
  yaml: string | null;
  nextAction: string;
  issueCount: number;
  controls: typeof RESEARCH_MARKETING_OWNER_DECISION_TEMPLATE_CONTROLS;
}

export function formatResearchMarketingOwnerDecisionTemplate(
  template: ResearchMarketingOwnerDecisionTemplate,
): string {
  return stringify(template, { lineWidth: 0 });
}

export async function prepareResearchMarketingOwnerDecisionTemplate(
  options: ValidateResearchMarketingReviewHandoffOptions,
): Promise<ResearchMarketingOwnerDecisionTemplatePreparation> {
  const artifact = await prepareResearchMarketingOwnerDecisionRequestArtifact(
    options,
  );
  const request = artifact.ownerDecisionRequest;
  const requestFingerprint = artifact.requestFingerprint;
  const evidenceManifestSha256 = artifact.source.evidenceManifestSha256;

  if (
    !artifact.ok ||
    artifact.status !== 'ready-for-separate-owner-decision' ||
    request === null ||
    requestFingerprint === null ||
    evidenceManifestSha256 === null
  ) {
    return {
      schemaVersion: 1,
      ok: false,
      scope: 'validated-owner-decision-template',
      status: artifact.status,
      template: null,
      yaml: null,
      nextAction: artifact.nextAction,
      issueCount: artifact.issueCount,
      controls: RESEARCH_MARKETING_OWNER_DECISION_TEMPLATE_CONTROLS,
    };
  }

  const template: ResearchMarketingOwnerDecisionTemplate = {
    schemaVersion: 1,
    formStatus: 'manual-owner-decision-not-recorded-by-tradeclaw',
    requestBinding: {
      taskId: request.taskId,
      candidateId: request.candidateId,
      completedHandoffBytes: artifact.source.completedHandoffBytes,
      completedHandoffSha256: artifact.source.completedHandoffSha256,
      evidenceManifestSha256,
      requestFingerprint,
    },
    ownerDecisionRequest: request,
    allowedOutcomes: RESEARCH_MARKETING_OWNER_DECISION_OUTCOMES,
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
  };

  return {
    schemaVersion: 1,
    ok: true,
    scope: 'validated-owner-decision-template',
    status: 'ready-for-separate-owner-decision',
    template,
    yaml: formatResearchMarketingOwnerDecisionTemplate(template),
    nextAction:
      'Complete owner, decidedAt, outcome, and notes in a separate local copy, then validate it with the exact completed handoff; this command records no decision.',
    issueCount: 0,
    controls: RESEARCH_MARKETING_OWNER_DECISION_TEMPLATE_CONTROLS,
  };
}
