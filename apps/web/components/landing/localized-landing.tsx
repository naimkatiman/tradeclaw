"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Locale, Translations } from "../../lib/translations";
import { LocaleSwitcher } from "./locale-switcher";

const GITHUB_URL = "https://github.com/naimkatiman/tradeclaw";

const SIGNALS = [
  { symbol: "XAU/USD", direction: "BUY" as const, confidence: 87, price: "2,648.30" },
  { symbol: "BTC/USD", direction: "SELL" as const, confidence: 74, price: "94,210.50" },
  { symbol: "EUR/USD", direction: "BUY" as const, confidence: 81, price: "1.0832" },
  { symbol: "GBP/JPY", direction: "SELL" as const, confidence: 68, price: "191.540" },
  { symbol: "ETH/USD", direction: "BUY" as const, confidence: 79, price: "3,412.80" },
  { symbol: "OIL/USD", direction: "SELL" as const, confidence: 72, price: "78.340" },
];
const TICKER_SIGNALS = [...SIGNALS, ...SIGNALS];

const STAT_TARGETS = [847, 52000, 12, 430];
const STAT_SUFFIXES = ["+", "+", "", "+"];

const STEP_CODES = [
  "docker compose up -d",
  "SYMBOLS=EURUSD,BTCUSD,XAUUSD",
  "Signal: XAU/USD BUY @ 87%",
];

const STEP_NUMBERS = ["01", "02", "03"];

const DEPLOY_OPTIONS = [
  { name: "Railway", color: "text-purple-400", bg: "bg-purple-500/8 border-purple-500/20 hover:border-purple-500/40" },
  { name: "Vercel", color: "text-white", bg: "bg-white/[0.04] border-white/12 hover:border-white/20" },
  { name: "Docker", color: "text-blue-400", bg: "bg-blue-500/8 border-blue-500/20 hover:border-blue-500/40" },
];

/* ─── Count-up hook ─── */
function useCountUp(target: number, duration: number, triggered: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!triggered) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, triggered]);
  return count;
}

function StatCard({ target, suffix, label, description }: { target: number; suffix: string; label: string; description: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);
  const count = useCountUp(target, 1800, triggered);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setTriggered(true); observer.disconnect(); }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="glass-card rounded-2xl p-8 text-center flex flex-col items-center gap-2">
      <div className="text-4xl font-bold tabular-nums tracking-tight text-white sm:text-5xl">
        {count >= 1000 ? (count / 1000).toFixed(count >= 10000 ? 0 : 1) + "k" : count.toLocaleString()}
        <span className="text-emerald-400">{suffix}</span>
      </div>
      <div className="text-sm font-semibold text-zinc-300">{label}</div>
      <div className="text-xs text-zinc-600 max-w-[150px]">{description}</div>
    </div>
  );
}

