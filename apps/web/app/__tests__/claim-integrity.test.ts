import fs from 'fs';
import path from 'path';

function source(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

describe('truthful public claim surfaces', () => {
  it('fails the OG card closed instead of substituting a synthetic BUY signal', () => {
    const client = source('og-preview/OGPreviewClient.tsx');
    expect(client).not.toContain('const fallback: Signal');
    expect(client).not.toContain('confidence: 78');
    expect(client).not.toContain("?? 'BUY'");
    expect(client).not.toContain('const rand =');
    expect(client).toContain("candidate.dataQuality === 'real'");
    expect(client).toContain('Signal timestamp unavailable');
    expect(client).toContain('No illustrative values have been substituted.');
  });

  it('does not seed calendar performance in the client', () => {
    const client = source('calendar/CalendarClient.tsx');
    const api = source('api/calendar/route.ts');
    expect(client).not.toContain('seededRng');
    expect(client).not.toContain('baseProbability');
    expect(client).not.toContain('Math.random');
    expect(api).toContain('isCountedResolved(record)');
    expect(client).toContain('No counted 24h outcomes are available');
  });

  it('marks the pattern catalog as unmeasured and not implemented', () => {
    const route = source('api/patterns/route.ts');
    const client = source('patterns/PatternsClient.tsx');
    expect(route).not.toMatch(/\breliability:\s*\d/);
    expect(route).not.toContain('tradeClawDetects:');
    expect(route).not.toContain('howToTrade:');
    expect(route).toContain("evidenceStatus: 'unmeasured'");
    expect(route).toContain("detectionStatus: 'not-implemented'");
    expect(client).not.toContain('Auto-detected');
  });

  it('uses a deterministic, explicitly illustrative indicator fixture', () => {
    const client = source('indicators/builder/BuilderClient.tsx');
    expect(client).not.toContain('Math.random');
    expect(client).not.toContain('Live Test');
    expect(client).toContain('generateIllustrativeCandles');
    expect(client).toContain('Not live market data, a backtest, or measured performance.');
    expect(client).toContain("status: 'scaffold'");
  });

  it('presents the engine confidence field as a mechanical rule score, not probability', () => {
    const publicCopy = [
      'alert/[id]/AlertDetailClient.tsx',
      'card/CardClient.tsx',
      'today/TodayClient.tsx',
      'feed.json/route.ts',
      'atom.xml/route.ts',
      'components/share-signal.tsx',
      'components/signal-share-buttons.tsx',
      'components/signal-export-menu.tsx',
      'api/signal-of-the-day/route.ts',
      'how-it-works/HowItWorksClient.tsx',
      'chrome-extension/page.tsx',
      '../lib/alert-channels.ts',
      '../lib/daily-digest.ts',
      '../lib/slack-integration.ts',
    ].map(source).join('\n');

    expect(publicCopy).toContain('rule score');
    expect(publicCopy).toContain('/100');
    expect(publicCopy).toContain('not a predictive probability');
    expect(publicCopy).not.toMatch(/\$\{(?:signal|s|best)\.confidence\}%\s*(?:confidence|conf|indicator agreement)/i);
    expect(publicCopy).not.toContain('Free AI trading signal');
    expect(publicCopy).not.toContain('Free AI signal');
    expect(publicCopy).not.toContain('Show your edge');
    expect(publicCopy).not.toContain('exact confidence %');
  });
});
