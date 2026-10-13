import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RESEARCH_MARKETING_OWNER_DECISION_MAX_BYTES } from './research-marketing-owner-decision-validator';
import {
  RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_MAX_BYTES,
  RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_VERIFIER_CONTROLS,
  parseResearchMarketingPublicationActionArtifactVerifierArgs,
  verifyResearchMarketingPublicationActionRequestArtifact,
} from './research-marketing-publication-action-request-verifier';
import { RESEARCH_MARKETING_REVIEW_HANDOFF_MAX_BYTES } from './research-marketing-review-handoff-validator';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readBoundedFile(
  suppliedPath: string,
  label: string,
  maxBytes: number,
): Promise<string> {
  const absolutePath = resolve(process.cwd(), suppliedPath);
  const file = await stat(absolutePath);
  if (!file.isFile()) throw new Error(`${label} path must identify one file`);
  if (file.size > maxBytes) {
    throw new Error(`${label} file exceeds ${maxBytes} bytes`);
  }
  return readFile(absolutePath, 'utf8');
}

async function main(): Promise<void> {
  try {
    const args = parseResearchMarketingPublicationActionArtifactVerifierArgs(
      process.argv.slice(2),
    );
    const [artifactJsonText, handoffYamlText, decisionYamlText] =
      await Promise.all([
        readBoundedFile(
          args.artifactFile,
          'artifact',
          RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_MAX_BYTES,
        ),
        readBoundedFile(
          args.handoffFile,
          'handoff',
          RESEARCH_MARKETING_REVIEW_HANDOFF_MAX_BYTES,
        ),
        readBoundedFile(
          args.decisionFile,
          'decision',
          RESEARCH_MARKETING_OWNER_DECISION_MAX_BYTES,
        ),
      ]);
    const report =
      await verifyResearchMarketingPublicationActionRequestArtifact({
        artifactJsonText,
        handoffYamlText,
        decisionYamlText,
        root: process.cwd(),
      });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      schemaVersion: 1,
      ok: false,
      scope: 'publication-action-request-artifact-and-current-evidence',
      status: 'invalid-publication-action-request-artifact',
      error: errorMessage(error),
      sources: null,
      expected: null,
      observed: null,
      issues: [],
      workflow: {
        status: 'invalid-publication-action-request-artifact',
        nextAction:
          'Correct the command or input and verify again; no publication action was authorized or performed.',
      },
      controls:
        RESEARCH_MARKETING_PUBLICATION_ACTION_ARTIFACT_VERIFIER_CONTROLS,
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

void main();
