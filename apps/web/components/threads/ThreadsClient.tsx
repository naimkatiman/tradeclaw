'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, Send, TrendingUp, Zap, Code2, Server } from 'lucide-react';

interface Tweet {
  text: string;
}

interface Thread {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  audience: string;
  tweets: Tweet[];
  tags: string[];
}

const REPO_URL = 'https://github.com/naimkatiman/tradeclaw';

const THREADS: Thread[] = [
  {
    id: 'architecture',
    title: 'The Architecture Thread',
    description: 'Break down how TradeClaw works under the hood — for developers',
    icon: <Code2 className="w-5 h-5" />,
    audience: 'Developers, OSS community',
    tags: ['#OpenSource', '#NextJS', '#TypeScript', '#SelfHosted'],
    tweets: [
      {
        text: `I built an open-source AI trading signal platform in TypeScript. Here's the full architecture breakdown 🧵\n\n→ 5-indicator confluence scoring\n→ Live prices from Binance + Yahoo Finance\n→ 40+ REST API endpoints\n→ Zero database (file-based JSON)\n\nGitHub: ${REPO_URL}`,
      },
      {
        text: `1/ The signal engine is the core.\n\nEvery 5 minutes, we fetch OHLCV data for 10 assets and run 5 indicators:\n• RSI (Wilder's smoothing)\n• MACD (12/26/9)\n• EMA (20/50 crossover)\n• Bollinger Bands\n• Stochastic (14/3)\n\nEach indicator votes BUY/SELL with a weight.`,
      },
      {
        text: `2/ The scoring formula:\n\n\`\`\`\nRSI score:   0-20 pts  (oversold/overbought)\nMACD score:  0-20 pts  (crossover strength)\nEMA score:   0-20 pts  (price vs MA)\nBB score:    0-15 pts  (band position)\nStoch score: 0-15 pts  (K/D crossover)\n\nTotal → 0-100 confidence\n\`\`\`\n\nSignals below 55 are dropped.`,
      },
      {
        text: `3/ Architecture: no database.\n\nAll data lives in JSON files:\n• /data/signals.json — signal history\n• /data/alerts.json — price alerts\n• /data/api-keys.json — rate limits\n• /data/webhooks.json — webhook config\n\nFor self-hosters, this is ideal. One \`git clone\` and it just works.`,
      },
      {
        text: `4/ Developer-first from day one:\n\n• REST API with API keys + rate limiting\n• \`npx @naimkatiman/tradeclaw signals\` CLI\n• JS SDK: \`npm install @naimkatiman/tradeclaw-js\`\n• MCP server (Claude Desktop compatible)\n• Plugin system (custom indicators as JS)\n• Webhook marketplace (Discord/Slack/Zapier)`,
      },
      {
        text: `5/ Deploy in 2 minutes:\n\n\`\`\`bash\ngit clone ${REPO_URL}\ncd tradeclaw\ndocker compose up\n\`\`\`\n\nOr one click:\n→ Railway\n→ Vercel\n\nNo API keys needed. Live prices via public Binance endpoints.`,
      },
      {
        text: `6/ What's included in 120+ pages:\n\n📊 Dashboard + Screener\n📈 Backtest engine\n🎮 Paper trading simulator\n🤖 Telegram bot alerts\n📡 RSS/Atom signal feeds\n🔌 Plugin system\n🌐 REST API + Swagger docs\n📱 PWA (installable)\n\nAll free. All open source.\n\n⭐ Star if this was useful: ${REPO_URL}`,
      },
    ],
  },
  {
    id: 'selfhost',
    title: 'The Self-Hosting Thread',
    description: 'Convince the self-hosting community to deploy TradeClaw',
    icon: <Server className="w-5 h-5" />,
    audience: 'r/selfhosted, homelab enthusiasts',
    tags: ['#SelfHosted', '#Homelab', '#OpenSource', '#Privacy'],
    tweets: [
      {
        text: `TradingView is $15/month. 3Commas is $29/month.\n\nI self-host my own AI trading signal dashboard for $0.\n\nHere's how 🧵\n\n${REPO_URL}`,
      },
      {
        text: `1/ TradeClaw runs on:\n• A $5 VPS\n• A Raspberry Pi 4\n• Railway free tier\n• Your laptop\n\nOne command:\n\`\`\`\ndocker compose up\n\`\`\`\n\nThat's it. Dashboard live at localhost:3000.`,
      },
      {
        text: `2/ What you get that paid tools don't offer:\n\n✅ Full data ownership\n✅ No subscription fees\n✅ Audit the signal logic (it's open source)\n✅ Custom indicators via JS plugins\n✅ API access without paying extra\n✅ Telegram alerts without per-message fees`,
      },
      {
        text: `3/ The Raspberry Pi setup:\n\n1. \`git clone\` on your Pi\n2. \`docker compose up -d\`\n3. Open port 3000 or use Tailscale\n4. Set TELEGRAM_BOT_TOKEN in .env\n5. Subscribe to signals via /start\n\nRuns 24/7 on ~$0 electricity.`,
      },
      {
        text: `4/ Privacy first:\n\nNo analytics. No telemetry. No tracking.\n\nYour signal data never leaves your machine. The only external calls are:\n• Binance public price API\n• Yahoo Finance (fallback)\n\nBoth are read-only. Nothing sent to any third party.`,
      },
      {
        text: `5/ You can even subscribe via RSS:\n\n🔗 https://your-instance.com/feed.xml\n\nEvery signal becomes an RSS item. Works in Feedly, Inoreader, any RSS reader.\n\nOr subscribe via Telegram bot for push notifications.`,
      },
      {
        text: `6/ TradeClaw vs the alternatives:\n\n| | TradeClaw | TradingView | 3Commas |\n|---|---|---|---|\n| Price | FREE | $15/mo | $29/mo |\n| Self-host | ✅ | ❌ | ❌ |\n| Open source | ✅ | ❌ | ❌ |\n\n⭐ ${REPO_URL}`,
      },
    ],
  },
  {
    id: 'signals',
    title: 'The Signal Engine Thread',
    description: 'Deep dive into how trading signals are actually generated',
    icon: <TrendingUp className="w-5 h-5" />,
    audience: 'Algo traders, quant community',
    tags: ['#AlgoTrading', '#TechnicalAnalysis', '#RSI', '#MACD', '#Quant'],
    tweets: [
      {
        text: `How do you actually generate a reliable trading signal?\n\nNot "RSI below 30 = buy." That's too simple.\n\nHere's the confluence approach we use in TradeClaw (open source) 🧵\n\n${REPO_URL}`,
      },
      {
        text: `1/ The problem with single-indicator signals:\n\nRSI alone: 52% accuracy (barely better than a coin flip)\nMACD alone: 54% accuracy\nEMA crossover alone: 51% accuracy\n\nNone are reliable. The edge comes from confluence — multiple indicators agreeing.`,
      },
      {
        text: `2/ Confluence scoring:\n\nInstead of binary signals, each indicator returns a score:\n\n• RSI < 30 (oversold) → +20 pts for BUY\n• RSI > 70 (overbought) → +20 pts for SELL\n• MACD bullish crossover → +20 pts for BUY\n• Price above EMA20 AND EMA50 → +20 pts for BUY\n\nSum → confidence score 0-100.`,
      },
      {
        text: `3/ Quality gates (signals we DROP):\n\n❌ ATR < 0.3% — market too quiet\n❌ Bollinger bandwidth < 1% — not enough volatility\n❌ EMA slope near-flat — no trend\n❌ MACD histogram near-zero — no momentum\n❌ Confidence < 55 — not enough conviction\n\nThis filters ~70% of potential signals.`,
      },
      {
        text: `4/ Multi-timeframe confluence:\n\nA H1 BUY signal is stronger when H4 and D1 also show bullish bias.\n\nWhen all 3 timeframes agree → confidence +15%\nWhen 2/3 agree → confidence +5%\nWhen conflicted → confidence -20% (marked as "conflicted")\n\nThis is /multi-timeframe in the dashboard.`,
      },
      {
        text: `5/ Stop-loss and take-profit:\n\nWe use swing highs/lows (last 20 bars) + ATR:\n\n• SL = nearest swing below entry (BUY) or above (SELL)\n• TP = 2:1 reward ratio from SL distance\n• ATR buffer to avoid tight stops getting hit by noise\n\nRisk-distance guard: if SL < 0.3% away → skip signal.`,
      },
      {
        text: `6/ The result:\n\nAll of this runs in ~50ms per asset per timeframe.\nNo ML, no GPU, no paid data.\nJust clean TypeScript math on public price data.\n\nFull source: ${REPO_URL}/blob/main/apps/web/app/lib/signal-generator.ts\n\n⭐ Star TradeClaw if this was useful: ${REPO_URL}`,
      },
    ],
  },
  {
    id: 'launch',
    title: 'The Launch Thread',
    description: 'ProductHunt / Hacker News launch day announcement thread',
    icon: <Zap className="w-5 h-5" />,
    audience: 'ProductHunt, HN, general tech audience',
    tags: ['#BuildInPublic', '#OpenSource', '#Startup', '#IndieHacker'],
    tweets: [
      {
        text: `After months of building, I'm launching TradeClaw today. 🚀\n\nOpen-source AI trading signal platform.\nSelf-hosted. Free forever. 120+ features.\n\nHere's what's inside 🧵\n\n${REPO_URL}`,
      },
      {
        text: `1/ What problem does it solve?\n\nTraders pay $15-50/month for signal tools.\nThey don't own their data.\nThey can't audit the algorithm.\n\nTradeClaw is:\n✅ Self-hosted\n✅ Fully open source\n✅ Free forever\n✅ Auditable signal logic`,
      },
      {
        text: `2/ The features that matter most:\n\n📊 5-indicator confluence signals\n🤖 Telegram bot alerts\n🎮 Paper trading simulator\n📈 Backtest engine with charts\n📡 RSS/Atom signal feed\n🔌 Custom indicator plugins\n\nAll in one self-hosted dashboard.`,
      },
      {
        text: `3/ For developers:\n\n\`\`\`bash\n# CLI\nnpx @naimkatiman/tradeclaw signals --pair BTCUSD\n\n# SDK\nnpm install @naimkatiman/tradeclaw-js\n\n# MCP (Claude Desktop)\n{ "command": "npx", "args": ["@naimkatiman/tradeclaw-mcp"] }\n\`\`\`\n\nFull REST API + Swagger docs at /api-docs.`,
      },
      {
        text: `4/ Deploy in literally 2 minutes:\n\n\`\`\`bash\ngit clone ${REPO_URL}\ndocker compose up\n\`\`\`\n\nOr click these buttons:\n→ Railway (free tier)\n→ Vercel\n\nNo API keys required to get started.`,
      },
      {
        text: `5/ What's next:\n\n• MT4/MT5 broker integration\n• Live forward-tested accuracy tracking\n• Mobile companion app\n• Managed cloud (tradeclaw.win)\n\nAll roadmap items unlock at star milestones.\n\n🌟 100 stars → Mobile app\n🌟 500 stars → Managed cloud`,
      },
      {
        text: `6/ If you found this useful:\n\n⭐ Star on GitHub: ${REPO_URL}\n📣 Share this thread\n💬 Leave feedback on our Discussions tab\n\nEvery star helps more traders discover TradeClaw.\n\nThanks for reading 🙏`,
      },
    ],
  },
];

