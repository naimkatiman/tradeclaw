import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RESEARCH_MARKETING_REVIEW_HANDOFF_MAX_BYTES } from './research-marketing-review-handoff-validator';
import {
  RESEARCH_MARKETING_OWNER_DECISION_MAX_BYTES,
  RESEARCH_MARKETING_OWNER_DECISION_VALIDATOR_CONTROLS,
  parseResearchMarketingOwnerDecisionArgs,
  validateResearchMarketingOwnerDecision,
} from './research-marketing-owner-decision-validator';

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
    const args = parseResearchMarketingOwnerDecisionArgs(process.argv.slice(2));
    const [handoffYamlText, decisionYamlText] = await Promise.all([
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
    const report = await validateResearchMarketingOwnerDecision({
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
      scope: 'manual-owner-decision-form-and-current-evidence',
      error: errorMessage(error),
      request: null,
      decision: null,
      issues: [],
      workflow: {
        status: 'invalid-owner-decision',
        nextAction:
          'Correct the command or input and retry; no decision was recorded and no publication action was performed.',
      },
      controls: RESEARCH_MARKETING_OWNER_DECISION_VALIDATOR_CONTROLS,
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

void main();
