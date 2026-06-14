'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TIER_DEFINITIONS,
  type TierDefinition,
} from '../../lib/stripe-tiers';
import { EliteInterestForm } from '../../components/EliteInterestForm';
import { trackEvent } from '../../lib/analytics';

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
    trackEvent('subscription_clicked', { tier: 'pro', interval });
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier: 'pro', interval }),
      });
      if (res.status === 401) {
        // Encode the resume hint into `next` so post-signin lands on
        // /pricing?resume=checkout&interval=… and the page auto-fires the
        // POST. Without this, the user has to click "Start Trial" a second
        // time after signing in — measurable friction at the conversion step.
        const next = encodeURIComponent(`/pricing?resume=checkout&interval=${interval}`);
        setLoading(false);
        window.location.href = `/signin?next=${next}`;
        return;
      }
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Checkout failed');
      }
      const payload = (await res.json()) as { url?: string };
      if (!payload.url) throw new Error('Missing checkout URL');
      trackEvent('checkout_started', { tier: 'pro', interval });
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
        {def.anchorLabel && (
          <p
            data-testid="pro-anchor"
            className="mt-2 text-xs text-[var(--text-secondary)]"
          >
            <span className="line-through opacity-70">{def.anchorLabel}</span>
          </p>
        )}
        <div className="mt-1 flex items-end gap-1">
          <span
            data-testid="pro-price-label"
            className="text-4xl font-bold text-[var(--foreground)]"
          >
            {priceMain}
          </span>
          <span className="mb-1 text-sm text-[var(--text-secondary)]">{priceSuffix}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{priceLabel}</p>
        {def.perDayLabel && (
          <p
            data-testid="pro-per-day"
            className="mt-1 text-xs font-medium text-emerald-400"
          >
            That&apos;s {def.perDayLabel}
          </p>
        )}
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
        <p className="mt-2 text-center text-[11px] leading-relaxed text-[var(--text-secondary)]">
          Card required.{' '}
          {interval === 'annual' ? '$290 charged' : '$29 charged'} on day 8.{' '}
          Cancel anytime before then — no charge.
        </p>
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
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // Post-signin resume: when a logged-out user clicks "Start Trial",
  // we redirect them to /signin?next=/pricing?resume=checkout&interval=…
  // After signin lands them back here we re-fire the checkout POST so the
  // user doesn't have to click the button a second time.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('resume') !== 'checkout') return;

    const intervalParam = params.get('interval');
    const tierParam = params.get('tier');
    const requestedInterval: Interval =
      intervalParam === 'annual' ? 'annual' : 'monthly';
    const requestedTier = tierParam === 'elite' ? 'elite' : 'pro';
    setBillingInterval(requestedInterval);

    // Strip resume params so a refresh doesn't double-fire and the URL is
    // clean once the dust settles.
    params.delete('resume');
    params.delete('interval');
    params.delete('tier');
    const qs = params.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (qs ? `?${qs}` : ''),
    );

    setResuming(true);
    void (async () => {
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tier: requestedTier, interval: requestedInterval }),
        });
        if (res.status === 401) {
          // Still not signed in (cookie didn't make it). Leave the user on
          // /pricing — they can click the button manually.
          setResuming(false);
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
        setResuming(false);
        setResumeError(err instanceof Error ? err.message : 'Checkout failed');
      }
    })();
  }, []);

  const freeDef = TIER_DEFINITIONS.find((d) => d.id === 'free');
  const proDef = TIER_DEFINITIONS.find((d) => d.id === 'pro');
  const eliteDef = TIER_DEFINITIONS.find((d) => d.id === 'elite');
  if (!freeDef || !proDef || !eliteDef) return null;

  return (
    <>
      {resuming && (
        <div
          role="status"
          className="mx-auto mb-4 max-w-md rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-2 text-center text-sm text-emerald-200"
        >
          Resuming checkout… you&apos;ll be redirected to Stripe in a moment.
        </div>
      )}
      {resumeError && (
        <div
          role="alert"
          className="mx-auto mb-4 max-w-md rounded-lg border border-red-500/30 bg-red-500/[0.08] px-4 py-2 text-center text-sm text-red-300"
        >
          {resumeError}
        </div>
      )}
      <div className="text-center">
        <IntervalToggle value={billingInterval} onChange={setBillingInterval} />
      </div>
      <div className="mx-auto mt-2 grid max-w-5xl gap-6 lg:grid-cols-3">
        <FreeCard def={freeDef} />
        <ProCard def={proDef} interval={billingInterval} />
        <EliteCard def={eliteDef} interval={billingInterval} />
      </div>
    </>
  );
}

