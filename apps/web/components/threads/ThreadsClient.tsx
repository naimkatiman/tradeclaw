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
        text: `I built a self-hostable, open-source trading research platform. Here's the architecture breakdown 🧵\n\n→ Next.js monorepo\n→ Deterministic signal rules plus an optional AI research bridge\n→ PostgreSQL-backed histories and jobs\n→ Docker Compose deployment\n\nGitHub: ${REPO_URL}`,
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
        text: `4/ Developer surfaces live in the same repository:\n\n• REST routes and API docs\n• CLI and JavaScript SDK packages\n• MCP package\n• Custom-indicator plugin support\n• Webhook and alert integrations\n\nInspect each package before depending on it in production.`,
      },
      {
        text: `5/ The documented local deployment starts with:\n\n\`\`\`bash\ngit clone ${REPO_URL}\ncd tradeclaw\ndocker compose up\n\`\`\`\n\nProduction deployments still need environment configuration, provider credentials where required, database persistence, secrets and operational monitoring.`,
      },
      {
        text: `6/ The repository includes a dashboard, screener, backtest tools, persistent paper trading, alert integrations, feeds, plugins and API documentation.\n\nThe source is MIT licensed. Hosting, data-provider and messaging costs remain the operator's responsibility.\n\n⭐ Star if this was useful: ${REPO_URL}`,
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
        text: `I wanted a trading research stack I could inspect and operate myself.\n\nTradeClaw is self-hostable and MIT licensed. Here's what that does and does not mean 🧵\n\n${REPO_URL}`,
      },
      {
        text: `1/ The default stack uses Docker Compose for the web app and PostgreSQL.\n\n\`\`\`\ndocker compose up\n\`\`\`\n\nActual CPU, memory, storage and network requirements depend on the markets, schedules and integrations you enable. Check the health endpoint before relying on an instance.`,
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
        text: `5/ You can even subscribe via RSS:\n\n🔗 https://your-instance.com/feed.xml\n\nEvery signal becomes an RSS item. Works in Feedly, Inoreader, any RSS reader.\n\nOr subscribe via Telegram bot for push notifications.`,
      },
      {
        text: `6/ The tradeoff:\n\nSelf-hosting provides source access and operational control. It also makes you responsible for security updates, backups, provider terms, availability and costs.\n\nRead the code and deployment docs before exposing an instance.\n\n⭐ ${REPO_URL}`,
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
        text: `How does TradeClaw turn indicator readings into a candidate signal?\n\nNot "RSI below 30 = buy." The engine combines several deterministic rules.\n\nHere's the scoring approach (open source) 🧵\n\n${REPO_URL}`,
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
        text: `6/ The implementation is deterministic TypeScript over market OHLCV.\n\nThat makes each rule inspectable and reproducible. It does not establish profitability: outcomes still need dated evaluation with costs and explicit sizing assumptions.\n\nFull source: ${REPO_URL}/blob/main/apps/web/app/lib/signal-generator.ts\n\n⭐ Star TradeClaw if this was useful: ${REPO_URL}`,
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
        text: `TradeClaw is a self-hostable, MIT-licensed trading research platform. 🚀\n\nIt combines deterministic signal rules, recorded outcome studies, optional AI research and operator-controlled integrations.\n\nHere's what's inside 🧵\n\n${REPO_URL}`,
      },
      {
        text: `1/ The goal is inspectability.\n\nTradeClaw can be self-hosted, its rule logic is visible, and its PostgreSQL evidence ledger can be queried.\n\nOpen source does not make the signals profitable or remove hosting and provider costs.`,
      },
      {
        text: `2/ The repository includes:\n\n📊 Rule-scored signal candidates\n🤖 Alert integrations\n🎮 Persistent paper trading\n📈 Backtest tools\n📡 RSS/Atom feeds\n🔌 Custom indicator plugins\n\nAvailability still depends on deployment configuration.`,
      },
      {
        text: `3/ For developers:\n\n\`\`\`bash\n# CLI\nnpx @naimkatiman/tradeclaw signals --pair BTCUSD\n\n# SDK\nnpm install @naimkatiman/tradeclaw-js\n\n# MCP (Claude Desktop)\n{ "command": "npx", "args": ["@naimkatiman/tradeclaw-mcp"] }\n\`\`\`\n\nFull REST API + Swagger docs at /api-docs.`,
      },
      {
        text: `4/ Start the documented local stack with:\n\n\`\`\`bash\ngit clone ${REPO_URL}\ncd tradeclaw\ndocker compose up\n\`\`\`\n\nThen verify migrations and health, configure providers and integrations, and add production-grade secrets, persistence, TLS, backups and monitoring.`,
      },
      {
        text: `5/ Current boundaries matter:\n\n• Automated execution is disabled by default\n• The Binance perpetual executor is the implemented crypto path\n• The RoboForex TradFi execution bridge remains a scaffold\n• Public outcome studies use OHLCV resolution, not broker fills or customer-account returns`,
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
