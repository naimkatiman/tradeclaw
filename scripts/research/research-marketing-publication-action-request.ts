import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import {
  buildResearchIntakeAdminReviewItemPayload,
  type ResearchIntakeAdminReviewLinks,
} from '../../apps/web/lib/research-intake-admin';
import type { MarketingReviewDraft } from '../../apps/web/lib/research-loop';
import type { ValidateResearchMarketingReviewHandoffOptions } from './research-marketing-review-handoff-validator';
import {
  validateResearchMarketingOwnerDecision,
  type ResearchMarketingOwnerDecisionWorkflowStatus,
} from './research-marketing-owner-decision-validator';

export const RESEARCH_MARKETING_PUBLICATION_ACTION_REQUEST_CONTROLS =
  Object.freeze({
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
  } as const);

export interface ResearchMarketingPublicationFingerprint {
  algorithm: 'sha256';
  canonicalization: 'json-pretty-2-space-lf-utf8-v1';
  bytes: number;
  sha256: string;
}

export interface ResearchMarketingPublicationActionRequest {
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
    draftFingerprint: ResearchMarketingPublicationFingerprint;
  };
  draft: MarketingReviewDraft;
  links: {
    adminCandidate: ResearchIntakeAdminReviewLinks['adminCandidate'];
    publicCandidate: ResearchIntakeAdminReviewLinks['publicCandidate'];
    exactReview: ResearchIntakeAdminReviewLinks['reviewItem'];
    reviewPacket: ResearchIntakeAdminReviewLinks['reviewPacket'];
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

export interface ResearchMarketingPublicationActionRequestArtifact {
  schemaVersion: 1;
  ok: boolean;
  scope: 'validated-publication-action-request-artifact';
  status: ResearchMarketingOwnerDecisionWorkflowStatus;
  sources: {
    completedHandoff: { bytes: number; sha256: string };
    decisionForm: { bytes: number; sha256: string };
  };
  draftFingerprint: ResearchMarketingPublicationFingerprint | null;
  requestFingerprint: ResearchMarketingPublicationFingerprint | null;
  publicationActionRequest: ResearchMarketingPublicationActionRequest | null;
  nextAction: string;
  issueCount: number;
  controls: typeof RESEARCH_MARKETING_PUBLICATION_ACTION_REQUEST_CONTROLS;
}

export interface PrepareResearchMarketingPublicationActionRequestOptions {
  handoffYamlText: string;
  decisionYamlText: string;
  root?: string;
  now?: Date | string | number;
  readEvidenceText?: ValidateResearchMarketingReviewHandoffOptions['readEvidenceText'];
}

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function canonicalizeResearchMarketingPublicationDraft(
  draft: MarketingReviewDraft,
): string {
  return canonicalJson(draft);
}

export function canonicalizeResearchMarketingPublicationActionRequest(
  request: ResearchMarketingPublicationActionRequest,
): string {
  return canonicalJson(request);
}

function fingerprint(canonical: string): ResearchMarketingPublicationFingerprint {
  return {
    algorithm: 'sha256',
    canonicalization: 'json-pretty-2-space-lf-utf8-v1',
    bytes: Buffer.byteLength(canonical, 'utf8'),
    sha256: createHash('sha256').update(canonical, 'utf8').digest('hex'),
  };
}

function reviewedProjectionObservedAt(yamlText: string): string | null {
  try {
    const parsed = parse(yamlText) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    const value = (parsed as Record<string, unknown>).reviewedProjectionObservedAt;
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

function failedArtifact(
  status: ResearchMarketingOwnerDecisionWorkflowStatus,
  sources: ResearchMarketingPublicationActionRequestArtifact['sources'],
  nextAction: string,
  issueCount: number,
): ResearchMarketingPublicationActionRequestArtifact {
  return {
    schemaVersion: 1,
    ok: false,
    scope: 'validated-publication-action-request-artifact',
    status,
    sources,
    draftFingerprint: null,
    requestFingerprint: null,
    publicationActionRequest: null,
    nextAction,
    issueCount,
    controls: RESEARCH_MARKETING_PUBLICATION_ACTION_REQUEST_CONTROLS,
  };
}

export async function prepareResearchMarketingPublicationActionRequestArtifact(
  options: PrepareResearchMarketingPublicationActionRequestOptions,
): Promise<ResearchMarketingPublicationActionRequestArtifact> {
  const validation = await validateResearchMarketingOwnerDecision({
    handoffYamlText: options.handoffYamlText,
    decisionYamlText: options.decisionYamlText,
    root: options.root,
    now: options.now,
    readEvidenceText: options.readEvidenceText,
  });
  const sources = validation.sources;
  const approved =
    validation.ok &&
    validation.workflow.status === 'approved-for-separate-publication-action' &&
    validation.decision.outcome ===
      'approve-draft-for-separate-publication-action' &&
    validation.decision.publicationApprovedForSeparateAction;

  if (!approved) {
    return failedArtifact(
      validation.workflow.status,
      sources,
      validation.workflow.nextAction,
      validation.issues.length,
    );
  }

  const taskId = validation.request.taskId;
  const candidateId = validation.request.candidateId;
  const evidenceManifestSha256 = validation.request.evidenceManifestSha256;
  const ownerDecisionRequestFingerprintSha256 =
    validation.request.requestFingerprintSha256;
  const owner = validation.decision.owner;
  const decidedAt = validation.decision.decidedAt;
  const notes = validation.decision.notes;
  const observedAt = reviewedProjectionObservedAt(options.handoffYamlText);

  if (
    taskId === null ||
    candidateId === null ||
    evidenceManifestSha256 === null ||
    ownerDecisionRequestFingerprintSha256 === null ||
    owner === null ||
    decidedAt === null ||
    notes === null ||
    observedAt === null
  ) {
    return failedArtifact(
      'invalid-owner-decision',
      sources,
      'Revalidate the completed handoff and owner decision; no publication-action request was produced.',
      validation.issues.length + 1,
    );
  }

  const review = buildResearchIntakeAdminReviewItemPayload(taskId, observedAt);
  if (
    review === null ||
    review.reviewItem.handoff.taskId !== taskId ||
    review.reviewItem.candidate.id !== candidateId
  ) {
    return failedArtifact(
      'invalid-owner-decision',
      sources,
      'The exact reviewed projection is unavailable or mismatched; no publication-action request was produced.',
      validation.issues.length + 1,
    );
  }

  const draft = review.reviewItem.handoff.draft;
  const draftFingerprint = fingerprint(
    canonicalizeResearchMarketingPublicationDraft(draft),
  );
  const links = review.reviewItem.links;
  const publicationActionRequest: ResearchMarketingPublicationActionRequest = {
    schemaVersion: 1,
    status: 'request-for-separate-publication-action-not-performed',
    taskId,
    candidateId,
    approvedBySubmittedOwnerDecision: true,
    ownerIdentityAuthenticated: false,
    cryptographicSignatureVerified: false,
    ownerDecision: {
      owner,
      decidedAt,
      outcome: 'approve-draft-for-separate-publication-action',
      notes,
    },
    bindings: {
      completedHandoff: sources.completedHandoff,
      decisionForm: sources.decisionForm,
      evidenceManifestSha256,
      ownerDecisionRequestFingerprintSha256,
      draftFingerprint,
    },
    draft,
    links: {
      adminCandidate: links.adminCandidate,
      publicCandidate: links.publicCandidate,
      exactReview: links.reviewItem,
      reviewPacket: links.reviewPacket,
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
  };
  const requestFingerprint = fingerprint(
    canonicalizeResearchMarketingPublicationActionRequest(
      publicationActionRequest,
    ),
  );

  return {
    schemaVersion: 1,
    ok: true,
    scope: 'validated-publication-action-request-artifact',
    status: 'approved-for-separate-publication-action',
    sources,
    draftFingerprint,
    requestFingerprint,
    publicationActionRequest,
    nextAction:
      'Provide this exact artifact only to a separate, separately authorized publication action; this command did not select a target, enqueue, publish, or post.',
    issueCount: 0,
    controls: RESEARCH_MARKETING_PUBLICATION_ACTION_REQUEST_CONTROLS,
  };
}
