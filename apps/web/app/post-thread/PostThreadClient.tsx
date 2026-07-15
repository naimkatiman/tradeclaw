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
        text: `I built a self-hostable, open-source trading research platform. Here\u2019s the architecture breakdown \ud83e\uddf5\n\n\u2192 Next.js monorepo\n\u2192 Deterministic signal rules plus an optional AI research bridge\n\u2192 PostgreSQL-backed histories and jobs\n\u2192 Docker Compose deployment\n\nGitHub: ${REPO_URL}`,
      },
      {
        text: `1/ The signal engine is deterministic.\n\nIt computes RSI, MACD, EMA, Bollinger Bands and Stochastic readings over provider-supplied OHLCV.\n\nThe deployment controls its provider configuration and schedule. The output is a rule-scored candidate, not an executed trade.`,
      },
      {
        text: `2/ The engine combines weighted momentum, trend and volatility readings.\n\nThe resulting 0-100 value is an internal rule score. It is not a calibrated probability. Publication and multi-timeframe gates are defined in source and may change with the implementation.`,
      },
      {
        text: `3/ PostgreSQL is part of the default stack.\n\nIt stores tracked signal history, resolved outcomes, user state and research jobs. Docker Compose provisions the database alongside the web application so the evidence ledger persists across restarts.`,
      },
      {
        text: `4/ Developer surfaces live in the same repository:\n\n\u2022 REST routes and API docs\n\u2022 CLI and JavaScript SDK packages\n\u2022 MCP package\n\u2022 Custom-indicator plugin support\n\u2022 Webhook and alert integrations\n\nInspect each package before depending on it in production.`,
      },
      {
        text: `5/ The documented local deployment starts with:\n\ngit clone ${REPO_URL}\ncd tradeclaw\ndocker compose up\n\nProduction deployments still need environment configuration, provider credentials where required, database persistence, secrets and operational monitoring.`,
      },
      {
        text: `6/ The repository includes a dashboard, screener, backtest tools, persistent paper trading, alert integrations, feeds, plugins and API documentation.\n\nThe source is MIT licensed. Hosting, data-provider and messaging costs remain the operator\u2019s responsibility.\n\n\u2b50 Star if this was useful: ${REPO_URL}`,
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
        text: `I wanted a trading research stack I could inspect and operate myself.\n\nTradeClaw is self-hostable and MIT licensed. Here\u2019s what that does and does not mean \ud83e\uddf5\n\n${REPO_URL}`,
      },
      {
        text: `1/ The default stack uses Docker Compose for the web app and PostgreSQL.\n\ndocker compose up\n\nActual CPU, memory, storage and network requirements depend on the markets, schedules and integrations you enable. Check the health endpoint before relying on an instance.`,
      },
      {
        text: `2/ Self-hosting gives you control over the application and its database, plus source access for auditing the rule logic.\n\nIt does not remove infrastructure, market-data, messaging or maintenance costs, and configured external providers still receive the requests needed to deliver their service.`,
      },
      {
        text: `3/ A responsible setup is more than starting a container:\n\n1. Review .env.example\n2. Configure strong secrets and provider access\n3. Start Docker Compose\n4. Verify migrations and /api/health\n5. Put the instance behind TLS and access controls\n6. Back up PostgreSQL`,
      },
      {
        text: `4/ Data flow is configuration-dependent.\n\nMarket-data providers, notification channels, optional analytics and AI services can receive requests when enabled. Review the environment variables and integration code, then enable only the services that fit your privacy requirements.`,
      },
      {
        text: `5/ You can even subscribe via RSS:\n\nhttps://your-instance.com/feed.xml\n\nEvery signal becomes an RSS item. Works in Feedly, Inoreader, any RSS reader.\n\nOr subscribe via Telegram bot for push notifications.`,
      },
      {
        text: `6/ The tradeoff:\n\nSelf-hosting provides source access and operational control. It also makes you responsible for security updates, backups, provider terms, availability and costs.\n\nRead the code and deployment docs before exposing an instance.\n\n\u2b50 ${REPO_URL}`,
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
        text: `How does TradeClaw turn indicator readings into a candidate signal?\n\nNot \u201cRSI below 30 = buy.\u201d The engine combines several deterministic rules.\n\nHere\u2019s the scoring approach (open source) \ud83e\uddf5\n\n${REPO_URL}`,
      },
      {
        text: `1/ Why not use one indicator?\n\nRSI can stay extreme during strong trends.\nMACD can lag at turning points.\nEMA crossovers can repeatedly reverse in ranges.\n\nTradeClaw combines several readings into one rule score. Agreement is a scoring rule, not proof of predictive edge.`,
      },
      {
        text: `2/ Confluence scoring:\n\nMomentum, trend and volatility readings contribute weighted points to BUY and SELL candidates.\n\nThe implementation includes partial scores and quality gates, so the source is the authoritative formula. The final 0-100 value is a rule score, not a probability.`,
      },
      {
        text: `3/ Quality gates can reject candidates for weak range, flat trend, insufficient momentum, poor indicator diversity or a rule score below the publication threshold.\n\nThe exact thresholds live in source. Rejection rates vary with the market and evaluation window.`,
      },
      {
        text: `4/ Multi-timeframe logic surveys several horizons. Agreement can add rule-score points and a conflicted survey can subtract them.\n\nThose adjustments are deterministic implementation rules, not evidence that an aligned candidate will be profitable.`,
      },
      {
        text: `5/ Entry, stop and target levels are derived by transparent functions in the signal engine. They are proposed levels from OHLCV calculations, not broker orders or fills.\n\nInspect the current source and test the assumptions for the market you intend to study.`,
      },
      {
        text: `6/ The implementation is deterministic TypeScript over market OHLCV.\n\nThat makes each rule inspectable and reproducible. It does not establish profitability: outcomes still need dated evaluation with costs and explicit sizing assumptions.\n\nFull source: ${REPO_URL}/blob/main/apps/web/app/lib/signal-generator.ts\n\n\u2b50 Star TradeClaw if this was useful: ${REPO_URL}`,
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
        text: `TradeClaw is a self-hostable, MIT-licensed trading research platform. \ud83d\ude80\n\nIt combines deterministic signal rules, recorded outcome studies, optional AI research and operator-controlled integrations.\n\nHere\u2019s what\u2019s inside \ud83e\uddf5\n\n${REPO_URL}`,
      },
      {
        text: `1/ The goal is inspectability.\n\nTradeClaw can be self-hosted, its rule logic is visible, and its PostgreSQL evidence ledger can be queried.\n\nOpen source does not make the signals profitable or remove hosting and provider costs.`,
      },
      {
        text: `2/ The repository includes:\n\n\ud83d\udcca Rule-scored signal candidates\n\ud83e\udd16 Alert integrations\n\ud83c\udfae Persistent paper trading\n\ud83d\udcc8 Backtest tools\n\ud83d\udce1 RSS/Atom feeds\n\ud83d\udd0c Custom indicator plugins\n\nAvailability still depends on deployment configuration.`,
      },
      {
        text: `3/ For developers:\n\nnpx @naimkatiman/tradeclaw signals --pair BTCUSD\n\nnpm install @naimkatiman/tradeclaw-js\n\nMCP config for Claude Desktop:\n{ "command": "npx", "args": ["@naimkatiman/tradeclaw-mcp"] }\n\nFull REST API + Swagger docs at /api-docs.`,
      },
      {
        text: `4/ Start the documented local stack with:\n\ngit clone ${REPO_URL}\ncd tradeclaw\ndocker compose up\n\nThen verify migrations and health, configure providers and integrations, and add production-grade secrets, persistence, TLS, backups and monitoring.`,
      },
      {
        text: `5/ Current boundaries matter:\n\n\u2022 Automated execution is disabled by default\n\u2022 The Binance perpetual executor is the implemented crypto path\n\u2022 The RoboForex TradFi execution bridge remains a scaffold\n\u2022 Public outcome studies use OHLCV resolution, not broker fills or customer-account returns`,
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
            <span className={`text-xs ${isLong ? 'text-zinc-400' : 'text-white/30'}`}>
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
              <div className="md:col-span-2 glass rounded-xl p-4 border border-zinc-500/20">
                <p className="text-zinc-400 text-xs font-semibold mb-1">Pro tip: Space tweets 10\u201315 min apart</p>
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
