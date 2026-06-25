import { runResearchPipeline } from './mock-pipeline';

/**
 * Fire-and-forget wrapper that kicks off the research pipeline for a job.
 * Swallows errors so the caller (API route) never blocks on pipeline completion.
 * Failures are persisted in the job row (status='failed') by the pipeline itself.
 */
export function startResearchPipeline(
  jobId: string,
  symbol: string,
  timeframe: string,
): void {
  runResearchPipeline(jobId, symbol, timeframe).catch(() => {
    // Pipeline already marks the job as 'failed' on error.
    // Nothing to do here — fire-and-forget.
  });
}
