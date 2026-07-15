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
      "TradeClaw's public hosted archive currently has no TradeClaw paywall, and the self-hosted code is MIT-licensed. Third-party hosting, market-data, broker, and notification services may charge their own fees. See /data-freshness for source-specific refresh cadences.",
  },
  {
    question: "How do the signals work?",
    answer:
      "TradeClaw's open rule-based engine combines technical indicators such as RSI, MACD, Bollinger Bands, EMA, and ATR with multi-timeframe confluence. BUY/SELL labels and confidence values describe weighted indicator agreement, not a probability of profit. No external AI API is required.",
  },
  {
    question: "Can I use it for live trading?",
    answer:
      "Automated execution is disabled by default. When an operator explicitly enables it, only gate-approved crypto signals can reach the implemented Binance USDT-perpetual executor, which uses testnet by default. The RoboForex R StocksTrader execution bridge is still an interface scaffold, so forex, metals, and equities remain signal-only. MetaApi is used by a separate account/position viewer; it is not the signal data source or an implemented execution route. Paper-trading results are simulated, not broker fills.",
  },
  {
    question: "How do I deploy it?",
    answer:
      "Clone the repo, copy .env.example to .env, set DB_PASSWORD, USER_SESSION_SECRET, and AUTH_SECRET, then run `docker compose up -d`. The default stack maps documented .env variables through an explicit allowlist and starts the app, PostgreSQL, Redis, and migrations; startup time depends on image pulls and the host. MetaApi is not required. NEXT_PUBLIC_* values are compiled into the client bundle, so changing them requires matching image build arguments and a rebuild.",
  },
  {
    question: "Is anything paywalled?",
    answer:
      "The public hosted archive is currently available without a TradeClaw paywall, and the codebase is MIT-licensed. Third-party hosting, data providers, brokers, and notification services may charge their own fees. The repository still contains optional or legacy integration code; its presence is not a promise that a paid hosted feature is available. Published outcomes are OHLCV-resolved signal studies, not broker fills or customer portfolio returns.",
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
                    maxHeight: isOpen ? "600px" : "0px",
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
