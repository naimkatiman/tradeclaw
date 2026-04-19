import Link from 'next/link';
import { Navbar } from '../components/navbar';
import { SiteFooter } from '../../components/landing/site-footer';
import { TIER_DEFINITIONS, type TierDefinition } from '../../lib/stripe';

interface Feature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}

const FEATURES: Feature[] = [
  { label: 'Signal delivery', free: '15-min delay', pro: 'Real-time' },
  { label: 'Symbols covered', free: '3 symbols', pro: 'All traded symbols' },
  { label: 'Telegram group', free: '@tradeclawwin (public)', pro: 'Private Pro group' },
  { label: 'TP / SL levels', free: 'TP1 only', pro: 'TP1, TP2, TP3 + SL' },
  { label: 'Indicators', free: 'RSI, EMA', pro: 'Full suite + MTF confluence' },
  { label: 'Signal quality', free: 'Standard', pro: 'Premium high-confidence' },
  { label: 'Signal history', free: 'Last 24h', pro: 'Full history + CSV export' },
  { label: 'Support', free: 'Community', pro: 'Email (24h)' },
  { label: 'Free trial', free: false, pro: '7 days' },
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
      className="inline-block text-[var(--text-secondary)]"
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
  return <span className="text-sm text-[var(--foreground)]">{val}</span>;
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
          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.08)]'
          : 'border-[var(--border)] bg-[var(--glass-bg)]'
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
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          {name}
        </p>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-4xl font-bold text-[var(--foreground)]">{price}</span>
          {price !== 'Free' && (
            <span className="mb-1 text-sm text-[var(--text-secondary)]">/mo</span>
          )}
        </div>
        {annual && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{annual}</p>
        )}
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{description}</p>
      </div>

      <ul className="mb-6 flex flex-col gap-2">
        {highlights.map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
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
              : 'border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--glass-border-accent)] hover:bg-[var(--glass-bg)]'
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

function tierToCard(def: TierDefinition): PlanCardProps {
  const priceId = def.id === 'pro'
    ? (process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? '')
    : '';

  let ctaLabel = 'Start Free';
  let ctaHref = '/dashboard';

  if (def.kind === 'stripe') {
    ctaLabel = 'Start 7-Day Trial';
    ctaHref = priceId ? `/signin?priceId=${priceId}` : '/signin';
  }

  return {
    name: def.name,
    price: def.monthlyPriceLabel,
    annual: def.annualPriceLabel,
    description: def.tagline,
    highlights: def.features,
    ctaLabel,
    ctaHref,
    priceId,
    badge: def.id === 'pro' ? 'Most Popular' : undefined,
    accent: def.id === 'pro',
  };
}

export default function PricingPage() {
  const plans: PlanCardProps[] = TIER_DEFINITIONS.map(tierToCard);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--background)] pt-28 pb-24 px-4">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Pricing
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Stop renting your edge.
          </h1>
          <p className="mt-4 text-lg text-[var(--text-secondary)]">
            Start free. Upgrade when you&apos;re ready for real-time signals,
            private groups, and full analytics.
          </p>
        </div>

        {/* Plan cards */}
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard key={plan.name} {...plan} />
          ))}
        </div>

        {/* Annual callout */}
        <div className="mx-auto mt-6 max-w-3xl">
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Save 17% with annual billing &mdash; switch anytime from your
            billing dashboard.
          </p>
        </div>

        {/* Full comparison table */}
        <div className="mx-auto mt-20 max-w-3xl">
          <h2 className="mb-6 text-xl font-semibold text-[var(--foreground)]">
            Full feature comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--glass-bg)]">
                  <th className="py-3 pl-6 pr-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    Free
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-emerald-400">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, i) => (
                  <tr
                    key={feature.label}
                    className={`border-b border-[var(--border)] ${
                      i % 2 === 0 ? '' : 'bg-[var(--glass-bg)]'
                    }`}
                  >
                    <td className="py-3 pl-6 pr-4 font-medium text-[var(--foreground)]">
                      {feature.label}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {renderValue(feature.free)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {renderValue(feature.pro)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
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
                a: 'After upgrading, visit your dashboard and click "Connect Telegram". You\'ll get a deep link to our bot which links your account and sends your group invite.',
              },
              {
                q: 'Is the code really open source?',
                a: 'Yes. TradeClaw is MIT-licensed on GitHub. You can self-host the entire framework. Pro is the hosted tier with real-time delivery, premium signals, and private Telegram access.',
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-5"
              >
                <p className="font-medium text-[var(--foreground)]">{q}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto mt-20 max-w-xl text-center">
          <p className="text-[var(--text-secondary)]">
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
      <SiteFooter />
    </>
  );
}
