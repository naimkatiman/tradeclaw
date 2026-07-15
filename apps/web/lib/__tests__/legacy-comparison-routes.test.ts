import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function webPath(relativePath: string): string {
  return resolve(__dirname, '../..', relativePath);
}

function source(relativePath: string): string {
  return readFileSync(webPath(relativePath), 'utf8');
}

describe('legacy comparison routes', () => {
  it('redirects the TradingView comparison to the evidence-bounded comparison page', () => {
    const page = source('app/vs-tradingview/page.tsx');

    expect(page).toContain("redirect('/compare')");
    expect(page).not.toContain('VsClient');
    expect(page).not.toContain('Live Signal Comparison');
    expect(existsSync(webPath('app/vs-tradingview/VsClient.tsx'))).toBe(false);
  });

  it('removes the unverified cost benchmark and redirects to the bounded comparison page', () => {
    const page = source('app/benchmark/page.tsx');

    expect(page).toContain("redirect('/compare')");
    expect(page).not.toContain('BenchmarkLoader');
    expect(page).not.toContain('Real Cost Comparison');
    expect(page).not.toContain('$4/mo');
    expect(existsSync(webPath('app/benchmark/BenchmarkClient.tsx'))).toBe(false);
    expect(existsSync(webPath('app/benchmark/BenchmarkLoader.tsx'))).toBe(false);
  });
});
