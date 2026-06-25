import Link from 'next/link';
import { SampleTelegramCard } from './sample-telegram-card';

export function TelegramHero() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#229ED9]/25 bg-[#229ED9]/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-[#229ED9]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Telegram-first delivery
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Signals land in your Telegram
            <br />
            <span className="text-emerald-400">while the entry is still live.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--text-secondary)] sm:text-lg">
            Pro signals hit your phone the moment confluence fires — no dashboard refresh, no email
            lag. The web dashboard is a courtesy. Telegram is how Pro traders actually work the
            signals.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
          <SampleTelegramCard
            tier="free"
            symbol="BTC/USD"
            direction="BUY"
            entry={62410}
            tp1={62980}
            timestampLabel="14:02 UTC"
            delayLabel="Public channel — 30 min behind"
          />
          <SampleTelegramCard
            tier="pro"
            symbol="BTC/USD"
            direction="BUY"
            entry={62410}
            tp1={62980}
            tp2={63420}
            tp3={64100}
            sl={61950}
            timestampLabel="13:47 UTC"
          />
        </div>

        <ul className="mx-auto mt-10 grid max-w-3xl gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-3">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span>
              <span className="font-semibold text-[var(--foreground)]">Private Pro group</span> —
              invite arrives at checkout, auto-kick at tier expiry
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span>
              <span className="font-semibold text-[var(--foreground)]">Full exit plan</span> —
              TP1 / TP2 / TP3 + SL in the alert, no extra clicks
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span>
              <span className="font-semibold text-[var(--foreground)]">No delay</span> — Pro
              signals fire the same second the confluence resolves
            </span>
          </li>
        </ul>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/pricing"
            className="group flex items-center gap-2.5 rounded-full bg-emerald-500 px-7 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
          >
            Start 7-day Pro trial
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
              <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <a
            href="https://t.me/tradeclawwin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-[#229ED9]/25 bg-[#229ED9]/10 px-7 py-3 text-sm font-medium text-[#229ED9] transition-all duration-200 hover:bg-[#229ED9]/20"
          >
            Preview the public channel
          </a>
        </div>
        <p className="mt-3 text-center text-[11px] text-[var(--text-secondary)]">
          Card required. Cancel anytime before day 8 — no charge.
        </p>
      </div>
    </section>
  );
}
