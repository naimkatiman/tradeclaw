"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Plug, Smartphone, Cloud, BarChart2, Search, TrendingUp, Wrench, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const GITHUB_URL = "https://github.com/naimkatiman/tradeclaw";
const GOAL = 1000;

const MILESTONES: Array<{ stars: number; icon: LucideIcon; feature: string; desc: string }> = [
  {
    stars: 100,
    icon: Plug,
    feature: "MT4/MT5 broker integration",
    desc: "Connect your broker directly — auto-execute signals from TradeClaw",
  },
  {
    stars: 250,
    icon: Smartphone,
    feature: "Mobile app (React Native)",
    desc: "Real-time signals and alerts on your phone, with push notifications",
  },
  {
    stars: 500,
    icon: Cloud,
    feature: "Hosted cloud version (free tier)",
    desc: "No Docker required — sign up and get signals instantly, free forever",
  },
  {
    stars: 1000,
    icon: BarChart2,
    feature: "Full backtesting engine with real broker data",
    desc: "Test any strategy against historical tick data from live brokers",
  },
];

const SHARE_TWEETS = [
  `🤖 Just found TradeClaw — free, self-hosted AI trading signals for forex, crypto & metals. Open source, MIT license. No paywalls ever.\n\n${GITHUB_URL}\n\n#algotrading #openSource #tradingSignals`,
  `If you trade forex or crypto, check out TradeClaw — open-source AI signals with RSI, MACD, EMA, Bollinger Bands. Self-host it for free.\n\n⭐ ${GITHUB_URL}\n\n#trading #crypto #selfhosted`,
  `Stop paying for signal services.\n\nTradeClaw = free AI trading signals, self-hosted, open source. Docker one-click deploy.\n\n${GITHUB_URL}\n\n#tradeclaw #algotrading`,
];

const LINKEDIN_POST = `🚀 Excited about this open-source project: TradeClaw

TradeClaw is a self-hosted AI trading signal platform for forex, crypto, and commodities. It uses RSI, MACD, EMA, and Bollinger Bands to generate real-time BUY/SELL signals.

What makes it different:
• Completely free, MIT licensed
• Self-hosted — your data stays private
• Docker one-click deployment
• Backtesting, paper trading, Telegram alerts

If you're into quantitative trading or self-hosted tools, check it out:
${GITHUB_URL}

#OpenSource #Trading #AlgoTrading #FinTech #SelfHosted`;

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

const DISCORD_MSG = `Hey everyone! 👋

Check out **TradeClaw** — an open-source, self-hosted AI trading signal platform.

🔹 Free forever (MIT license)
🔹 Forex, crypto, commodities
🔹 RSI, MACD, EMA, Bollinger Bands
🔹 Docker one-click deploy
🔹 Backtesting + paper trading

GitHub: <${GITHUB_URL}>
Live demo: <https://tradeclaw.win>

If you find it useful, drop a ⭐ on GitHub — it helps more traders discover free tools!`;

const BADGE_MD = `[![TradeClaw Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw)`;

