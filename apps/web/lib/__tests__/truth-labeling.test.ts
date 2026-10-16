import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STAT_HINTS } from '../stat-hints';
import { generateTradeClawPineScript } from '../tv-pine-export';
import { getDashboardTranslations } from '../product-i18n/dashboard';
import { getDashboardEvidenceTranslations } from '../product-i18n/dashboard-evidence';

describe('truth-in-labeling copy', () => {
  it('labels the equity path as a hypothetical sequential simulation', () => {
    expect(STAT_HINTS.totalReturnCompounded).toMatch(/hypothetical sequential equity simulation/i);
    expect(STAT_HINTS.totalReturnCompounded).toMatch(/not an actual portfolio return/i);
    expect(STAT_HINTS.totalReturnCompounded).toMatch(/does not use broker fills/i);
    expect(STAT_HINTS.totalReturnCompounded).not.toMatch(/real recorded round-trip cost/i);
  });

  it('labels raw signal sums and expectancy without implying realized account results', () => {
    expect(STAT_HINTS.totalReturnLinear).toMatch(/not a portfolio return/i);
    expect(STAT_HINTS.expectancyR).toMatch(/modeled fee\/slippage/i);
    expect(STAT_HINTS.expectancyR).toMatch(/not realized subscriber expectancy/i);
  });

  it('exports an OHLCV-resolved summary rather than a verified track record', () => {
    const script = generateTradeClawPineScript({
      winRate24h: 42,
      totalSignals: 100,
      resolvedSignals: 80,
    });

    expect(script).toContain('TradeClaw OHLCV-Resolved Signal Summary');
    expect(script).toContain('not broker fills or portfolio returns');
    expect(script).not.toContain('Verified Track Record');
  });

  it('labels social summary cards as unsized signal studies, not portfolio P/L', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/api/og/summary/route.tsx'),
      'utf8',
    );
    const trackRecordSource = readFileSync(
      resolve(__dirname, '../../app/api/og/track-record/route.tsx'),
      'utf8',
    );

    expect(source).toContain('UNSIZED SUM OF PRICE MOVES');
    expect(source).toMatch(/not portfolio P\/L or broker fills/i);
    expect(source).toContain('const available = s.total > 0');
    expect(source).toContain("const unavailable = '\\u2014'");
    expect(source).toMatch(/available \? `\$\{s\.winRatePct\.toFixed\(1\)\}%` : unavailable/);
    expect(source).toMatch(/available \? s\.wins : unavailable/);
    expect(source).toMatch(/available \? s\.losses : unavailable/);
    expect(source).toContain('SOURCE-GATED DAILY OUTCOMES');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('TOTAL P/L');
    expect(source).not.toContain("'DAILY P/L'");

    expect(trackRecordSource).toContain('const available = stats.total > 0');
    expect(trackRecordSource).toContain("const unavailable = '\\u2014'");
    expect(trackRecordSource).toMatch(/available \? `\$\{s\.win_rate\}%` : unavailable/);
    expect(trackRecordSource).toContain('SOURCE-GATED SIGNAL OUTCOMES - CURRENT ARCHIVE');
    expect(trackRecordSource).toContain('COUNTED OUTCOMES');
    expect(trackRecordSource).not.toContain('30 DAYS');
    expect(trackRecordSource).not.toContain('radial-gradient');
  });

  it('does not publish generated strategy performance as measured evidence', () => {
    const route = readFileSync(
      resolve(__dirname, '../../app/api/strategies/route.ts'),
      'utf8',
    );
    const leaderboard = readFileSync(
      resolve(__dirname, '../../app/strategies/leaderboard/LeaderboardClient.tsx'),
      'utf8',
    );
    const strategiesPage = readFileSync(
      resolve(__dirname, '../../app/strategies/page.tsx'),
      'utf8',
    );
    const templateCatalog = readFileSync(
      resolve(__dirname, '../../app/strategies/marketplace/MarketplaceClient.tsx'),
      'utf8',
    );
    const comparison = readFileSync(
      resolve(__dirname, '../../app/strategies/comparison/ComparisonClient.tsx'),
      'utf8',
    );
    const strategiesLayout = readFileSync(
      resolve(__dirname, '../../app/strategies/layout.tsx'),
      'utf8',
    );

    expect(route).not.toContain('buildSimulatedPerformance');
    expect(route).toMatch(/No measured backtest or live-execution results/i);
    expect(leaderboard).toContain("performanceStatus?.available === true");
    expect(leaderboard).toMatch(/no measured backtest or live-execution results/i);
    expect(leaderboard).not.toMatch(/public backtest rankings|community proof/i);
    expect(strategiesPage).not.toMatch(/totalPnl|Ranked backtests/i);
    expect(strategiesPage).toContain('href="/strategy-builder"');
    expect(strategiesPage).not.toMatch(/\+ New Strategy|● ACTIVE|○ PAUSED/i);
    expect(templateCatalog).toMatch(/illustrative starter templates/i);
    expect(templateCatalog).toMatch(/No community reviews or measured performance/i);
    expect(templateCatalog).not.toMatch(/winRate|win rate|reviews:|rating:|community strategies/i);
    expect(comparison).toMatch(/OHLCV-resolved recorded-signal study/i);
    expect(comparison).toMatch(/24h Hit Rate|Avg Move|Move Sharpe/i);
    expect(comparison).not.toMatch(/Live performance comparison|Avg P&L|Community Leaderboard/i);
    expect(strategiesLayout).not.toMatch(/Live trading strategies|per-strategy performance/i);
  });

  it('keeps first-viewport actions framed as research rather than an execution promise', () => {
    const dashboard = readFileSync(
      resolve(__dirname, '../../app/dashboard/DashboardClient.tsx'),
      'utf8',
    );
    const dashboardCopy = JSON.stringify(getDashboardTranslations('en'));
    const howItWorks = readFileSync(
      resolve(__dirname, '../../app/components/how-it-works.tsx'),
      'utf8',
    );
    const features = readFileSync(
      resolve(__dirname, '../../app/components/features.tsx'),
      'utf8',
    );
    const featureHighlights = readFileSync(
      resolve(__dirname, '../../components/landing/feature-highlights.tsx'),
      'utf8',
    );

    expect(dashboardCopy).toMatch(/inspect the research output/i);
    expect(dashboard).not.toMatch(/steps to start trading|every signal is tagged with its real data source/i);
    expect(howItWorks).toMatch(/not a verified trading edge or broker instructions/i);
    expect(howItWorks).not.toMatch(/Your edge|under 60 seconds|up and running in/i);
    expect(features).toMatch(/entry-like broadcasts fail closed/i);
    expect(features).not.toMatch(/Get instant BUY\/SELL|Never miss a signal|Nothing leaves your infrastructure|under 60 seconds/i);
    expect(featureHighlights).toMatch(/Rule-based confluence from closed candles/i);
    expect(featureHighlights).toMatch(/15-30 second dashboard signal polling/i);
    expect(featureHighlights).toMatch(/entry-like broadcasts fail closed/i);
    expect(featureHighlights).not.toMatch(/neural network|every tick|instant execution|zero lag|high-probability|sub-50ms|middleman latency/i);
  });

  it('documents the implemented execution and candle-source paths', () => {
    const faq = readFileSync(
      resolve(__dirname, '../../components/landing/faq-accordion.tsx'),
      'utf8',
    );
    const enginePage = readFileSync(
      resolve(__dirname, '../../app/how-it-works/HowItWorksClient.tsx'),
      'utf8',
    );
    const sourceBadge = readFileSync(
      resolve(__dirname, '../../app/components/data-source-badge.tsx'),
      'utf8',
    );
    const sourceBadgeCopy = JSON.stringify(getDashboardEvidenceTranslations('en').dataSource);
    const readme = readFileSync(
      resolve(__dirname, '../../../../README.md'),
      'utf8',
    );
    const localizedFaq = readFileSync(
      resolve(__dirname, '../translations.ts'),
      'utf8',
    );

    expect(faq).toMatch(/Automated execution is disabled by default/i);
    expect(faq).toMatch(/Binance USDT-perpetual executor/i);
    expect(faq).toMatch(/RoboForex R StocksTrader execution bridge is still an interface scaffold/i);
    expect(faq).toMatch(/MetaApi is used by a separate account\/position viewer/i);
    expect(faq).not.toMatch(/set your MetaApi credentials|connect your broker via MetaApi to receive price data/i);
    expect(enginePage).toMatch(/Market-data hub when configured/i);
    expect(enginePage).toMatch(/Stooq fallback for forex\/metals/i);
    expect(enginePage).not.toContain('Yahoo Finance');
    expect(sourceBadge).toMatch(/expected provider lane/i);
    expect(sourceBadge).toContain('getDashboardEvidenceTranslations');
    expect(sourceBadgeCopy).toMatch(/Runtime fallbacks may differ/i);
    expect(readme).toMatch(/gate-approved entry-like signals/i);
    expect(readme).not.toMatch(/instant per-signal alerts/i);
    expect(localizedFaq).toMatch(/explicit allowlist/i);
    expect(localizedFaq).not.toMatch(/MetaApi credentials|credenciales de MetaApi|MetaApi 凭证|kelayakan MetaApi|بيانات اعتماد MetaApi/i);
  });

  it('does not manufacture community proof, commentary, uptime, or execution records', () => {
    const pledges = readFileSync(resolve(__dirname, '../pledges.ts'), 'utf8');
    const votes = readFileSync(resolve(__dirname, '../votes.ts'), 'utf8');
    const roadmap = readFileSync(resolve(__dirname, '../roadmap-data.ts'), 'utf8');
    const roadmapUi = readFileSync(
      resolve(__dirname, '../../app/roadmap/RoadmapClient.tsx'),
      'utf8',
    );
    const commentary = readFileSync(
      resolve(__dirname, '../../app/api/commentary/route.ts'),
      'utf8',
    );
    const uptime = readFileSync(
      resolve(__dirname, '../../app/api/uptime/route.ts'),
      'utf8',
    );
    const execution = readFileSync(
      resolve(__dirname, '../../app/execution/page.tsx'),
      'utf8',
    );
    const risk = readFileSync(
      resolve(__dirname, '../../app/risk/RiskClient.tsx'),
      'utf8',
    );

    expect(pledges).not.toMatch(/createSeedData|p_seed_/i);
    expect(votes).not.toMatch(/createSeedData|BUY: 142|SELL: 102/i);
    expect(roadmap).not.toMatch(/seedVotes|in-progress|planned/i);
    expect(roadmapUi).toMatch(/votes stay in this browser/i);
    expect(roadmapUi).not.toMatch(/Coming Next|top voted by the community|most-voted items ship next/i);
    expect(commentary).toMatch(/available: false/i);
    expect(commentary).not.toMatch(/generateDailyCommentary/i);
    expect(uptime).toMatch(/No durable uptime or incident monitor/i);
    expect(uptime).not.toMatch(/seededRandom|generateUptimeHistory|99\.97/i);
    expect(execution).toMatch(/requireAdmin/);
    expect(execution).toMatch(/admin\/executions/);
    expect(risk).toMatch(/OHLCV-resolved signal outcomes/i);
    expect(risk).not.toMatch(/getMock|Alpaca|accountEquity/i);
  });

  it('keeps generated explanations and strategy critiques mechanical and uncalibrated', () => {
    const explainer = readFileSync(
      resolve(__dirname, '../../app/lib/signal-explainer.ts'),
      'utf8',
    );
    const roaster = readFileSync(resolve(__dirname, '../strategy-roaster.ts'), 'utf8');
    const roastUi = readFileSync(
      resolve(__dirname, '../../app/roast/RoastClient.tsx'),
      'utf8',
    );

    expect(explainer).toMatch(/not broker execution, portfolio performance, a calibrated probability/i);
    expect(explainer).toMatch(/not a broker fill or order instruction/i);
    expect(explainer).not.toMatch(/institutional buyers|statistically meaningful edge|buy at market|banking 50%|favorable risk-reward|high-conviction setup/i);
    expect(roaster).toContain("edgeAssessment: 'Not measured'");
    expect(roaster).not.toMatch(/edgeFromRisk|Positive Edge|Negative Edge|reviewed 1000|whipsaws by ~30%|random variance/i);
    expect(roastUi).toMatch(/does not run a\s+backtest, measure market edge, or estimate real portfolio risk/i);
    expect(roastUi).toMatch(/No candles, costs, fills, outcomes, or portfolio data were evaluated/i);
  });

  it('fails closed or exposes provenance on secondary market-data surfaces', () => {
    const news = readFileSync(resolve(__dirname, '../../app/api/news/route.ts'), 'utf8');
    const pluginUi = readFileSync(
      resolve(__dirname, '../../app/plugins/PluginsClient.tsx'),
      'utf8',
    );
    const pluginTestRoute = readFileSync(
      resolve(__dirname, '../../app/api/plugins/test/route.ts'),
      'utf8',
    );
    const screener = readFileSync(
      resolve(__dirname, '../../app/api/screener/route.ts'),
      'utf8',
    );

    expect(news).not.toMatch(/MOCK_TRENDING|\$67,000|\$3,400/);
    expect(news).toMatch(/trending: \[\]/);
    expect(news).toMatch(/status: 503/);
    expect(pluginUi).toMatch(/source: \{testResult\.source\}/);
    expect(pluginUi).toMatch(/observed provider data/i);
    expect(pluginUi).toMatch(/Admin-only plugin code runs in a time-limited Node VM context/i);
    expect(pluginUi).toMatch(/not a hardened tenant-isolation boundary/i);
    expect(pluginTestRoute).toMatch(/source === 'unavailable'/);
    expect(pluginTestRoute).toMatch(/status: 503/);
    expect(screener).toMatch(/ohlcvEntry\.source !== 'synthetic'/);
  });

  it('keeps copyable social claims inside the evidence boundary', () => {
    const share = readFileSync(
      resolve(__dirname, '../../app/share/ShareClient.tsx'),
      'utf8',
    );
    const glossary = readFileSync(
      resolve(__dirname, '../../app/lib/glossary-data.ts'),
      'utf8',
    );

    expect(share).toMatch(/not broker fills or customer portfolio returns/i);
    expect(share).toMatch(/RoboForex TradFi execution bridge remains an interface scaffold/i);
    expect(share).not.toMatch(/institutional-grade|free forever|deploy in 5 min|\$50.?\$300|instant buy\/sell/i);
    expect(glossary).toMatch(/does not currently calculate or recommend Kelly/i);
    expect(glossary).toMatch(/not customer trade win rates/i);
    expect(glossary).not.toMatch(/TradeClaw includes Calmar ratio in its strategy leaderboard/i);
  });
});
