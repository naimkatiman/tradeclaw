import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../../..');

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('statistics and automation truth boundaries', () => {
  it('keeps the committed fixture baseline reproducible from the snapshot', () => {
    const generated = JSON.parse(execFileSync(
      process.execPath,
      [resolve(root, '.github/scripts/summarize-backtest.js')],
      { cwd: root, encoding: 'utf8' },
    ));
    const baseline = JSON.parse(source('docs/baseline-backtest.json'));

    expect(generated.available).toBe(true);
    expect(generated.fixture).toBe(baseline.fixture);
    expect(generated.aggregation).toBe(baseline.aggregation);
    expect(generated.winRate).toBeCloseTo(baseline.winRate, 8);
    expect(generated.totalReturn).toBeCloseTo(baseline.totalReturn, 8);
    expect(generated.profitFactor).toBeCloseTo(baseline.profitFactor, 8);
    expect(generated.maxDrawdown).toBeCloseTo(baseline.maxDrawdown, 8);
    expect(generated.totalTrades).toBe(baseline.totalTrades);
    expect(generated.strategies).toBe(baseline.strategies);
  });

  it('does not swallow fixture failures or present fixture metrics as portfolio performance', () => {
    const workflow = source('.github/workflows/backtest-pr-comment.yml');

    expect(workflow).not.toMatch(/tee \.cache\/backtest-pr\/output\.log \|\| true/);
    expect(workflow).toContain('Fixed candle fixture and modeled strategy assumptions only.');
    expect(workflow).toContain('not live, out-of-sample, broker, account, or portfolio performance');
    expect(workflow).not.toContain('| Total PnL |');
    expect(workflow).not.toContain('| Sharpe |');
  });

  it('executes the required strategy backtests without trusting a result cache', () => {
    const workflow = source('.github/workflows/ci.yml');
    const start = workflow.indexOf('  strategy-backtests:');
    const end = workflow.indexOf('\n  e2e:', start);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const job = workflow.slice(start, end);
    const install = job.indexOf('run: npm ci');
    const buildSignals = job.indexOf('run: npm run build:signals');
    const runStepStart = job.indexOf('- name: Run strategy backtests');
    const artifactStepStart = job.indexOf('- uses: actions/upload-artifact@v4');
    const runStep = job.slice(runStepStart, artifactStepStart);

    expect(job).not.toContain('uses: actions/cache@');
    expect(job).not.toContain('cache-hit');
    expect(install).toBeGreaterThanOrEqual(0);
    expect(buildSignals).toBeGreaterThan(install);
    expect(runStepStart).toBeGreaterThan(buildSignals);
    expect(artifactStepStart).toBeGreaterThan(runStepStart);
    expect(runStep).toContain('shell: bash');
    expect(runStep).toContain('set -euo pipefail');
    expect(runStep).toContain('npm test --workspace=@tradeclaw/strategies');
    expect(runStep.indexOf('set -euo pipefail')).toBeLessThan(
      runStep.indexOf('npm test --workspace=@tradeclaw/strategies'),
    );
  });

  it('keeps scheduled repository and social posts evidence-bounded', () => {
    const weekly = source('.github/workflows/weekly-report.yml');
    const social = source('.github/workflows/star-milestone-social.yml');

    expect(weekly).not.toContain('Auto-generated every Monday');
    expect(weekly).not.toContain('Live signal performance');
    expect(weekly).not.toContain('real-time signal feed');
    expect(weekly).toContain("activeContributors ?? 'unavailable'");

    expect(social).not.toMatch(/free forever|zero cost|officially trending|\[X\] days/i);
    expect(social).not.toContain('✅ Live signals');
    expect(social).toContain('if (milestone && !isSimulation)');
  });

  it('does not promise unverified weekly digest delivery', () => {
    const copy = [
      source('apps/web/app/digest/DigestClient.tsx'),
      source('apps/web/app/digest/page.tsx'),
      source('apps/web/app/subscribe/SubscribeClient.tsx'),
      source('apps/web/app/subscribe/page.tsx'),
      source('apps/web/app/blog/components/EmailCapture.tsx'),
    ].join('\n');

    expect(copy).not.toMatch(/arrives next Monday|receive every Monday|delivered to your inbox every|land in your inbox every Monday/i);
    expect(copy).toMatch(/delivery (?:requires|depends on)/i);
  });

  it('documents only implemented v1 endpoints and actual limiter boundaries', () => {
    const apiRoot = source('apps/web/app/api/v1/route.ts');

    expect(apiRoot).not.toContain('/api/v1/accuracy');
    expect(apiRoot).not.toContain('600 requests/minute');
    expect(apiRoot).toContain('/api/v1/win-rates');
    expect(apiRoot).toContain('mechanical rule score, not a probability of profit');
    expect(apiRoot).toContain('in-memory and is not a distributed quota');
  });
});