function CountUp({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return <>{val.toLocaleString()}</>;
}

export function StarClient() {
  const [stars, setStars] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tweetIdx, setTweetIdx] = useState(0);
  const [email, setEmail] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [notifyMsg, setNotifyMsg] = useState("");

  useEffect(() => {
    fetch("/api/github-stars")
      .then((r) => r.json())
      .then((d) => setStars(d.stars ?? 1))
      .catch(() => setStars(1));
  }, []);

  const pct = stars !== null ? Math.min((stars / GOAL) * 100, 100) : 0;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    setNotifyStatus("loading");
    try {
      const res = await fetch("/api/star-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotifyStatus("error");
        setNotifyMsg(data.error || "Something went wrong");
      } else {
        setNotifyStatus("success");
        setNotifyMsg(data.message);
        setEmail("");
      }
    } catch {
      setNotifyStatus("error");
      setNotifyMsg("Network error. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden px-6 pt-32 pb-16 text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-yellow-400/5 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/15 bg-yellow-400/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-yellow-400">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Community Campaign
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Help TradeClaw reach
            <br />
            <span className="text-yellow-400">1,000 <Star className="w-5 h-5 inline" /></span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-zinc-400 leading-relaxed">
            Free, open-source AI trading signals. No paywall. Forever.
            <br />
            Every star unlocks new features for the community.
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
              {stars !== null && (
                <span className="rounded-full bg-black/15 px-2.5 py-0.5 text-sm font-mono">
                  {stars.toLocaleString()}
                </span>
              )}
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
            </p>
          </div>
        </div>
      </section>

      {/* ─── MILESTONE REWARDS ─── */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold mb-3">Milestone Rewards</h2>
          <p className="text-center text-sm text-zinc-500 mb-10">
            Starring = voting for features. Hit the milestone, we ship it.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MILESTONES.map((m) => {
              const reached = (stars ?? 0) >= m.stars;
              const progress = stars !== null ? Math.min((stars / m.stars) * 100, 100) : 0;
              return (
                <div
                  key={m.stars}
                  className={`rounded-xl border p-5 transition-all ${
                    reached
                      ? "border-yellow-400/30 bg-yellow-400/5"
                      : "border-white/8 bg-white/[0.025]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <m.icon className="w-6 h-6 text-emerald-400" />
                      <span className={`text-sm font-bold font-mono ${reached ? "text-yellow-400" : "text-zinc-300"}`}>
                        {m.stars.toLocaleString()} <Star className="w-3.5 h-3.5 inline" />
                      </span>
                    </div>
                    {reached && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                        Unlocked
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{m.feature}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-3">{m.desc}</p>
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        reached ? "bg-yellow-400" : "bg-yellow-400/40"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1 font-mono">
                    {stars !== null ? Math.min(stars, m.stars) : 0} / {m.stars}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-center text-[10px] text-zinc-700 mt-6">
            These are community-voted feature pledges, not guaranteed ETAs.
            Stars signal demand — we prioritize accordingly.
          </p>
        </div>
      </section>

      {/* ─── SHARE & SPREAD ─── */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold mb-3">Share &amp; Spread</h2>
          <p className="text-center text-sm text-zinc-500 mb-10">
            30 seconds of sharing helps thousands of traders discover free tools.
          </p>

          {/* Twitter */}
          <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.025] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <XIcon className="h-4 w-4 text-white" />
                <span className="text-sm font-medium">X / Twitter</span>
              </div>
              <div className="flex gap-2">
                {SHARE_TWEETS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTweetIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      tweetIdx === i ? "bg-emerald-400 w-4" : "bg-white/20 w-1.5"
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
                Share on Twitter →
              </a>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.025] p-5">
            <div className="flex items-center gap-2 mb-3">
              <LinkedInIcon className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium">LinkedIn</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono whitespace-pre-line mb-3 max-h-32 overflow-y-auto">
              {LINKEDIN_POST}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => copy(LINKEDIN_POST, "linkedin")}
                className="flex-1 rounded-lg border border-white/10 py-2 text-xs text-zinc-400 hover:border-white/20 hover:text-white transition-all"
              >
                {copied === "linkedin" ? "✓ Copied!" : "Copy text"}
              </button>
              <a
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(GITHUB_URL)}&title=${encodeURIComponent("TradeClaw — Open Source AI Trading Signals")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-blue-500/10 py-2 text-center text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-all"
              >
                Share on LinkedIn →
              </a>
            </div>
          </div>

          {/* Reddit */}
          {REDDIT_POSTS.map((post, i) => (
            <div key={i} className="mb-4 rounded-xl border border-white/8 bg-white/[0.025] p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RedditIcon className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium text-orange-400">{post.sub}</span>
                </div>
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
                {copied === `reddit-${i}` ? "✓ Copied!" : "Copy post body"}
              </button>
            </div>
          ))}

          {/* Discord */}
          <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.025] p-5">
            <div className="flex items-center gap-2 mb-3">
              <DiscordIcon className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium">Discord</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono whitespace-pre-line mb-3 max-h-32 overflow-y-auto">
              {DISCORD_MSG}
            </p>
            <button
              onClick={() => copy(DISCORD_MSG, "discord")}
              className="w-full rounded-lg border border-white/10 py-2 text-xs text-zinc-400 hover:border-white/20 hover:text-white transition-all"
            >
              {copied === "discord" ? "✓ Copied!" : "Copy Discord message"}
            </button>
          </div>

          {/* Quick share row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              {
                label: "Telegram",
                href: `https://t.me/share/url?url=${encodeURIComponent(GITHUB_URL)}&text=${encodeURIComponent("TradeClaw — free self-hosted AI trading signals")}`,
                color: "text-sky-400",
              },
              {
                label: "Hacker News",
                href: `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(GITHUB_URL)}&t=${encodeURIComponent("TradeClaw – Self-hosted AI Trading Signals (MIT)")}`,
                color: "text-orange-400",
              },
              {
                label: "WhatsApp",
                href: `https://wa.me/?text=${encodeURIComponent(`Check out TradeClaw — free open-source AI trading signals: ${GITHUB_URL}`)}`,
                color: "text-green-400",
              },
              {
                label: "Copy link",
                onClick: () => copy(GITHUB_URL, "link"),
                color: "text-zinc-400",
              },
            ].map((item) =>
              "onClick" in item && item.onClick ? (
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
                  href={"href" in item ? item.href : "#"}
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

      {/* ─── NOTIFY ME ─── */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="mx-auto max-w-md text-center">
          <h2 className="text-2xl font-bold mb-3">Get notified on milestones</h2>
          <p className="text-sm text-zinc-500 mb-6">
            We&apos;ll email you when we hit 100, 500, and 1,000 stars. That&apos;s it. No spam.
          </p>

          <form onSubmit={handleNotify} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-yellow-400/40 transition-colors"
            />
            <button
              type="submit"
              disabled={notifyStatus === "loading"}
              className="rounded-lg bg-yellow-400 px-5 py-3 text-sm font-bold text-black hover:bg-yellow-300 transition-all disabled:opacity-50"
            >
              {notifyStatus === "loading" ? "…" : "Notify me"}
            </button>
          </form>

          {notifyStatus === "success" && (
            <p className="mt-3 text-xs text-emerald-400">{notifyMsg}</p>
          )}
          {notifyStatus === "error" && (
            <p className="mt-3 text-xs text-rose-400">{notifyMsg}</p>
          )}

          <p className="mt-4 text-[10px] text-zinc-700">
            We only email on milestone hits. No marketing. No spam. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* ─── BADGE FOR YOUR README ─── */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold mb-3">Badge for your README</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Show your support. Add this badge to your repo.
          </p>

          {/* Preview */}
          <div className="mb-4 inline-block rounded-lg border border-white/10 bg-white/5 px-6 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social"
              alt="TradeClaw Stars"
              className="h-5"
            />
          </div>

          <div className="relative rounded-lg border border-white/8 bg-white/[0.025] p-4">
            <code className="block text-[11px] text-zinc-400 font-mono break-all text-left leading-relaxed">
              {BADGE_MD}
            </code>
            <button
              onClick={() => copy(BADGE_MD, "badge")}
              className="absolute top-2 right-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-zinc-400 hover:text-white hover:border-white/20 transition-all"
            >
              {copied === "badge" ? "✓ Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </section>

      {/* ─── WHY STAR ─── */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold mb-10">Why star?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {([
              {
                icon: Search,
                title: "Discoverability",
                desc: "Every star helps more developers discover TradeClaw on GitHub search and explore",
              },
              {
                icon: TrendingUp,
                title: "GitHub Trending",
                desc: "Stars = visibility on GitHub Trending. Trending = thousands of new users organically",
              },
              {
                icon: Wrench,
                title: "Better for everyone",
                desc: "More stars = more contributors = better signals, more features, faster development",
              },
            ] as { icon: LucideIcon; title: string; desc: string }[]).map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-white/8 bg-white/[0.025] p-6 text-center"
              >
                <div className="mb-3 flex justify-center"><card.icon className="w-7 h-7 text-emerald-400" /></div>
                <h3 className="font-bold text-sm mb-2">{card.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER CTA ─── */}
      <section className="px-6 py-16 border-t border-white/5 text-center">
        <div className="mx-auto max-w-xl">
          <div className="text-4xl mb-4"><Star className="w-10 h-10 text-yellow-400 mx-auto" /></div>
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

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.463.327.327 0 00-.462 0c-.545.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.205-.094z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  );
}