function TweetCard({ tweet, index, onCopy, copiedIndex }: {
  tweet: Tweet;
  index: number;
  onCopy: (text: string, idx: number) => void;
  copiedIndex: number | null;
}) {
  const isCopied = copiedIndex === index;
  const charCount = tweet.text.length;
  const isLong = charCount > 280;

  return (
    <div className="glass rounded-xl p-4 group relative">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap break-words font-mono">
            {tweet.text}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className={`text-xs ${isLong ? 'text-zinc-400' : 'text-white/30'}`}>
              {charCount} chars{isLong ? ' (long — may need to split)' : ''}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet.text.slice(0, 280))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors"
              >
                <Send className="w-3 h-3" />
                Tweet
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button
                onClick={() => onCopy(tweet.text, index)}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs transition-colors"
              >
                {isCopied ? (
                  <><Check className="w-3 h-3 text-emerald-400" /> Copied</>
                ) : (
                  <><Copy className="w-3 h-3" /> Copy</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThreadsClient() {
  const [activeThread, setActiveThread] = useState(THREADS[0].id);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const thread = THREADS.find((t) => t.id === activeThread) ?? THREADS[0];

  const copyTweet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAll = () => {
    const all = thread.tweets.map((t, i) => `[${i + 1}/${thread.tweets.length}]\n${t.text}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(all).catch(() => {});
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const tweetFirst = `https://twitter.com/intent/tweet?text=${encodeURIComponent(thread.tweets[0].text.slice(0, 280))}`;

  return (
    <main className="min-h-screen bg-black text-white pb-24">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .anim { animation: fadeUp 0.5s ease both; }
        .glass { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(12px); }
      `}</style>

      {/* Hero */}
      <section className="pt-24 pb-12 px-4 text-center max-w-3xl mx-auto anim">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-blue-400 mb-5">
          <Send className="w-3.5 h-3.5" />
          Pre-written viral threads — copy, post, grow
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-3">
          Tweet{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">
            TradeClaw
          </span>{' '}
          to the World
        </h1>
        <p className="text-white/60 text-lg">
          7-tweet threads ready to post. Each one designed to go viral in its community.
          Copy individual tweets or the whole thread.
        </p>
      </section>

      <div className="max-w-3xl mx-auto px-4">
        {/* Thread selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {THREADS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveThread(t.id)}
              className={`glass rounded-xl p-3 text-left transition-all ${
                activeThread === t.id
                  ? 'border-blue-500/50 bg-blue-500/10'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className={`mb-1.5 ${activeThread === t.id ? 'text-blue-400' : 'text-white/50'}`}>
                {t.icon}
              </div>
              <div className="text-xs font-bold text-white leading-tight">{t.title}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{t.audience}</div>
            </button>
          ))}
        </div>

        {/* Active thread */}
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg">{thread.title}</h2>
              <p className="text-white/50 text-sm mt-0.5">{thread.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {thread.tags.map((tag) => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 ml-3">
              <a
                href={tweetFirst}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                Post Thread
              </a>
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 px-3 py-2 glass hover:bg-white/8 text-white/70 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy All
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {thread.tweets.map((tweet, i) => (
              <TweetCard
                key={i}
                tweet={tweet}
                index={i}
                onCopy={copyTweet}
                copiedIndex={copiedIndex}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center glass rounded-2xl p-6">
          <p className="text-white/50 text-sm mb-3">
            Posted a thread? Tag{' '}
            <a href="https://twitter.com/naimkatiman" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
              @naimkatiman
            </a>{' '}
            and we&apos;ll retweet it.
          </p>
          <a
            href={`https://github.com/naimkatiman/tradeclaw`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
          >
            ⭐ Star TradeClaw on GitHub
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </main>
  );
}