interface EliteCardProps {
  def: TierDefinition;
  interval: Interval;
}

function EliteCard({ def, interval }: EliteCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceLabel = interval === 'annual' ? def.annualPriceLabel : def.monthlyPriceLabel;
  const priceMain = interval === 'annual' ? '$990' : '$99';
  const priceSuffix = interval === 'annual' ? '/yr' : '/mo';
  const subtext = interval === 'annual' ? 'Save $198 vs monthly' : 'Billed monthly, cancel anytime';
  // Self-serve Elite checkout needs Stripe Elite price IDs. When they are not
  // configured (the default self-host case — see .env.example), fall back to the
  // interest form rather than POSTing a tier the checkout API returns 503 on.
  const eliteCheckoutEnabled = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID &&
      process.env.NEXT_PUBLIC_STRIPE_ELITE_ANNUAL_PRICE_ID,
  );

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    trackEvent('subscription_clicked', { tier: 'elite', interval });
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier: 'elite', interval }),
      });
      if (res.status === 401) {
        const next = encodeURIComponent(`/pricing?resume=checkout&interval=${interval}&tier=elite`);
        setLoading(false);
        window.location.href = `/signin?next=${next}`;
        return;
      }
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Checkout failed');
      }
      const payload = (await res.json()) as { url?: string };
      if (!payload.url) throw new Error('Missing checkout URL');
      trackEvent('checkout_started', { tier: 'elite', interval });
      window.location.href = payload.url;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Checkout failed');
    }
  }

  return (
    <div
      data-testid="elite-card"
      className="relative flex flex-col rounded-2xl border border-purple-500/40 bg-purple-500/5 p-6 shadow-[0_0_40px_rgba(168,85,247,0.08)]"
    >
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="rounded-full bg-purple-500 px-3 py-0.5 text-xs font-semibold text-black">
          For Power Users
        </span>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          {def.name}
        </p>
        {def.anchorLabel && (
          <p
            data-testid="elite-anchor"
            className="mt-2 text-xs text-[var(--text-secondary)]"
          >
            <span className="line-through opacity-70">{def.anchorLabel}</span>
          </p>
        )}
        <div className="mt-1 flex items-end gap-1">
          <span
            data-testid="elite-price-label"
            className="text-4xl font-bold text-[var(--foreground)]"
          >
            {priceMain}
          </span>
          <span className="mb-1 text-sm text-[var(--text-secondary)]">{priceSuffix}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{priceLabel}</p>
        {def.perDayLabel && (
          <p
            data-testid="elite-per-day"
            className="mt-1 text-xs font-medium text-purple-400"
          >
            That&apos;s {def.perDayLabel}
          </p>
        )}
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{def.tagline}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtext}</p>
      </div>

      <ul className="mb-6 flex flex-col gap-2">
        {def.features.map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
            <span className="mt-0.5 shrink-0 text-purple-400">
              <CheckIcon />
            </span>
            {h}
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        {eliteCheckoutEnabled ? (
          <>
            <button
              type="button"
              data-testid="elite-cta"
              onClick={handleCheckout}
              disabled={loading}
              className="block w-full rounded-lg bg-purple-500 py-2.5 text-center text-sm font-semibold text-white transition-all hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Redirecting…' : 'Start Elite Trial'}
            </button>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-[var(--text-secondary)]">
              Card required. {priceMain} charged on day 8.{' '}
              Cancel anytime before then — no charge.
            </p>
            {error && (
              <p role="alert" className="mt-2 text-center text-xs text-red-400">
                {error}
              </p>
            )}
          </>
        ) : (
          <EliteInterestForm source="pricing-elite" />
        )}
      </div>
    </div>
  );
}
