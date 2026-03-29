"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "Is it really free?",
    answer:
      "Yes, completely. TradeClaw is MIT-licensed open-source software. You pay nothing to use it — not now, not ever. You only pay for your own server hosting (Railway free tier, Fly.io, VPS, etc.), which typically costs $0–5/month.",
  },
  {
    question: "How do AI signals work?",
    answer:
      "TradeClaw's signal engine combines multiple technical indicators (RSI, MACD, Bollinger Bands, EMA, ATR) with multi-timeframe confluence analysis. Signals are classified as BUY/SELL with a confidence score (0–100%) derived from the weighted agreement across timeframes (M5 to D1). No external AI API is required.",
  },
  {
    question: "Can I use it for live trading?",
    answer:
      "TradeClaw generates signals and provides TP/SL levels, but does not execute trades automatically. You connect your broker via MetaApi to receive price data, and you decide whether to act on signals. Paper trading mode is available so you can test performance before going live.",
  },
  {
    question: "How do I deploy it?",
    answer:
      "Clone the repo, copy .env.example to .env, set your MetaApi credentials (optional for paper trading), then run `docker compose up -d`. Your dashboard is ready at localhost:3000. For cloud deploy, use the one-click Railway or Vercel buttons in the repo README.",
  },
  {
    question: "What about Alpha Screener?",
    answer:
      "Alpha Screener is the hosted SaaS version of TradeClaw — same codebase, zero setup required. It's ideal if you want signals immediately without managing your own server. TradeClaw is the self-hosted open-source edition you can customize and run on your own infrastructure.",
  },
];

export function FAQAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
<<<<<<< HEAD
    <section className="px-6 py-24 bg-[#0a0a0a]">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1.5 text-xs uppercase tracking-widest text-zinc-500">
            FAQ
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
=======
    <section className="px-6 py-24 bg-[var(--bg-card)]">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass-bg)] px-3.5 py-1.5 text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            FAQ
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--foreground)]">
>>>>>>> origin/main
            Frequently asked{" "}
            <span className="text-emerald-400">questions</span>
          </h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className={`overflow-hidden rounded-xl border transition-colors duration-200 ${
                  isOpen
                    ? "border-emerald-500/20 bg-emerald-500/[0.03]"
<<<<<<< HEAD
                    : "border-white/6 bg-[#050505]"
=======
                    : "border-[var(--border)] bg-[var(--background)]"
>>>>>>> origin/main
                }`}
              >
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-sm font-medium transition-colors duration-200 ${
<<<<<<< HEAD
                      isOpen ? "text-white" : "text-zinc-300"
=======
                      isOpen ? "text-[var(--foreground)]" : "text-[var(--text-secondary)]"
>>>>>>> origin/main
                    }`}
                  >
                    {faq.question}
                  </span>
                  <span
                    className={`ml-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                      isOpen
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rotate-45"
<<<<<<< HEAD
                        : "border-white/10 bg-white/[0.03] text-zinc-600"
=======
                        : "border-[var(--border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]"
>>>>>>> origin/main
                    }`}
                  >
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path
                        d="M4.5 1.5v6M1.5 4.5h6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </button>

                <div
                  className="faq-content overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: isOpen ? "300px" : "0px",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
<<<<<<< HEAD
                  <p className="px-6 pb-5 text-sm text-zinc-500 leading-relaxed">
=======
                  <p className="px-6 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed">
>>>>>>> origin/main
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
