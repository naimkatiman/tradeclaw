const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('external publishable claim integrity', () => {
  const publishablePaths = [
    'community/PRODUCTHUNT.md',
    'docs/producthunt-launch.md',
    'docs/devto-article.md',
    'social-drafts/2026-03-29-linkedin.md',
    'social-drafts/2026-03-29-x.md',
    'social-drafts/2026-06-07-weekly-recap-linkedin.md',
    'social-drafts/2026-06-07-weekly-recap-x.md',
    'social-drafts/hackernews-showhn.md',
    'social-drafts/tradeclaw-reddit-algo.md',
    'social-drafts/tradeclaw-reddit-selfhosted.md',
    'apps/web/public/social-preview.svg',
    'packages/agent/package.json',
    'packages/agent/src/server/server.ts',
    'packages/tradeclaw-demo/package.json',
    'packages/tradeclaw-demo/README.md',
    'packages/tradeclaw-demo/bin/cli.js',
    'packages/tradeclaw-demo/lib/demo-page.js',
    'packages/tradeclaw-demo/lib/server.js',
  ];

  it('contains no overbroad cost, fixed-time, competitor-price, or fabricated metric copy', () => {
    const combined = publishablePaths.map(read).join('\n');
    expect(combined).not.toMatch(/free forever|no subscriptions?/i);
    expect(combined).not.toMatch(/deploy in \d|under \d+ (seconds?|minutes?)|takes? \d+ (seconds?|minutes?)/i);
    expect(combined).not.toMatch(/TradingView|3Commas|63\.9%|54\.8%|73%|historical win rate/i);
  });

  it('marks the npm demo as a synthetic fixture in code, API, and UI', () => {
    const server = read('packages/tradeclaw-demo/lib/server.js');
    const page = read('packages/tradeclaw-demo/lib/demo-page.js');
    expect(server).toContain("dataQuality: 'synthetic'");
    expect(server).toContain('isIllustrative: true');
    expect(server).not.toContain('seed = Date.now()');
    expect(server).not.toContain('Math.random()');
    expect(page).toContain('Illustrative Candidate Cards');
    expect(page).toContain('No performance metric supplied');
    expect(page).not.toContain('Live Signals');
  });

  it('separates source licensing, provider costs, OHLCV research, and execution', () => {
    const launch = read('community/PRODUCTHUNT.md');
    expect(launch).toContain('MIT licensed');
    expect(launch).toContain('separate costs');
    expect(launch).toContain('OHLCV-resolved');
    expect(launch).toContain('not broker fills');
  });
});
