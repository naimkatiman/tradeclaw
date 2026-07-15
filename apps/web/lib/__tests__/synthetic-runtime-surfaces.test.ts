import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf8');
}

describe('synthetic runtime surface integrity', () => {
  it('does not substitute fabricated signals or backtest results in the demo', () => {
    const demo = read('../../app/demo/DemoClient.tsx');
    const metadata = read('../../app/demo/page.tsx');

    expect(demo).not.toMatch(/FALLBACK_SIGNALS|\/api\/demo\/signals|Sample Result/i);
    expect(demo).not.toMatch(/Total P&L|Sharpe Ratio|tp\s*\*/i);
    expect(demo).toMatch(/No precomputed backtest is available/i);
    expect(demo).toMatch(/No sample signals are substituted/i);
    expect(metadata).not.toMatch(/Live Demo|Live confidence updates/i);
  });

  it('does not put invented accuracy, rejection-rate, or latency claims into post templates', () => {
    const threadSources = [
      read('../../app/post-thread/PostThreadClient.tsx'),
      read('../../components/threads/ThreadsClient.tsx'),
    ];

    for (const source of threadSources) {
      expect(source).not.toMatch(/52% accuracy|54% accuracy|51% accuracy/i);
      expect(source).not.toMatch(/filters ~70%|runs in ~50ms|the edge comes from/i);
      expect(source).not.toMatch(/zero database|Yahoo Finance|signals below 55/i);
      expect(source).not.toMatch(/TradingView is \$|3Commas is \$|no analytics|free forever/i);
      expect(source).not.toMatch(/120\+ (features|pages)|deploy in (literally )?2 minutes/i);
      expect(source).toMatch(/not proof of predictive edge/i);
      expect(source).toMatch(/does not establish profitability/i);
      expect(source).toMatch(/PostgreSQL-backed histories and jobs/i);
      expect(source).toMatch(/RoboForex TradFi execution bridge remains a scaffold/i);
    }
  });

  it('keeps the TradingAgents runtime bridge-only and fail-closed', () => {
    const pipeline = read('../trading-agents/mock-pipeline.ts');
    const researchClient = read('../../app/pro/research/research-client.tsx');

    expect(pipeline).not.toMatch(/buildAnalystAnalysis|buildRiskAnalysis|buildPMVerdict/);
    expect(pipeline).not.toMatch(/default mock indicators|safe fallback/i);
    expect(pipeline).toMatch(/no fallback research is generated/i);
    expect(pipeline).toMatch(/did not return portfolioManager output/i);
    expect(pipeline).toMatch(/non-reconstructable/);
    expect(researchClient).toMatch(/bridge-supplied/i);
    expect(researchClient).toMatch(/not broker orders, fills, or verified investment advice/i);
    expect(researchClient).not.toMatch(/collaborate on your trading decisions/i);
  });

  it('does not fabricate neutral heatmap readings when a symbol has no signal', () => {
    const heatmap = read('../../app/api/heatmap/route.ts');

    expect(heatmap).toMatch(/if \(!sig\) return \[\]/);
    expect(heatmap).not.toMatch(/basePrice|rsi:\s*50|confidence:\s*0/);
  });

  it('does not promote synthetic OHLCV into public signals or MTF confidence', () => {
    const signals = read('../../app/lib/signals.ts');
    const generator = read('../../app/lib/signal-generator.ts');

    expect(signals).toMatch(/data\.source === 'synthetic'[\s\S]*continue;/);
    expect(signals).not.toMatch(/signalSource = data\.source === 'synthetic'/);
    expect(generator).toMatch(/source === 'synthetic' \|\| candles\.length < 100/);
  });

  it('requires observed paper prices instead of hardcoded or random fills', () => {
    const paper = read('../paper-trading.ts');
    const openRoute = read('../../app/api/paper-trading/open/route.ts');
    const closeRoute = read('../../app/api/paper-trading/close/route.ts');

    expect(paper).not.toMatch(/BASE_PRICES|Math\.random\(\).*0\.003/);
    expect(paper).toMatch(/positive observed entryPrice/);
    expect(paper).toMatch(/positive observed exitPrice/);
    expect(openRoute).toMatch(/positive observed entryPrice required/);
    expect(closeRoute).toMatch(/positive observed exitPrice required/);
  });

  it('fails closed when sentiment or ATR providers are unavailable', () => {
    const sentiment = read('../../app/api/sentiment/route.ts');
    const tpsl = read('../../app/api/tpsl/route.ts');

    expect(sentiment).not.toMatch(/MOCK_|generateMock/);
    expect(sentiment).toMatch(/no synthetic fallback is used/i);
    expect(tpsl).not.toMatch(/atrEstimate|basePrice/);
    expect(tpsl).toMatch(/source === 'synthetic'/);
    expect(tpsl).toMatch(/no estimated ATR was substituted/i);
    expect(tpsl).toMatch(/recommendedLots: null/);
  });
});
