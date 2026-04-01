import { NextResponse } from 'next/server';

export async function GET() {
  const kit = {
    taglines: [
      'Open-source AI trading signals you can self-host',
      'Self-hosted trading intelligence for developers',
      'Free AI trading signals — no vendor lock-in',
    ],
    shortDescription:
      'TradeClaw is an open-source, self-hosted AI trading signal platform. Get real-time BUY/SELL signals for crypto, forex, and commodities. Docker Compose deploy in 60 seconds. No API keys, no paywall.',
    topics: ['Developer Tools', 'Finance', 'Open Source', 'Bots', 'Productivity'],
    firstComment: `Hey Product Hunt! 👋\n\nI built TradeClaw because I was tired of paying $50+/mo for trading signal services that I couldn't customize or self-host.\n\nTradeClaw is 100% open-source and runs on your own infra with a single \`docker compose up\`. It analyzes BTC, ETH, XAU, EUR, GBP and more using EMA, RSI, MACD, Bollinger Bands, and Stochastic oscillators.\n\nWhat makes it different:\n- Self-hosted — your data stays yours\n- Real-time signals with confidence scores\n- Paper trading mode to test before risking real money\n- Embeddable widgets for blogs and dashboards\n- REST API + Telegram bot integration\n\nWould love your feedback. Star us on GitHub if you find it useful!`,
    galleryCaptions: [
      'Real-time dashboard with live BUY/SELL signals and confidence scores',
      'Multi-timeframe analysis across BTC, ETH, XAU, EUR, GBP',
      'One-click Docker Compose deployment — self-host in 60 seconds',
      'Paper trading mode: test strategies with zero risk',
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
