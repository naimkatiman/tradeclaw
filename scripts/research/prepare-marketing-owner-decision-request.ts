import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  RESEARCH_MARKETING_REVIEW_HANDOFF_MAX_BYTES,
  parseResearchMarketingReviewHandoffArgs,
} from './research-marketing-review-handoff-validator';
import {
  RESEARCH_MARKETING_OWNER_REQUEST_ARTIFACT_CONTROLS,
  prepareResearchMarketingOwnerDecisionRequestArtifact,
} from './research-marketing-owner-decision-request-artifact';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function main(): Promise<void> {
  try {
    const suppliedPath = parseResearchMarketingReviewHandoffArgs(
      process.argv.slice(2),
    );
    const absolutePath = resolve(process.cwd(), suppliedPath);
    const file = await stat(absolutePath);
    if (!file.isFile()) throw new Error('handoff path must identify one file');
    if (file.size > RESEARCH_MARKETING_REVIEW_HANDOFF_MAX_BYTES) {
      throw new Error(
        `handoff file exceeds ${RESEARCH_MARKETING_REVIEW_HANDOFF_MAX_BYTES} bytes`,
      );
    }
    const yamlText = await readFile(absolutePath, 'utf8');
    const artifact = await prepareResearchMarketingOwnerDecisionRequestArtifact({
      yamlText,
      root: process.cwd(),
    });
    process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
    if (!artifact.ok) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      schemaVersion: 1,
      ok: false,
      scope: 'validated-owner-decision-request-artifact',
      status: 'invalid-handoff',
      error: errorMessage(error),
      source: null,
      requestFingerprint: null,
      ownerDecisionRequest: null,
      nextAction:
        'Correct the command or input and retry; no owner-decision request artifact was produced.',
      issueCount: null,
      controls: RESEARCH_MARKETING_OWNER_REQUEST_ARTIFACT_CONTROLS,
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

void main();
