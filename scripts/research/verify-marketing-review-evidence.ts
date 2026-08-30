import {
  RESEARCH_MARKETING_REVIEW_EVIDENCE_VERIFIER_CONTROLS,
  parseResearchMarketingReviewEvidenceArgs,
  verifyResearchMarketingReviewEvidence,
} from './research-marketing-review-evidence-verifier';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function main(): Promise<void> {
  try {
    const taskIds = parseResearchMarketingReviewEvidenceArgs(
      process.argv.slice(2),
    );
    const report = await verifyResearchMarketingReviewEvidence({ taskIds });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      schemaVersion: 1,
      ok: false,
      scope: 'repository-evidence-bytes-only',
      error: errorMessage(error),
      controls: RESEARCH_MARKETING_REVIEW_EVIDENCE_VERIFIER_CONTROLS,
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

void main();
