import Link from 'next/link';
import { Navbar } from '../components/navbar';
import { Footer } from '../components/footer';

const FREE_SYMBOLS = ['XAUUSD', 'BTCUSD', 'EURUSD'];
const PRO_SYMBOLS = ['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD'];

interface Feature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  elite: string | boolean;
}

const FEATURES: Feature[] = [
  {
    label: 'Signal delivery',
    free: '15-min delay',
    pro: 'Real-time',
    elite: 'Real-time',
  },
  {
    label: 'Symbols covered',
    free: `${FREE_SYMBOLS.length} symbols`,
    pro: `${PRO_SYMBOLS.length} core symbols`,
    elite: 'All symbols',
  },
  {
    label: 'Telegram group',
    free: '@tradeclawwin (public)',
    pro: 'Private Pro group',
    elite: 'Private Elite group',
  },
  {
    label: 'TP / SL levels',
    free: 'TP1 only',
    pro: 'TP1, TP2, TP3 + SL',
    elite: 'TP1–3 + Trailing SL',
  },
  {
    label: 'Indicators',
    free: 'RSI, EMA',
    pro: 'RSI, MACD, EMA, BB, Stoch',
    elite: 'Full suite + MTF confluence',
  },
  {
    label: 'Signal history',
    free: 'Last 24h',
    pro: 'Last 30 days',
    elite: 'Full history + export',
  },
  {
    label: 'Dashboard',
    free: 'Basic (delayed)',
    pro: 'Full real-time',
    elite: 'Full + historical analytics',
  },
  {
    label: 'Performance stats',
    free: 'Monthly summary',
    pro: 'Weekly + monthly',
    elite: 'Real-time P&L tracker',
  },
  {
    label: 'API access',
    free: false,
    pro: false,
    elite: '100 req/min',
  },
  {
    label: 'CSV / JSON export',
    free: false,
    pro: false,
    elite: true,
  },
  {
    label: 'Support',
    free: 'Community',
    pro: 'Email (24h)',
    elite: 'Telegram direct (4h)',
  },
  {
    label: 'Free trial',
    free: false,
    pro: '7 days',
    elite: '7 days',
  },
];

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="inline-block text-emerald-400"
    >
      <path
        d="M3 8l3.5 3.5L13 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="inline-block text-zinc-600"
    >
      <path
        d="M3 3l8 8M11 3l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function renderValue(val: string | boolean) {
  if (val === false) return <XIcon />;
  if (val === true) return <CheckIcon />;
  return <span className="text-sm text-zinc-300">{val}</span>;
}

// ---------------------------------------------------------------------------
// Pricing card
// ---------------------------------------------------------------------------

interface PlanCardProps {
  name: string;
  price: string;
  annual: string;
  description: string;
  highlights: string[];
  ctaLabel: string;
  ctaHref: string;
  priceId: string;
  badge?: string;
  accent?: boolean;
}

