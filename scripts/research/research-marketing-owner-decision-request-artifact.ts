import { createHash } from 'node:crypto';
import {
  validateResearchMarketingReviewHandoff,
  type ResearchMarketingReviewHandoffWorkflowStatus,
  type ResearchMarketingReviewOwnerDecisionRequest,
  type ValidateResearchMarketingReviewHandoffOptions,
} from './research-marketing-review-handoff-validator';

export const RESEARCH_MARKETING_OWNER_REQUEST_ARTIFACT_CONTROLS =
  Object.freeze({
    writesFiles: false,
    recordsReviewCompletion: false,
    recordsOwnerDecision: false,
    publicationApproved: false,
    automaticPublication: false,
    automaticPosting: false,
    grantsPublicationAuthority: false,
    grantsTradingAuthority: false,
    externalActions: 'none',
  } as const);

export interface ResearchMarketingOwnerDecisionRequestFingerprint {
  algorithm: 'sha256';
  canonicalization: 'json-pretty-2-space-lf-utf8-v1';
  bytes: number;
  sha256: string;
}

export interface ResearchMarketingOwnerDecisionRequestArtifact {
  schemaVersion: 1;
  ok: boolean;
  scope: 'validated-owner-decision-request-artifact';
  status: ResearchMarketingReviewHandoffWorkflowStatus;
  source: {
    completedHandoffBytes: number;
    completedHandoffSha256: string;
    evidenceManifestSha256: string | null;
  };
  requestFingerprint: ResearchMarketingOwnerDecisionRequestFingerprint | null;
  ownerDecisionRequest: ResearchMarketingReviewOwnerDecisionRequest | null;
  nextAction: string;
  issueCount: number;
  controls: typeof RESEARCH_MARKETING_OWNER_REQUEST_ARTIFACT_CONTROLS;
}

export function canonicalizeResearchMarketingOwnerDecisionRequest(
  request: ResearchMarketingReviewOwnerDecisionRequest,
): string {
  return `${JSON.stringify(request, null, 2)}\n`;
}

function fingerprintRequest(
  request: ResearchMarketingReviewOwnerDecisionRequest,
): ResearchMarketingOwnerDecisionRequestFingerprint {
  const canonical = canonicalizeResearchMarketingOwnerDecisionRequest(request);
  return {
    algorithm: 'sha256',
    canonicalization: 'json-pretty-2-space-lf-utf8-v1',
    bytes: Buffer.byteLength(canonical, 'utf8'),
    sha256: createHash('sha256').update(canonical, 'utf8').digest('hex'),
  };
}

export async function prepareResearchMarketingOwnerDecisionRequestArtifact(
  options: ValidateResearchMarketingReviewHandoffOptions,
): Promise<ResearchMarketingOwnerDecisionRequestArtifact> {
  const validation = await validateResearchMarketingReviewHandoff(options);
  const request = validation.workflow.ownerDecisionRequest;
  const ready =
    validation.ok &&
    validation.workflow.status === 'ready-for-separate-owner-decision' &&
    request !== null;

  if (!ready) {
    return {
      schemaVersion: 1,
      ok: false,
      scope: 'validated-owner-decision-request-artifact',
      status: validation.workflow.status,
      source: {
        completedHandoffBytes: validation.source.bytes,
        completedHandoffSha256: validation.source.sha256,
        evidenceManifestSha256: validation.review.evidenceManifestSha256,
      },
      requestFingerprint: null,
      ownerDecisionRequest: null,
      nextAction: validation.workflow.nextAction,
      issueCount: validation.issues.length,
      controls: RESEARCH_MARKETING_OWNER_REQUEST_ARTIFACT_CONTROLS,
    };
  }

  return {
    schemaVersion: 1,
    ok: true,
    scope: 'validated-owner-decision-request-artifact',
    status: 'ready-for-separate-owner-decision',
    source: {
      completedHandoffBytes: validation.source.bytes,
      completedHandoffSha256: validation.source.sha256,
      evidenceManifestSha256: validation.review.evidenceManifestSha256,
    },
    requestFingerprint: fingerprintRequest(request),
    ownerDecisionRequest: request,
    nextAction:
      'Send this exact fingerprinted artifact to a separate owner workflow; it records no decision and grants no publication or posting authority.',
    issueCount: 0,
    controls: RESEARCH_MARKETING_OWNER_REQUEST_ARTIFACT_CONTROLS,
  };
}
