"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const GITHUB_URL = "https://github.com/naimkatiman/tradeclaw";
const GOAL = 1000;

const MILESTONES = [
  { stars: 10, label: "First Steps", emoji: "🌱", reward: "You'll be in the founders list" },
  { stars: 25, label: "Early Believer", emoji: "🌿", reward: "Featured in release notes" },
  { stars: 50, label: "Growing", emoji: "🌳", reward: "GitHub Trending candidate" },
  { stars: 100, label: "Momentum", emoji: "🔥", reward: "Awesome-lists eligible" },
  { stars: 250, label: "Viral Territory", emoji: "🚀", reward: "ProductHunt launch ready" },
  { stars: 500, label: "Half Way", emoji: "⚡", reward: "HN Show HN front page shot" },
  { stars: 1000, label: "The Goal", emoji: "🌟", reward: "Open-source hall of fame" },
];

const SHARE_TWEETS = [
  `🤖 Just found TradeClaw — free, self-hosted AI trading signals for forex, crypto & metals. Open source, MIT license. No paywalls ever.\n\n${GITHUB_URL}\n\n#algotrading #openSource #tradingSignals`,
  `If you trade forex or crypto, check out TradeClaw — open-source AI signals with RSI, MACD, EMA. Self-host it for free.\n\n⭐ ${GITHUB_URL}\n\n#trading #crypto #selfhosted`,
  `Stop paying for signal services.\n\nTradeClaw = free AI trading signals, self-hosted, open source. Docker one-click deploy.\n\n${GITHUB_URL}\n\n#tradeclaw #algotrading`,
];

const REDDIT_POSTS = [
  {
    sub: "r/algotrading",
    title: "I built an open-source self-hosted AI trading signal platform — free forever, MIT license",
    body: `Hey r/algotrading,\n\nBuilt TradeClaw — self-hosted AI trading signals for forex, crypto & commodities. RSI, MACD, EMA, Bollinger Bands. Backtesting, paper trading, Telegram alerts.\n\nFree forever. No paywalls. Docker one-click.\n\nGitHub: ${GITHUB_URL}\n\nLive demo: https://tradeclaw.win\n\nFeedback welcome!`,
  },
  {
    sub: "r/selfhosted",
    title: "TradeClaw — self-hosted AI trading signal platform, MIT license, Docker one-click",
    body: `Hi r/selfhosted!\n\nJust open-sourced TradeClaw — a self-hosted AI trading signal platform. Runs locally with Docker, no external services required.\n\nFeatures: live signals, backtesting, paper trading, screener, Telegram bot, webhook alerts, plugin system.\n\nGitHub: ${GITHUB_URL}\n\nDocker: \`docker compose up\`\n\nFeedback appreciated!`,
  },
];

