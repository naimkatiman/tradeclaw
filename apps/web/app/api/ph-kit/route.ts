import { NextResponse } from 'next/server';

export async function GET() {
  const kit = {
    taglines: [
      'Open-source AI trading signals you can self-host',
      'Self-hosted trading intelligence for developers',
      'MIT-licensed trading-signal software with explicit evidence labels',
    ],
    shortDescription:
      'TradeClaw is MIT-licensed, self-hostable trading-signal software. It publishes BUY/SELL records for configured markets and labels observed and modeled evidence separately. Review Docker Compose requirements and provider costs before deployment.',
    topics: ['Developer Tools', 'Finance', 'Open Source', 'Bots', 'Productivity'],
    firstComment: `Hey Product Hunt! 👋\n\nI built TradeClaw to make trading-signal rules, source code, and evidence labels inspectable and self-hostable.\n\nTradeClaw's source is MIT-licensed. Its documented Docker Compose path requires environment configuration, and its rule-based engine uses indicators including EMA, RSI, MACD, Bollinger Bands, and Stochastic.\n\nWhat makes it different:\n- Self-hostable, with data handling determined by configured providers\n- Confidence describes indicator agreement, not probability of profit\n- Paper-trading and backtest outcomes are modeled simulations\n- Embeddable widgets for blogs and dashboards\n- REST API and optional Telegram integration\n\nPlease review the source and limitations; feedback is welcome.`,
    galleryCaptions: [
      'Signal archive with BUY/SELL labels and indicator-agreement scores',
      'Multi-timeframe rule analysis for assets supported by the configured data source',
      'Documented Docker Compose setup with required environment configuration',
      'Modeled paper-trading workflow with explicit simulation limitations',
      'Embeddable signal widgets for your blog or newsletter',
      'REST API with full documentation — build your own integrations',
    ],
    links: {
      productHunt: 'https://www.producthunt.com/posts/tradeclaw',
      github: 'https://github.com/naimkatiman/tradeclaw',
      website: 'https://tradeclaw.win',
    },
  };

  return NextResponse.json(kit, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  });
}
