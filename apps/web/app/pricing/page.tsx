import Link from 'next/link';
import { Navbar } from '../components/navbar';
import { PricingCards } from './PricingCards';
import { FREE_SYMBOLS } from '../../lib/tier-client';
import { TIER_HISTORY_DAYS } from '../../lib/tier';
import { getPricingStats } from '../../lib/pricing-stats';

export const revalidate = 600;

interface Feature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  elite: string | boolean;
}

const FREE_HISTORY_LABEL = TIER_HISTORY_DAYS.free
  ? `Last ${TIER_HISTORY_DAYS.free} days`
  : 'Full history';

const FEATURES: Feature[] = [
  { label: 'Signal delivery', free: 'Delayed 30 min — moves often played out by then', pro: 'Instant — alert fires while the move is still live', elite: 'Priority instant — alerts reach you before Pro users' },
  {
    label: 'Symbols covered',
    free: `${FREE_SYMBOLS.length} pairs across crypto, FX, gold, indices`,
    pro: 'The whole market you actually watch — FX, crypto, metals, oil, US mega-caps, indices',
    elite: 'Same full market coverage as Pro',
  },
  { label: 'Telegram group', free: 'Public @tradeclawwin', pro: 'Private Pro group — same live signals, no scroll lag', elite: 'Private 1-on-1 group with Zaky for setup and review' },
  { label: 'Risk levels', free: 'TP1 only', pro: 'TP1, TP2, TP3 + Stop Loss — exit plan before you enter', elite: 'Same full risk plan as Pro' },
  { label: 'Entry signal', free: 'Basic (RSI, EMA)', pro: 'Confluence-gated entries — multiple indicators must align across H1/H4/D1', elite: 'Same confluence-gated entries as Pro' },
  { label: 'Track record', free: 'Audit our public Postgres yourself', pro: 'Every entry, exit, and outcome is recorded in our public Postgres archive', elite: 'Same public audit trail as Pro' },
  { label: 'Signal history', free: FREE_HISTORY_LABEL, pro: 'Unlimited real outcomes for backtests, audits, and strategy checks', elite: 'Same unlimited history as Pro' },
  { label: 'Strategy builder', free: false, pro: false, elite: 'Compose and backtest custom indicator rules' },
  { label: 'Webhook forwarding', free: false, pro: false, elite: 'Pipe signals to your own broker or bot' },
  { label: 'Support', free: 'Community', pro: 'Email (24h response)', elite: 'Priority email (same-day response)' },
  { label: 'Free trial', free: false, pro: '7 days, no charge if you cancel', elite: '7 days, no charge if you cancel' },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline-block text-emerald-400" aria-hidden="true">
      <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="inline-block text-[var(--text-secondary)]" aria-hidden="true">
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function renderValue(val: string | boolean) {
  if (val === false) return <XIcon />;
  if (val === true) return <CheckIcon />;
  return <span className="text-sm text-[var(--foreground)]">{val}</span>;
}

export default async function PricingPage() {
  const stats = await getPricingStats();
  const hasNumbers = stats.closedSignalsAllTime > 0 && stats.winRatePct !== null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--background)] pt-28 pb-24 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Pricing</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Stop renting your edge.
          </h1>
          <p className="mt-4 text-lg text-[var(--text-secondary)]">
            Start free. Upgrade when you&apos;re ready for instant signal delivery, private groups, and full analytics.
          </p>
        </div>

        {hasNumbers && (
          <div className="mx-auto mt-10 max-w-3xl">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] px-6 py-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
                    {stats.winRatePct?.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                    Win rate
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
                    {stats.closedSignalsAllTime.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                    Resolved signals
                  </div>
                </div>
                <div>
                  <div className={`text-2xl font-bold sm:text-3xl ${stats.cumulativePnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stats.cumulativePnlPct >= 0 ? '+' : ''}
                    {stats.cumulativePnlPct.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                    Cumulative PnL
                  </div>
                </div>
              </div>
              {stats.payoffRatio != null && stats.breakEvenWinRatePct != null && (
                <p className="mt-4 text-center text-xs text-[var(--text-secondary)]">
                  Wins average {stats.payoffRatio.toFixed(1)}x the size of losses — break-even
                  win rate at this risk/reward is {stats.breakEvenWinRatePct.toFixed(1)}%.
                </p>
              )}
              <p className="mt-2 text-center text-xs text-[var(--text-secondary)]">
                All-time, every resolved signal. Recorded live in our public Postgres.{' '}
                <Link href="/track-record" className="text-emerald-400 hover:underline">
                  Verify the full archive →
                </Link>
              </p>
            </div>
          </div>
        )}

        <div className="mt-12">
          <PricingCards />
        </div>

        <div className="mx-auto mt-20 max-w-3xl">
          <h2 className="mb-6 text-xl font-semibold text-[var(--foreground)]">Full feature comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--glass-bg)]">
                  <th className="py-3 pl-6 pr-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Feature</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Free</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-emerald-400">Pro</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-purple-400">Elite</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, i) => (
                  <tr key={feature.label} className={`border-b border-[var(--border)] ${i % 2 === 0 ? '' : 'bg-[var(--glass-bg)]'}`}>
                    <td className="py-3 pl-6 pr-4 font-medium text-[var(--foreground)]">{feature.label}</td>
                    <td className="px-4 py-3 text-center">{renderValue(feature.free)}</td>
                    <td className="px-4 py-3 text-center">{renderValue(feature.pro)}</td>
                    <td className="px-4 py-3 text-center">{renderValue(feature.elite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-2xl">
          <h2 className="mb-6 text-xl font-semibold text-[var(--foreground)]">FAQ</h2>
          <div className="flex flex-col gap-4">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. Cancel from your billing dashboard and your access continues until the end of the billing period. No questions asked.',
              },
              {
                q: 'What happens after the free trial?',
                a: "You'll be charged automatically after 7 days. Cancel before the trial ends and you won't be charged.",
              },
              {
                q: 'How do I connect my Telegram?',
                a: 'Right after checkout, our Welcome screen gives you a one-tap deep link to our bot, which links your account and sends your group invite.',
              },
              {
                q: 'Is the code really open source?',
                a: 'Yes. TradeClaw is MIT-licensed on GitHub. You can self-host the entire framework. Pro is the hosted tier with instant (no-delay) signal delivery, premium signals, and private Telegram access. See /data-freshness for exact cadences.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-5">
                <p className="font-medium text-[var(--foreground)]">{q}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-xl text-center">
          <p className="text-[var(--text-secondary)]">
            Questions?{' '}
            <a href="https://t.me/tradeclawwin" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">
              Join our public Telegram
            </a>{' '}
            or{' '}
            <a href="mailto:support@tradeclaw.win" className="text-emerald-400 hover:underline">
              email support
            </a>
            .
          </p>
        </div>
      </main>
    </>
  );
}
