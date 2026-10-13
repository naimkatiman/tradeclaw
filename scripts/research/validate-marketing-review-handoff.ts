import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  RESEARCH_MARKETING_REVIEW_HANDOFF_MAX_BYTES,
  RESEARCH_MARKETING_REVIEW_HANDOFF_VALIDATOR_CONTROLS,
  parseResearchMarketingReviewHandoffArgs,
  validateResearchMarketingReviewHandoff,
} from './research-marketing-review-handoff-validator';

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
    const report = await validateResearchMarketingReviewHandoff({
      yamlText,
      root: process.cwd(),
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      schemaVersion: 2,
      ok: false,
      scope: 'completed-review-handoff-and-repository-evidence',
      error: errorMessage(error),
      controls: RESEARCH_MARKETING_REVIEW_HANDOFF_VALIDATOR_CONTROLS,
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

void main();