function CountUp({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setVal(current);
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return <>{val.toLocaleString()}</>;
}

export function StarCampaignClient() {
  const [stars, setStars] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tweetIdx, setTweetIdx] = useState(0);

  useEffect(() => {
    fetch("/api/github-stars")
      .then((r) => r.json())
      .then((d) => setStars(d.stars ?? 1))
      .catch(() => setStars(1));
  }, []);

  const pct = stars !== null ? Math.min((stars / GOAL) * 100, 100) : 0;
  const nextMilestone = MILESTONES.find((m) => (stars ?? 0) < m.stars);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-32 pb-16 text-center">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-yellow-400/5 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/15 bg-yellow-400/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-yellow-400">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Open Source · Free Forever
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Help Us Reach
            <br />
            <span className="text-yellow-400">1,000 ⭐ Stars</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-zinc-400 leading-relaxed">
            TradeClaw is free AI trading signals, self-hosted, open source, MIT licensed.
            No subscription. No paywalls. A star takes 2 seconds and helps thousands of
            traders discover it.
          </p>

          {/* Star CTA */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-full bg-yellow-400 px-8 py-4 text-base font-bold text-black transition-all hover:bg-yellow-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <StarIcon className="h-5 w-5" />
              Star on GitHub
              <span className="rounded-full bg-black/15 px-2.5 py-0.5 text-sm font-mono">
                {stars !== null ? stars.toLocaleString() : "…"} / {GOAL.toLocaleString()}
              </span>
            </a>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full border border-white/10 px-6 py-4 text-sm font-medium text-zinc-300 hover:border-white/20 hover:bg-white/5 transition-all"
            >
              View Live Demo →
            </Link>
          </div>

          {/* Progress bar */}
          <div className="mt-12 mx-auto max-w-xl">
            <div className="flex justify-between text-xs font-mono text-zinc-500 mb-2">
              <span>{stars !== null ? <CountUp target={stars} /> : "…"} stars</span>
              <span>{GOAL.toLocaleString()} goal</span>
            </div>
            <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden border border-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-1000"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-600 text-center">
              {pct.toFixed(1)}% of the way there
              {nextMilestone && (
                <> · next milestone: <span className="text-yellow-500">{nextMilestone.emoji} {nextMilestone.stars} stars</span></>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Why Star Section */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold mb-10">Why does it matter?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: "🔍",
                title: "GitHub Trending",
                desc: "More stars → trending → thousands of devs discover TradeClaw organically",
              },
              {
                icon: "📋",
                title: "Awesome Lists",
                desc: "Curated lists like awesome-selfhosted require stars. More stars = more inclusion",
              },
              {
                icon: "🛠️",
                title: "Better Software",
                desc: "Visibility = more contributors = faster development = better signals for you",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-white/8 bg-white/[0.025] p-6 text-center"
              >
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className="font-bold text-sm mb-2">{card.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestone Roadmap */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-bold mb-10">Star Milestones</h2>
          <div className="relative">
            <div className="absolute left-[18px] top-0 h-full w-0.5 bg-white/5" />
            <div className="space-y-4">
              {MILESTONES.map((m) => {
                const reached = (stars ?? 0) >= m.stars;
                return (
                  <div key={m.stars} className="flex items-start gap-4 pl-2">
                    <div
                      className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition-all ${
                        reached
                          ? "border-yellow-400/50 bg-yellow-400/15 text-yellow-400"
                          : "border-white/10 bg-white/5 text-zinc-600"
                      }`}
                    >
                      {reached ? "✓" : m.emoji}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-sm font-bold ${reached ? "text-yellow-400" : "text-zinc-400"}`}>
                          {m.stars.toLocaleString()} stars
                        </span>
                        <span className="text-xs text-zinc-600">{m.label}</span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-0.5">{m.reward}</p>
                    </div>
                    {reached && (
                      <span className="shrink-0 text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                        Reached!
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Share Section */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold mb-3">Spread the word</h2>
          <p className="text-center text-sm text-zinc-500 mb-10">
            Sharing takes 30 seconds and helps more traders find free open-source tools.
          </p>

          {/* Twitter */}
          <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.025] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <XIcon className="h-4 w-4 text-white" />
                <span className="text-sm font-medium">Share on X / Twitter</span>
              </div>
              <div className="flex gap-2">
                {SHARE_TWEETS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTweetIdx(i)}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                      tweetIdx === i ? "bg-emerald-400 w-4" : "bg-white/20"
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono whitespace-pre-line mb-3">
              {SHARE_TWEETS[tweetIdx]}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => copy(SHARE_TWEETS[tweetIdx], "tweet")}
                className="flex-1 rounded-lg border border-white/10 py-2 text-xs text-zinc-400 hover:border-white/20 hover:text-white transition-all"
              >
                {copied === "tweet" ? "✓ Copied!" : "Copy text"}
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TWEETS[tweetIdx])}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-white/5 py-2 text-center text-xs font-medium hover:bg-white/10 transition-all"
              >
                Open Twitter →
              </a>
            </div>
          </div>

          {/* Reddit */}
          <div className="mb-4 space-y-3">
            {REDDIT_POSTS.map((post, i) => (
              <div key={i} className="rounded-xl border border-white/8 bg-white/[0.025] p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-400">{post.sub}</span>
                  <a
                    href={`https://www.reddit.com/${post.sub}/submit?title=${encodeURIComponent(post.title)}&text=${encodeURIComponent(post.body)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-white transition-colors"
                  >
                    Post on Reddit →
                  </a>
                </div>
                <p className="text-xs font-medium text-zinc-300 mb-1">{post.title}</p>
                <button
                  onClick={() => copy(post.body, `reddit-${i}`)}
                  className="mt-2 w-full rounded-lg border border-white/10 py-2 text-xs text-zinc-500 hover:border-white/20 hover:text-white transition-all"
                >
                  {copied === `reddit-${i}` ? "✓ Copied body!" : "Copy post body"}
                </button>
              </div>
            ))}
          </div>

          {/* Direct share links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              {
                label: "LinkedIn",
                href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent("https://github.com/naimkatiman/tradeclaw")}&title=${encodeURIComponent("TradeClaw — Open Source AI Trading Signals")}`,
                color: "text-blue-400",
              },
              {
                label: "HN",
                href: `https://news.ycombinator.com/submitlink?u=${encodeURIComponent("https://github.com/naimkatiman/tradeclaw")}&t=${encodeURIComponent("TradeClaw – Self-hosted AI Trading Signals (MIT)")}`,
                color: "text-orange-400",
              },
              {
                label: "Telegram",
                href: `https://t.me/share/url?url=${encodeURIComponent("https://github.com/naimkatiman/tradeclaw")}&text=${encodeURIComponent("TradeClaw — free self-hosted AI trading signals")}`,
                color: "text-sky-400",
              },
              {
                label: "Copy link",
                onClick: () => copy("https://github.com/naimkatiman/tradeclaw", "link"),
                color: "text-zinc-400",
              },
            ].map((item) =>
              item.onClick ? (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`rounded-xl border border-white/8 bg-white/[0.025] py-3 text-sm font-medium ${item.color} hover:border-white/15 hover:bg-white/5 transition-all`}
                >
                  {copied === "link" ? "✓ Copied!" : item.label}
                </button>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`rounded-xl border border-white/8 bg-white/[0.025] py-3 text-center text-sm font-medium ${item.color} hover:border-white/15 hover:bg-white/5 transition-all`}
                >
                  {item.label}
                </a>
              )
            )}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-16 border-t border-white/5 text-center">
        <div className="mx-auto max-w-xl">
          <div className="text-4xl mb-4">⭐</div>
          <h2 className="text-2xl font-bold mb-3">2 seconds. Zero cost. Real impact.</h2>
          <p className="text-sm text-zinc-500 mb-8">
            Every star makes TradeClaw more discoverable to traders who need free tools.
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-8 py-4 text-base font-bold text-black hover:bg-yellow-300 transition-all hover:scale-[1.02]"
          >
            <StarIcon className="h-5 w-5" />
            Star TradeClaw on GitHub
          </a>
          <p className="mt-6 text-xs text-zinc-700">
            <Link href="/" className="hover:text-zinc-500 transition-colors">← Back to TradeClaw</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
