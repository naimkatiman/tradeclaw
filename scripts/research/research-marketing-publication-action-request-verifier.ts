import { createHash } from 'node:crypto';
import {
  canonicalizeResearchMarketingPublicationActionRequestArtifact,
  prepareResearchMarketingPublicationActionRequestArtifact,
  type PrepareResearchMarketingPublicationActionRequestOptions,
  type ResearchMarketingPublicationActionRequestArtifact,
  type ResearchMarketingPublicationFingerprint,
} from './research-marketing-publication-action-request';

export const RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_MAX_BYTES =
  128 * 1024;

export const RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_VERIFIER_CONTROLS =
  Object.freeze({
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
  } as const);

export interface ResearchMarketingPublicationActionArtifactVerificationIssue {
  code: string;
  path: string;
  message: string;
}

export type ResearchMarketingPublicationActionArtifactVerificationStatus =
  | 'invalid-publication-action-request-artifact'
  | 'request-artifact-verified-no-action-performed';

export interface ResearchMarketingPublicationActionArtifactVerificationReport {
  schemaVersion: 1;
  ok: boolean;
  scope: 'publication-action-request-artifact-and-current-evidence';
  status: ResearchMarketingPublicationActionArtifactVerificationStatus;
  sources: {
    artifact: { bytes: number; sha256: string };
    completedHandoff: { bytes: number; sha256: string };
    decisionForm: { bytes: number; sha256: string };
  };
  expected: {
    requestAvailable: boolean;
    artifactFingerprint: ResearchMarketingPublicationFingerprint | null;
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
  issues: ResearchMarketingPublicationActionArtifactVerificationIssue[];
  workflow: {
    status: ResearchMarketingPublicationActionArtifactVerificationStatus;
    nextAction: string;
  };
  controls: typeof RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_VERIFIER_CONTROLS;
}

export interface VerifyResearchMarketingPublicationActionRequestArtifactOptions
  extends PrepareResearchMarketingPublicationActionRequestOptions {
  artifactJsonText: string;
}

export interface ResearchMarketingPublicationActionArtifactVerifierCliArgs {
  artifactFile: string;
  handoffFile: string;
  decisionFile: string;
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function sourceFingerprint(text: string): { bytes: number; sha256: string } {
  return {
    bytes: Buffer.byteLength(text, 'utf8'),
    sha256: sha256(text),
  };
}

function canonicalFingerprint(
  canonical: string,
): ResearchMarketingPublicationFingerprint {
  return {
    algorithm: 'sha256',
    canonicalization: 'json-pretty-2-space-lf-utf8-v1',
    bytes: Buffer.byteLength(canonical, 'utf8'),
    sha256: sha256(canonical),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nestedRecord(
  value: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  if (value === null) return null;
  const nested = value[key];
  return isRecord(nested) ? nested : null;
}

function stringField(
  value: Record<string, unknown> | null,
  key: string,
): string | null {
  if (value === null) return null;
  const field = value[key];
  return typeof field === 'string' ? field : null;
}

function observedFields(parsed: Record<string, unknown> | null): {
  draftFingerprintSha256: string | null;
  requestFingerprintSha256: string | null;
  taskId: string | null;
  candidateId: string | null;
} {
  const request = nestedRecord(parsed, 'publicationActionRequest');
  return {
    draftFingerprintSha256: stringField(
      nestedRecord(parsed, 'draftFingerprint'),
      'sha256',
    ),
    requestFingerprintSha256: stringField(
      nestedRecord(parsed, 'requestFingerprint'),
      'sha256',
    ),
    taskId: stringField(request, 'taskId'),
    candidateId: stringField(request, 'candidateId'),
  };
}

function addIssue(
  issues: ResearchMarketingPublicationActionArtifactVerificationIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function expectedRequestAvailable(
  artifact: ResearchMarketingPublicationActionRequestArtifact,
): boolean {
  return (
    artifact.ok &&
    artifact.publicationActionRequest !== null &&
    artifact.draftFingerprint !== null &&
    artifact.requestFingerprint !== null
  );
}

export async function verifyResearchMarketingPublicationActionRequestArtifact(
  options: VerifyResearchMarketingPublicationActionRequestArtifactOptions,
): Promise<ResearchMarketingPublicationActionArtifactVerificationReport> {
  const issues: ResearchMarketingPublicationActionArtifactVerificationIssue[] = [];
  const artifactBytes = Buffer.byteLength(options.artifactJsonText, 'utf8');
  let parsed: Record<string, unknown> | null = null;

  if (artifactBytes > RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_MAX_BYTES) {
    addIssue(
      issues,
      'artifact-byte-limit',
      '/artifact',
      `Artifact exceeds the ${RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_MAX_BYTES}-byte limit`,
    );
  } else {
    try {
      const value = JSON.parse(options.artifactJsonText) as unknown;
      if (isRecord(value)) {
        parsed = value;
      } else {
        addIssue(
          issues,
          'artifact-json-invalid',
          '/artifact',
          'Artifact JSON must contain one top-level object',
        );
      }
    } catch {
      addIssue(
        issues,
        'artifact-json-invalid',
        '/artifact',
        'Artifact must be valid JSON containing one top-level object',
      );
    }
  }

  const expectedArtifact =
    await prepareResearchMarketingPublicationActionRequestArtifact({
      handoffYamlText: options.handoffYamlText,
      decisionYamlText: options.decisionYamlText,
      root: options.root,
      now: options.now,
      readEvidenceText: options.readEvidenceText,
    });
  const requestAvailable = expectedRequestAvailable(expectedArtifact);
  const expectedCanonical = requestAvailable
    ? canonicalizeResearchMarketingPublicationActionRequestArtifact(
        expectedArtifact,
      )
    : null;
  const exactCanonicalBytesMatched =
    parsed !== null &&
    expectedCanonical !== null &&
    options.artifactJsonText === expectedCanonical;

  if (!requestAvailable) {
    addIssue(
      issues,
      'expected-request-unavailable',
      '/expected',
      'Current handoff, decision, and evidence do not produce an approved publication-action request',
    );
  } else if (!exactCanonicalBytesMatched) {
    addIssue(
      issues,
      'artifact-canonical-mismatch',
      '/artifact',
      'Saved artifact bytes do not exactly match the canonical artifact re-derived from current inputs and evidence',
    );
  }

  const observed = observedFields(parsed);
  const ok = issues.length === 0 && exactCanonicalBytesMatched;
  const status: ResearchMarketingPublicationActionArtifactVerificationStatus =
    ok
      ? 'request-artifact-verified-no-action-performed'
      : 'invalid-publication-action-request-artifact';
  const request = requestAvailable
    ? expectedArtifact.publicationActionRequest
    : null;

  return {
    schemaVersion: 1,
    ok,
    scope: 'publication-action-request-artifact-and-current-evidence',
    status,
    sources: {
      artifact: sourceFingerprint(options.artifactJsonText),
      completedHandoff: sourceFingerprint(options.handoffYamlText),
      decisionForm: sourceFingerprint(options.decisionYamlText),
    },
    expected: {
      requestAvailable,
      artifactFingerprint:
        expectedCanonical === null
          ? null
          : canonicalFingerprint(expectedCanonical),
      draftFingerprintSha256:
        requestAvailable ? expectedArtifact.draftFingerprint?.sha256 ?? null : null,
      requestFingerprintSha256:
        requestAvailable
          ? expectedArtifact.requestFingerprint?.sha256 ?? null
          : null,
      taskId: request?.taskId ?? null,
      candidateId: request?.candidateId ?? null,
    },
    observed: {
      jsonParsed: parsed !== null,
      exactCanonicalBytesMatched,
      ...observed,
    },
    issues,
    workflow: {
      status,
      nextAction: ok
        ? 'Use this exact verified artifact only in a separate, separately authorized publication action; this verifier did not select a target, enqueue, publish, post, or grant authority.'
        : 'Correct the artifact or its bound inputs and verify again; no publication action was authorized or performed.',
    },
    controls: RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_VERIFIER_CONTROLS,
  };
}

export function parseResearchMarketingPublicationActionArtifactVerifierArgs(
  args: readonly string[],
): ResearchMarketingPublicationActionArtifactVerifierCliArgs {
  let artifactFile: string | null = null;
  let handoffFile: string | null = null;
  let decisionFile: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (
      argument !== '--artifact' &&
      argument !== '--handoff' &&
      argument !== '--decision'
    ) {
      throw new Error(`unknown argument ${JSON.stringify(argument)}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${argument} requires one file path`);
    }

    if (argument === '--artifact') {
      if (artifactFile !== null) {
        throw new Error('--artifact may be supplied only once');
      }
      artifactFile = value;
    } else if (argument === '--handoff') {
      if (handoffFile !== null) {
        throw new Error('--handoff may be supplied only once');
      }
      handoffFile = value;
    } else {
      if (decisionFile !== null) {
        throw new Error('--decision may be supplied only once');
      }
      decisionFile = value;
    }
    index += 1;
  }

  if (
    artifactFile === null ||
    handoffFile === null ||
    decisionFile === null
  ) {
    throw new Error('--artifact, --handoff, and --decision are all required');
  }
  return { artifactFile, handoffFile, decisionFile };
}