function PlanCard({
  name,
  price,
  annual,
  description,
  highlights,
  ctaLabel,
  ctaHref,
  badge,
  accent,
}: PlanCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${
        accent
          ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_40px_rgba(16,185,129,0.08)]'
          : 'border-white/[0.06] bg-white/[0.03]'
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-black">
            {badge}
          </span>
        </div>
      )}

      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {name}
        </p>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-4xl font-bold text-white">{price}</span>
          {price !== 'Free' && (
            <span className="mb-1 text-sm text-zinc-400">/mo</span>
          )}
        </div>
        {annual && (
          <p className="mt-1 text-xs text-zinc-500">{annual}</p>
        )}
        <p className="mt-3 text-sm text-zinc-400">{description}</p>
      </div>

      <ul className="mb-6 flex flex-col gap-2">
        {highlights.map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm text-zinc-300">
            <span className="mt-0.5 shrink-0 text-emerald-400">
              <CheckIcon />
            </span>
            {h}
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Link
          href={ctaHref}
          className={`block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-all ${
            accent
              ? 'bg-emerald-500 text-black hover:bg-emerald-400'
              : 'border border-white/10 text-white hover:border-white/20 hover:bg-white/5'
          }`}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PricingPage() {
  const proMonthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? '';
  const eliteMonthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID ?? '';

  const plans: PlanCardProps[] = [
    {
      name: 'Free',
      price: 'Free',
      annual: '',
      description: 'Start learning and validating signals at no cost.',
      highlights: [
        '3 symbols: XAUUSD, BTCUSD, EURUSD',
        '15-minute delayed signals',
        'RSI + EMA indicators',
        'TP1 target only',
        'Public Telegram channel',
        'Last 24h signal history',
      ],
      ctaLabel: 'Start Free',
      ctaHref: '/dashboard',
      priceId: '',
    },
    {
      name: 'Pro',
      price: '$19',
      annual: '$190/yr — save $38',
      description: 'Real-time signals on all major forex, crypto, and metals pairs.',
      highlights: [
        '6 core symbols including Silver + ETH',
        'Real-time signal delivery',
        'Full indicator suite (RSI, MACD, BB, Stoch)',
        'TP1, TP2, TP3 + Stop Loss',
        'Private Pro Telegram group',
        '30-day signal history',
        'Email support (24h)',
        '7-day free trial',
      ],
      ctaLabel: 'Start 7-Day Trial',
      ctaHref: proMonthlyPriceId
        ? `/api/stripe/checkout?priceId=${proMonthlyPriceId}`
        : '/dashboard',
      priceId: proMonthlyPriceId,
      badge: 'Most Popular',
      accent: true,
    },
    {
      name: 'Elite',
      price: '$49',
      annual: '$490/yr — save $98',
      description: 'Maximum edge. Full data, API access, and direct support.',
      highlights: [
        'All symbols + early speculative setups',
        'Real-time + MTF confluence analysis',
        'Trailing SL + partial close levels',
        'Private Elite Telegram group',
        'REST API (100 req/min)',
        'CSV / JSON export',
        'Real-time P&L tracker',
        'Direct Telegram support (4h)',
        '7-day free trial',
      ],
      ctaLabel: 'Start 7-Day Trial',
      ctaHref: eliteMonthlyPriceId
        ? `/api/stripe/checkout?priceId=${eliteMonthlyPriceId}`
        : '/dashboard',
      priceId: eliteMonthlyPriceId,
    },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#050505] pt-28 pb-24 px-4">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Pricing
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Stop renting your edge.
          </h1>
          <p className="mt-4 text-lg text-zinc-400">
            Start free. Upgrade when you&apos;re ready for real-time signals,
            private groups, and full analytics.
          </p>
        </div>

        {/* Plan cards */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.name} {...plan} />
          ))}
        </div>

        {/* Annual callout */}
        <div className="mx-auto mt-6 max-w-5xl">
          <p className="text-center text-sm text-zinc-500">
            Save 17% with annual billing &mdash; switch anytime from your
            billing dashboard.
          </p>
        </div>

        {/* Full comparison table */}
        <div className="mx-auto mt-20 max-w-5xl">
          <h2 className="mb-6 text-xl font-semibold text-white">
            Full feature comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="py-3 pl-6 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Free
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-emerald-400">
                    Pro
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Elite
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, i) => (
                  <tr
                    key={feature.label}
                    className={`border-b border-white/[0.04] ${
                      i % 2 === 0 ? '' : 'bg-white/[0.01]'
                    }`}
                  >
                    <td className="py-3 pl-6 pr-4 font-medium text-zinc-300">
                      {feature.label}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {renderValue(feature.free)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {renderValue(feature.pro)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {renderValue(feature.elite)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-20 max-w-2xl">
          <h2 className="mb-6 text-xl font-semibold text-white">FAQ</h2>
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
                a: 'After upgrading, visit your dashboard and click "Connect Telegram". You\'ll get a deep link to our bot which links your account and sends your group invite.',
              },
              {
                q: 'Are the signals generated by AI?',
                a: 'Yes. TradeClaw runs a multi-timeframe technical analysis engine combining RSI, MACD, EMA, Bollinger Bands, and Stochastic oscillators to generate signals with a confidence score.',
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
              >
                <p className="font-medium text-white">{q}</p>
                <p className="mt-2 text-sm text-zinc-400">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto mt-20 max-w-xl text-center">
          <p className="text-zinc-400">
            Questions?{' '}
            <a
              href="https://t.me/tradeclawwin"
              className="text-emerald-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join our public Telegram
            </a>{' '}
            or{' '}
            <a
              href="mailto:support@tradeclaw.win"
              className="text-emerald-400 hover:underline"
            >
              email support
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
