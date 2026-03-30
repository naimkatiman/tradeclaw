'use client';

import { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Send,
  TrendingUp,
  Zap,
  Code2,
  Server,
  Clock,
  CalendarDays,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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
    title: 'Architecture Thread',
    description: 'Break down how TradeClaw works under the hood — for developers',
    icon: <Code2 className="w-5 h-5" />,
    audience: 'Developers, OSS community',
    tags: ['#OpenSource', '#NextJS', '#TypeScript', '#SelfHosted'],
    tweets: [
      {
        text: `I built an open-source AI trading signal platform in TypeScript. Here\u2019s the full architecture breakdown \ud83e\uddf5\n\n\u2192 5-indicator confluence scoring\n\u2192 Live prices from Binance + Yahoo Finance\n\u2192 40+ REST API endpoints\n\u2192 Zero database (file-based JSON)\n\nGitHub: ${REPO_URL}`,
      },
      {
        text: `1/ The signal engine is the core.\n\nEvery 5 minutes, we fetch OHLCV data for 10 assets and run 5 indicators:\n\u2022 RSI (Wilder\u2019s smoothing)\n\u2022 MACD (12/26/9)\n\u2022 EMA (20/50 crossover)\n\u2022 Bollinger Bands\n\u2022 Stochastic (14/3)\n\nEach indicator votes BUY/SELL with a weight.`,
      },
      {
        text: `2/ The scoring formula:\n\nRSI score:   0-20 pts  (oversold/overbought)\nMACD score:  0-20 pts  (crossover strength)\nEMA score:   0-20 pts  (price vs MA)\nBB score:    0-15 pts  (band position)\nStoch score: 0-15 pts  (K/D crossover)\n\nTotal \u2192 0-100 confidence\n\nSignals below 55 are dropped.`,
      },
      {
        text: `3/ Architecture: no database.\n\nAll data lives in JSON files:\n\u2022 /data/signals.json \u2014 signal history\n\u2022 /data/alerts.json \u2014 price alerts\n\u2022 /data/api-keys.json \u2014 rate limits\n\u2022 /data/webhooks.json \u2014 webhook config\n\nFor self-hosters, this is ideal. One git clone and it just works.`,
      },
      {
        text: `4/ Developer-first from day one:\n\n\u2022 REST API with API keys + rate limiting\n\u2022 npx tradeclaw signals CLI\n\u2022 JS SDK: npm install tradeclaw-js\n\u2022 MCP server (Claude Desktop compatible)\n\u2022 Plugin system (custom indicators as JS)\n\u2022 Webhook marketplace (Discord/Slack/Zapier)`,
      },
      {
        text: `5/ Deploy in 2 minutes:\n\ngit clone ${REPO_URL}\ncd tradeclaw\ndocker compose up\n\nOr one click:\n\u2192 Railway\n\u2192 Vercel\n\nNo API keys needed. Live prices via public Binance endpoints.`,
      },
      {
        text: `6/ What\u2019s included in 120+ pages:\n\n\ud83d\udcca Dashboard + Screener\n\ud83d\udcc8 Backtest engine\n\ud83c\udfae Paper trading simulator\n\ud83e\udd16 Telegram bot alerts\n\ud83d\udce1 RSS/Atom signal feeds\n\ud83d\udd0c Plugin system\n\ud83c\udf10 REST API + Swagger docs\n\ud83d\udcf1 PWA (installable)\n\nAll free. All open source.\n\n\u2b50 Star if this was useful: ${REPO_URL}`,
      },
    ],
  },
  {
    id: 'selfhost',
    title: 'Self-Hosting Thread',
    description: 'Convince the self-hosting community to deploy TradeClaw',
    icon: <Server className="w-5 h-5" />,
    audience: 'r/selfhosted, homelab enthusiasts',
    tags: ['#SelfHosted', '#Homelab', '#OpenSource', '#Privacy'],
    tweets: [
      {
        text: `TradingView is $15/month. 3Commas is $29/month.\n\nI self-host my own AI trading signal dashboard for $0.\n\nHere\u2019s how \ud83e\uddf5\n\n${REPO_URL}`,
      },
      {
        text: `1/ TradeClaw runs on:\n\u2022 A $5 VPS\n\u2022 A Raspberry Pi 4\n\u2022 Railway free tier\n\u2022 Your laptop\n\nOne command:\ndocker compose up\n\nThat\u2019s it. Dashboard live at localhost:3000.`,
      },
      {
        text: `2/ What you get that paid tools don\u2019t offer:\n\n\u2705 Full data ownership\n\u2705 No subscription fees\n\u2705 Audit the signal logic (it\u2019s open source)\n\u2705 Custom indicators via JS plugins\n\u2705 API access without paying extra\n\u2705 Telegram alerts without per-message fees`,
      },
      {
        text: `3/ The Raspberry Pi setup:\n\n1. git clone on your Pi\n2. docker compose up -d\n3. Open port 3000 or use Tailscale\n4. Set TELEGRAM_BOT_TOKEN in .env\n5. Subscribe to signals via /start\n\nRuns 24/7 on ~$0 electricity.`,
      },
      {
        text: `4/ Privacy first:\n\nNo analytics. No telemetry. No tracking.\n\nYour signal data never leaves your machine. The only external calls are:\n\u2022 Binance public price API\n\u2022 Yahoo Finance (fallback)\n\nBoth are read-only. Nothing sent to any third party.`,
      },
      {
        text: `5/ You can even subscribe via RSS:\n\nhttps://your-instance.com/feed.xml\n\nEvery signal becomes an RSS item. Works in Feedly, Inoreader, any RSS reader.\n\nOr subscribe via Telegram bot for push notifications.`,
      },
      {
        text: `6/ TradeClaw vs the alternatives:\n\nTradeClaw: FREE, self-host \u2705, open source \u2705\nTradingView: $15/mo, no self-host, closed source\n3Commas: $29/mo, no self-host, closed source\n\n\u2b50 ${REPO_URL}`,
      },
    ],
  },
  {
    id: 'signals',
    title: 'Signal Engine Thread',
    description: 'Deep dive into how trading signals are actually generated',
    icon: <TrendingUp className="w-5 h-5" />,
    audience: 'Algo traders, quant community',
    tags: ['#AlgoTrading', '#TechnicalAnalysis', '#RSI', '#MACD', '#Quant'],
    tweets: [
      {
        text: `How do you actually generate a reliable trading signal?\n\nNot \u201cRSI below 30 = buy.\u201d That\u2019s too simple.\n\nHere\u2019s the confluence approach we use in TradeClaw (open source) \ud83e\uddf5\n\n${REPO_URL}`,
      },
      {
        text: `1/ The problem with single-indicator signals:\n\nRSI alone: 52% accuracy (barely better than a coin flip)\nMACD alone: 54% accuracy\nEMA crossover alone: 51% accuracy\n\nNone are reliable. The edge comes from confluence \u2014 multiple indicators agreeing.`,
      },
      {
        text: `2/ Confluence scoring:\n\nInstead of binary signals, each indicator returns a score:\n\n\u2022 RSI < 30 (oversold) \u2192 +20 pts for BUY\n\u2022 RSI > 70 (overbought) \u2192 +20 pts for SELL\n\u2022 MACD bullish crossover \u2192 +20 pts for BUY\n\u2022 Price above EMA20 AND EMA50 \u2192 +20 pts for BUY\n\nSum \u2192 confidence score 0-100.`,
      },
      {
        text: `3/ Quality gates (signals we DROP):\n\n\u274c ATR < 0.3% \u2014 market too quiet\n\u274c Bollinger bandwidth < 1% \u2014 not enough volatility\n\u274c EMA slope near-flat \u2014 no trend\n\u274c MACD histogram near-zero \u2014 no momentum\n\u274c Confidence < 55 \u2014 not enough conviction\n\nThis filters ~70% of potential signals.`,
      },
      {
        text: `4/ Multi-timeframe confluence:\n\nA H1 BUY signal is stronger when H4 and D1 also show bullish bias.\n\nWhen all 3 timeframes agree \u2192 confidence +15%\nWhen 2/3 agree \u2192 confidence +5%\nWhen conflicted \u2192 confidence -20%\n\nThis is /multi-timeframe in the dashboard.`,
      },
      {
        text: `5/ Stop-loss and take-profit:\n\nWe use swing highs/lows (last 20 bars) + ATR:\n\n\u2022 SL = nearest swing below entry (BUY) or above (SELL)\n\u2022 TP = 2:1 reward ratio from SL distance\n\u2022 ATR buffer to avoid tight stops getting hit by noise\n\nRisk-distance guard: if SL < 0.3% away \u2192 skip signal.`,
      },
      {
        text: `6/ The result:\n\nAll of this runs in ~50ms per asset per timeframe.\nNo ML, no GPU, no paid data.\nJust clean TypeScript math on public price data.\n\nFull source: ${REPO_URL}/blob/main/apps/web/app/lib/signal-generator.ts\n\n\u2b50 Star TradeClaw if this was useful: ${REPO_URL}`,
      },
    ],
  },
  {
    id: 'launch',
    title: 'Launch Thread',
    description: 'ProductHunt / Hacker News launch day announcement thread',
    icon: <Zap className="w-5 h-5" />,
    audience: 'ProductHunt, HN, general tech audience',
    tags: ['#BuildInPublic', '#OpenSource', '#Startup', '#IndieHacker'],
    tweets: [
      {
        text: `After months of building, I\u2019m launching TradeClaw today. \ud83d\ude80\n\nOpen-source AI trading signal platform.\nSelf-hosted. Free forever. 120+ features.\n\nHere\u2019s what\u2019s inside \ud83e\uddf5\n\n${REPO_URL}`,
      },
      {
        text: `1/ What problem does it solve?\n\nTraders pay $15-50/month for signal tools.\nThey don\u2019t own their data.\nThey can\u2019t audit the algorithm.\n\nTradeClaw is:\n\u2705 Self-hosted\n\u2705 Fully open source\n\u2705 Free forever\n\u2705 Auditable signal logic`,
      },
      {
        text: `2/ The features that matter most:\n\n\ud83d\udcca 5-indicator confluence signals\n\ud83e\udd16 Telegram bot alerts\n\ud83c\udfae Paper trading simulator\n\ud83d\udcc8 Backtest engine with charts\n\ud83d\udce1 RSS/Atom signal feed\n\ud83d\udd0c Custom indicator plugins\n\nAll in one self-hosted dashboard.`,
      },
      {
        text: `3/ For developers:\n\nnpx tradeclaw signals --pair BTCUSD\n\nnpm install tradeclaw-js\n\nMCP config for Claude Desktop:\n{ "command": "npx", "args": ["tradeclaw-mcp"] }\n\nFull REST API + Swagger docs at /api-docs.`,
      },
      {
        text: `4/ Deploy in literally 2 minutes:\n\ngit clone ${REPO_URL}\ndocker compose up\n\nOr click these buttons:\n\u2192 Railway (free tier)\n\u2192 Vercel\n\nNo API keys required to get started.`,
      },
      {
        text: `5/ What\u2019s next:\n\n\u2022 MT4/MT5 broker integration\n\u2022 Live forward-tested accuracy tracking\n\u2022 Mobile companion app\n\u2022 Managed cloud (tradeclaw.win)\n\nAll roadmap items unlock at star milestones.\n\n\ud83c\udf1f 100 stars \u2192 Mobile app\n\ud83c\udf1f 500 stars \u2192 Managed cloud`,
      },
      {
        text: `6/ If you found this useful:\n\n\u2b50 Star on GitHub: ${REPO_URL}\n\ud83d\udce3 Share this thread\n\ud83d\udcac Leave feedback on our Discussions tab\n\nEvery star helps more traders discover TradeClaw.\n\nThanks for reading \ud83d\ude4f`,
      },
    ],
  },
];