/* ─── Main localized landing ─── */
export function LocalizedLanding({ t, locale }: { t: Translations; locale: Locale }) {
  const [stars, setStars] = useState<number | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  useEffect(() => {
    fetch("https://api.github.com/repos/naimkatiman/tradeclaw")
      .then((r) => r.json())
      .then((d: unknown) => {
        if (d && typeof d === "object" && "stargazers_count" in d) {
          setStars((d as { stargazers_count: number }).stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  const handleFaqToggle = useCallback((i: number) => {
    setFaqOpen((prev) => (prev === i ? null : i));
  }, []);

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-16 text-center">
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050505]/60 via-transparent to-[#050505]/80" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-6 flex justify-center">
            <LocaleSwitcher current={locale} />
          </div>

          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t.hero.badge}
          </div>

          <h1 className="text-5xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-6xl lg:text-7xl text-white">
            {t.hero.headline}
            <br />
            <span className="text-emerald-400" style={{ textShadow: "0 0 40px rgba(52,211,153,0.4)" }}>
              {t.hero.headlineAccent}
            </span>{" "}
            {t.hero.headlineSuffix}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-400 leading-relaxed sm:text-lg">
            {t.hero.subheadline}
          </p>

          {/* Signal ticker */}
          <div className="relative mt-10 overflow-hidden rounded-xl border border-white/8 bg-[#0a0a0a]">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">{t.hero.signalFeed}</span>
            </div>
            <div className="overflow-hidden py-3">
              <div className="flex gap-3 w-max" style={{ animation: "ticker 30s linear infinite" }}>
                {TICKER_SIGNALS.map((sig, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/3 px-3 py-2 text-xs whitespace-nowrap">
                    <span className="font-mono font-medium text-white">{sig.symbol}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${sig.direction === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {sig.direction}
                    </span>
                    <span className="text-zinc-500">{sig.confidence}%</span>
                    <span className="font-mono text-zinc-400">{sig.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href="#deploy" className="group flex items-center gap-2.5 rounded-full bg-emerald-500 px-7 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]">
              {t.hero.ctaPrimary}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5">
                <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-7 py-3 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/20 hover:bg-white/8 hover:text-white">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
                <path d="M7.5.25A7.25 7.25 0 0 0 .25 7.5c0 3.2 2.07 5.91 4.94 6.87.36.07.49-.16.49-.35v-1.22c-2 .43-2.42-.97-2.42-.97-.33-.83-.8-1.05-.8-1.05-.65-.45.05-.44.05-.44.72.05 1.1.74 1.1.74.64 1.1 1.68.78 2.09.6.06-.46.25-.78.45-.96-1.59-.18-3.26-.8-3.26-3.55 0-.78.28-1.42.74-1.92-.07-.18-.32-.91.07-1.9 0 0 .6-.19 1.98.74a6.9 6.9 0 0 1 1.8-.24c.61 0 1.22.08 1.8.24 1.37-.93 1.97-.74 1.97-.74.39.99.14 1.72.07 1.9.46.5.74 1.14.74 1.92 0 2.76-1.68 3.37-3.27 3.55.26.22.49.66.49 1.33v1.97c0 .19.13.42.5.35A7.25 7.25 0 0 0 14.75 7.5 7.25 7.25 0 0 0 7.5.25Z" />
              </svg>
              {stars !== null ? `★ ${stars}` : t.hero.ctaSecondary}
            </a>
          </div>
        </div>
      </section>

      {/* ─── Social Proof / Stats ─── */}
      <section className="px-6 py-24 bg-[#050505]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1.5 text-xs uppercase tracking-widest text-zinc-500">
              {t.socialProof.badge}
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
              {t.socialProof.title}
              <span className="text-emerald-400">{t.socialProof.titleAccent}</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {t.socialProof.stats.map((stat, i) => (
              <StatCard key={i} target={STAT_TARGETS[i]} suffix={STAT_SUFFIXES[i]} label={stat.label} description={stat.description} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="px-6 py-24 bg-[#0a0a0a]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1.5 text-xs uppercase tracking-widest text-zinc-500">
              {t.howItWorks.badge}
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
              {t.howItWorks.title}
              <span className="text-emerald-400">{t.howItWorks.titleAccent}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-zinc-400">{t.howItWorks.subtitle}</p>
          </div>
          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="absolute top-10 left-1/6 right-1/6 hidden h-px bg-gradient-to-r from-transparent via-white/8 to-transparent md:block" />
            {t.howItWorks.steps.map((step, i) => (
              <div key={i} className="relative flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/8 text-emerald-400">
                    <span className="text-sm font-bold">{STEP_NUMBERS[i]}</span>
                  </div>
                </div>
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{step.description}</p>
                <div className="mt-auto rounded-lg border border-white/6 bg-[#050505] px-3.5 py-2.5">
                  <span className="text-emerald-400 font-mono text-xs">$ </span>
                  <span className="font-mono text-xs text-zinc-400">{STEP_CODES[i]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="px-6 py-24 bg-[#0a0a0a]">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-14">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1.5 text-xs uppercase tracking-widest text-zinc-500">
              {t.faq.badge}
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
              {t.faq.title}
              <span className="text-emerald-400">{t.faq.titleAccent}</span>
            </h2>
          </div>
          <div className="space-y-2">
            {t.faq.items.map((faq, i) => {
              const isOpen = faqOpen === i;
              return (
                <div key={i} className={`overflow-hidden rounded-xl border transition-colors duration-200 ${isOpen ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-white/6 bg-[#050505]"}`}>
                  <button className="flex w-full items-center justify-between px-6 py-4 text-left" onClick={() => handleFaqToggle(i)} aria-expanded={isOpen}>
                    <span className={`text-sm font-medium transition-colors duration-200 ${isOpen ? "text-white" : "text-zinc-300"}`}>{faq.question}</span>
                    <span className={`ml-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${isOpen ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rotate-45" : "border-white/10 bg-white/[0.03] text-zinc-600"}`}>
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M4.5 1.5v6M1.5 4.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                  <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: isOpen ? "300px" : "0px", opacity: isOpen ? 1 : 0 }}>
                    <p className="px-6 pb-5 text-sm text-zinc-500 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Deploy ─── */}
      <section id="deploy" className="px-6 py-28 bg-[#050505] relative overflow-hidden">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[500px] w-[500px] rounded-full bg-emerald-500/6 blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3.5 py-1.5 text-xs uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
            {t.deploy.badge}
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {t.deploy.title}
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {t.deploy.titleAccent}
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-zinc-400">{t.deploy.subtitle}</p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {DEPLOY_OPTIONS.map((opt) => (
              <a key={opt.name} href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${opt.color} ${opt.bg}`}>
                {t.cta.deployOn} {opt.name}
              </a>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-xl overflow-hidden rounded-2xl border border-white/8 bg-[#0a0a0a]">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 bg-[#0c0c0c]">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
              <span className="ml-2 text-[10px] font-mono text-zinc-700">bash</span>
            </div>
            <div className="p-5 text-left space-y-1.5 font-mono text-sm">
              <div><span className="text-emerald-400">$</span><span className="text-zinc-300"> git clone https://github.com/naimkatiman/tradeclaw.git</span></div>
              <div><span className="text-emerald-400">$</span><span className="text-zinc-300"> cd tradeclaw</span></div>
              <div><span className="text-emerald-400">$</span><span className="text-zinc-300"> cp .env.example .env</span></div>
              <div><span className="text-emerald-400">$</span><span className="text-zinc-300"> docker compose up -d</span></div>
              <div className="pt-1"><span className="text-zinc-700"># Dashboard ready at localhost:3000</span></div>
            </div>
          </div>

          <p className="mt-5 text-xs text-zinc-700">{t.deploy.requirement}</p>
        </div>
      </section>
    </>
  );
}
