"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "Is there a free tier?",
    answer:
      "Yes. The open-source framework is MIT-licensed and free forever — you can self-host the entire stack. On tradeclaw.win we also offer a Free hosted tier: 6 symbols across crypto, forex, commodities, and index ETFs; 15-minute delayed signals; public Telegram channel; 7 days of signal history. Pro ($29/mo, 7-day trial) upgrades that to real-time delivery, all traded symbols, private Pro Telegram group, full TP1/TP2/TP3 + SL levels, and unlimited signal history with CSV export.",
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
    question: "What's the difference between self-hosting and Pro?",
    answer:
      "Same signal engine, different delivery. Self-host the open-source repo for full control and zero recurring cost — you run the stack and wait 15 minutes on public signals. TradeClaw Pro at $29/mo gives you instant delivery, private Pro Telegram group, every traded symbol, and three take-profit levels plus stop-loss on each signal. Same math, faster execution.",
  },
];

export function FAQAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="px-6 py-24 bg-[var(--bg-card)]">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass-bg)] px-3.5 py-1.5 text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            FAQ
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--foreground)]">
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
                    : "border-[var(--border)] bg-[var(--background)]"
                }`}
              >
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-sm font-medium transition-colors duration-200 ${
                      isOpen ? "text-[var(--foreground)]" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {faq.question}
                  </span>
                  <span
                    className={`ml-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                      isOpen
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rotate-45"
                        : "border-[var(--border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]"
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
                  <p className="px-6 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed">
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