const SCHEDULE_TIPS = [
  {
    icon: <CalendarDays className="w-5 h-5 text-blue-400" />,
    title: 'Best Days',
    tip: 'Tuesday, Wednesday, Thursday — highest engagement. Avoid Monday morning and Friday afternoon.',
  },
  {
    icon: <Clock className="w-5 h-5 text-emerald-400" />,
    title: 'Best Times (ET)',
    tip: '9\u201311 AM or 12\u20131 PM ET. Tech Twitter is most active during US morning hours.',
  },
  {
    icon: <Layers className="w-5 h-5 text-purple-400" />,
    title: 'Spacing Between Tweets',
    tip: 'Wait 10\u201315 minutes between each tweet in a thread. Rapid-fire threads get less visibility.',
  },
  {
    icon: <Send className="w-5 h-5 text-sky-400" />,
    title: 'Engagement Boost',
    tip: 'Like and reply to the first 3\u20135 comments within the first hour. Signals to the algorithm.',
  },
];

function TweetCard({
  tweet,
  index,
  total,
  onCopy,
  copiedIndex,
}: {
  tweet: Tweet;
  index: number;
  total: number;
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
          {index + 1}/{total}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap break-words font-mono">
            {tweet.text}
          </p>
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <span className={`text-xs ${isLong ? 'text-amber-400' : 'text-white/30'}`}>
              {charCount} chars{isLong ? ' \u2014 may need splitting' : ''}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet.text.slice(0, 280))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors"
              >
                <Send className="w-3 h-3" />
                Post this tweet
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button
                onClick={() => onCopy(tweet.text, index)}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostThreadClient() {
  const [activeThread, setActiveThread] = useState(THREADS[0].id);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  const thread = THREADS.find((t) => t.id === activeThread) ?? THREADS[0];

  const copyTweet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAll = () => {
    const all = thread.tweets
      .map((t, i) => `[${i + 1}/${thread.tweets.length}]\n${t.text}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(all).catch(() => {});
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const openAllTabs = () => {
    thread.tweets.forEach((tweet, i) => {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet.text.slice(0, 280))}`;
      // stagger slightly to avoid popup blockers
      setTimeout(() => {
        window.open(url, `tweet_${i}`);
      }, i * 200);
    });
  };

  const tweetFirst = `https://twitter.com/intent/tweet?text=${encodeURIComponent(thread.tweets[0].text.slice(0, 280))}`;

  return (
    <main className="min-h-screen bg-black text-white pb-24">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .anim { animation: fadeUp 0.5s ease both; }
        .glass { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(12px); }
        .glass:hover { background: rgba(255,255,255,0.06); }
      `}</style>

      {/* Hero */}
      <section className="pt-24 pb-10 px-4 text-center max-w-3xl mx-auto anim">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-blue-400 mb-5">
          <Send className="w-3.5 h-3.5" />
          7-tweet threads \u2014 ready to post
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-3">
          Post{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">
            TradeClaw
          </span>{' '}
          Threads
        </h1>
        <p className="text-white/60 text-lg">
          Pre-written viral threads for X/Twitter. One click per tweet \u2014 or open all at once.
        </p>
      </section>

      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Thread selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <div className="glass rounded-2xl p-5">
          {/* Thread header */}
          <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
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
            <div className="flex flex-col gap-2 shrink-0">
              <a
                href={tweetFirst}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                Post Thread (1st)
              </a>
              <button
                onClick={openAllTabs}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 text-blue-300 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                title="Opens each tweet in a new tab (allow popups)"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open All in Tabs
              </button>
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 px-3 py-2 glass hover:bg-white/8 text-white/70 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                {copiedAll ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Copy All
              </button>
            </div>
          </div>

          {/* Open All note */}
          <p className="text-[11px] text-white/30 mb-4 italic">
            &ldquo;Open All in Tabs&rdquo; opens {thread.tweets.length} tweet windows staggered 200ms apart. Allow popups for this site.
          </p>

          {/* Tweets */}
          <div className="space-y-3">
            {thread.tweets.map((tweet, i) => (
              <TweetCard
                key={i}
                tweet={tweet}
                index={i}
                total={thread.tweets.length}
                onCopy={copyTweet}
                copiedIndex={copiedIndex}
              />
            ))}
          </div>
        </div>

        {/* Scheduling tips — collapsible */}
        <div className="glass rounded-2xl overflow-hidden">
          <button
            onClick={() => setTipsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-sm">Thread Scheduling Tips</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                Max reach
              </span>
            </div>
            {tipsOpen ? (
              <ChevronUp className="w-4 h-4 text-white/40" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/40" />
            )}
          </button>
          {tipsOpen && (
            <div className="px-5 pb-5 grid md:grid-cols-2 gap-4 border-t border-white/5 pt-4">
              {SCHEDULE_TIPS.map((tip, i) => (
                <div key={i} className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {tip.icon}
                    <span className="font-semibold text-sm">{tip.title}</span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">{tip.tip}</p>
                </div>
              ))}
              <div className="md:col-span-2 glass rounded-xl p-4 border border-amber-500/20">
                <p className="text-amber-400 text-xs font-semibold mb-1">Pro tip: Space tweets 10\u201315 min apart</p>
                <p className="text-white/50 text-sm">
                  Post tweet 1, wait 15 min, post tweet 2, repeat. Drip-posting keeps your thread in
                  feeds longer than rapid-fire. Use the &ldquo;Post this tweet&rdquo; button on each card with a timer.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA footer */}
        <div className="text-center glass rounded-2xl p-6">
          <p className="text-white/50 text-sm mb-1">
            Posted a thread? Tag{' '}
            <a
              href="https://twitter.com/naimkatiman"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              @naimkatiman
            </a>{' '}
            and we&apos;ll retweet it.
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors mt-2"
          >
            &#11088; Star TradeClaw on GitHub
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </main>
  );
}
