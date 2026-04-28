'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TIER_DEFINITIONS,
  type TierDefinition,
} from '../../lib/stripe-tiers';

type Interval = 'monthly' | 'annual';

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="inline-block text-emerald-400"
      aria-hidden="true"
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

interface IntervalToggleProps {
  value: Interval;
  onChange: (next: Interval) => void;
}

function IntervalToggle({ value, onChange }: IntervalToggleProps) {
  return (
    <div
      role="group"
      aria-label="Billing interval"
      className="mx-auto mb-8 inline-flex rounded-full border border-[var(--border)] bg-[var(--glass-bg)] p-1"
    >
      <button
        type="button"
        aria-pressed={value === 'monthly'}
        onClick={() => onChange('monthly')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          value === 'monthly'
            ? 'bg-[var(--foreground)] text-[var(--background)]'
            : 'text-[var(--text-secondary)]'
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        aria-pressed={value === 'annual'}
        onClick={() => onChange('annual')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          value === 'annual'
            ? 'bg-[var(--foreground)] text-[var(--background)]'
            : 'text-[var(--text-secondary)]'
        }`}
      >
        Annual <span className="ml-1 text-xs text-emerald-400">— save 17%</span>
      </button>
    </div>
  );
}

interface ProCardProps {
  def: TierDefinition;
  interval: Interval;
}

function ProCard({ def, interval }: ProCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceLabel = interval === 'annual' ? def.annualPriceLabel : def.monthlyPriceLabel;
  const priceMain = interval === 'annual' ? '$290' : '$29';
  const priceSuffix = interval === 'annual' ? '/yr' : '/mo';
  const subtext = interval === 'annual' ? 'Save $58 vs monthly' : 'Billed monthly, cancel anytime';

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier: 'pro', interval }),
      });
      if (res.status === 401) {
        const next = encodeURIComponent('/pricing');
        setLoading(false);
        window.location.href = `/signin?next=${next}&tier=pro&interval=${interval}`;
        return;
      }
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Checkout failed');
      }
      const payload = (await res.json()) as { url?: string };
      if (!payload.url) throw new Error('Missing checkout URL');
      window.location.href = payload.url;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Checkout failed');
    }
  }

  return (
    <div
      data-testid="pro-card"
      className="relative flex flex-col rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)]"
    >
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-black">
          Most Popular
        </span>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          {def.name}
        </p>
        <div className="mt-2 flex items-end gap-1">
          <span
            data-testid="pro-price-label"
            className="text-4xl font-bold text-[var(--foreground)]"
          >
            {priceMain}
          </span>
          <span className="mb-1 text-sm text-[var(--text-secondary)]">{priceSuffix}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{priceLabel}</p>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{def.tagline}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtext}</p>
      </div>

      <ul className="mb-6 flex flex-col gap-2">
        {def.features.map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
            <span className="mt-0.5 shrink-0 text-emerald-400">
              <CheckIcon />
            </span>
            {h}
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <button
          type="button"
          data-testid="pro-cta"
          onClick={handleCheckout}
          disabled={loading}
          className="block w-full rounded-lg bg-emerald-500 py-2.5 text-center text-sm font-semibold text-black transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Redirecting…' : 'Start 7-Day Trial'}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-center text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

interface FreeCardProps {
  def: TierDefinition;
}

function FreeCard({ def }: FreeCardProps) {
  return (
    <div
      data-testid="free-card"
      className="relative flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-6"
    >
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          {def.name}
        </p>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-4xl font-bold text-[var(--foreground)]">Free</span>
        </div>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{def.tagline}</p>
      </div>

      <ul className="mb-6 flex flex-col gap-2">
        {def.features.map((h) => (
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
          href="/dashboard"
          className="block w-full rounded-lg border border-[var(--border)] py-2.5 text-center text-sm font-semibold text-[var(--foreground)] transition-all hover:border-[var(--glass-border-accent)] hover:bg-[var(--glass-bg)]"
        >
          Start Free
        </Link>
      </div>
    </div>
  );
}

export function PricingCards() {
  const [billingInterval, setBillingInterval] = useState<Interval>('monthly');
  const freeDef = TIER_DEFINITIONS.find((d) => d.id === 'free');
  const proDef = TIER_DEFINITIONS.find((d) => d.id === 'pro');
  if (!freeDef || !proDef) return null;

  return (
    <>
      <div className="text-center">
        <IntervalToggle value={billingInterval} onChange={setBillingInterval} />
      </div>
      <div className="mx-auto mt-2 grid max-w-3xl gap-6 sm:grid-cols-2">
        <FreeCard def={freeDef} />
        <ProCard def={proDef} interval={billingInterval} />
      </div>
    </>
  );
}
