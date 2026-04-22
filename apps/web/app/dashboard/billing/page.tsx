'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUserSession } from '../../../lib/hooks/use-user-tier';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tier = 'free' | 'pro';
type Interval = 'monthly' | 'annual';

interface PlanInfo {
  name: string;
  price: string;
  description: string;
  color: string;
  priceId: string;
}

const PRO_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? '';
const PRO_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ?? '';

function proPlan(interval: Interval): PlanInfo {
  if (interval === 'annual') {
    return {
      name: 'Pro (Annual)',
      price: '$290/yr',
      description: 'Real-time signals, all symbols, private Pro Telegram group. Save $58 vs monthly.',
      color: 'text-emerald-400',
      priceId: PRO_ANNUAL_PRICE_ID,
    };
  }
  return {
    name: 'Pro',
    price: '$29/mo',
    description: 'Real-time signals, all symbols, private Pro Telegram group.',
    color: 'text-emerald-400',
    priceId: PRO_MONTHLY_PRICE_ID,
  };
}

const FREE_PLAN: PlanInfo = {
  name: 'Free',
  price: '$0/mo',
  description: 'Delayed signals, 3 symbols, public Telegram channel.',
  color: 'text-zinc-400',
  priceId: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createCheckoutSession(priceId: string, userId: string): Promise<string> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, userId }),
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to create checkout session');
  return data.url;
}

async function createPortalSession(userId: string): Promise<string> {
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to create portal session');
  return data.url;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ tier }: { tier: Tier }) {
  const colors: Record<Tier, string> = {
    free: 'bg-zinc-800 text-zinc-300',
    pro: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[tier]}`}>
      {tier.toUpperCase()}
    </span>
  );
}

interface UpgradeCardProps {
  tier: Exclude<Tier, 'free'>;
  interval: Interval;
  currentTier: Tier;
  userId: string;
  onError: (msg: string) => void;
}

function UpgradeCard({ tier, interval, currentTier, userId, onError }: UpgradeCardProps) {
  const [loading, setLoading] = useState(false);
  const plan = proPlan(interval);
  const isCurrentPlan = currentTier === tier;
  const isDowngrade = false;

  async function handleClick() {
    setLoading(true);
    try {
      if (currentTier !== 'free') {
        // Existing subscriber → Stripe Portal to switch interval
        const url = await createPortalSession(userId);
        window.location.href = url;
        return;
      }
      if (!plan.priceId) {
        onError(
          interval === 'annual'
            ? 'Annual billing is temporarily unavailable. Email support@tradeclaw.win to switch.'
            : 'Checkout is temporarily unavailable. Email support@tradeclaw.win.',
        );
        return;
      }
      const url = await createCheckoutSession(plan.priceId, userId);
      window.location.href = url;
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-5 ${
        isCurrentPlan
          ? 'border-emerald-500/30 bg-emerald-950/10'
          : 'border-white/[0.06] bg-white/[0.02]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`font-semibold ${plan.color}`}>{plan.name}</p>
          <p className="mt-0.5 text-sm text-zinc-400">{plan.description}</p>
        </div>
        <p className="shrink-0 font-semibold text-white">{plan.price}</p>
      </div>

      <div className="mt-4">
        {isCurrentPlan ? (
          <span className="text-sm text-emerald-400">Current plan</span>
        ) : (
          <button
            onClick={handleClick}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60 ${
              isDowngrade
                ? 'border border-white/10 text-zinc-300 hover:bg-white/5'
                : 'bg-emerald-500 text-black hover:bg-emerald-400'
            }`}
          >
            {loading
              ? 'Redirecting…'
              : isDowngrade
              ? 'Downgrade via Portal'
              : `Upgrade to ${plan.name}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BillingPage() {
  const { status, session } = useUserSession();
  const userId = session?.userId ?? '';
  // Narrow the server tier ('free'|'pro'|'elite'|'custom') to what this page
  // actually renders. Billing is Free/Pro only today; elite/custom are
  // historical grants that still render as "Pro" on the current-plan card.
  const currentTier: Tier = session?.tier === 'pro' ? 'pro' : 'free';
  const [billingInterval, setBillingInterval] = useState<Interval>('monthly');

  const plan = currentTier === 'free' ? FREE_PLAN : proPlan('monthly');
  const [error, setError] = useState<string | null>(null);
  const isLoading = status === 'loading';
  const isDemo = status === 'anonymous';
  const [portalLoading, setPortalLoading] = useState(false);

  async function openPortal() {
    if (!userId) {
      setError('Please sign in to manage your billing.');
      return;
    }
    setPortalLoading(true);
    try {
      const url = await createPortalSession(userId);
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Back */}
        <Link
          href="/dashboard"
          className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12L6 8l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Dashboard
        </Link>

        {isLoading && (
          <div className="mb-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-zinc-500">
            Loading your subscription…
          </div>
        )}
        {isDemo && (
          <div className="mb-4 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
            <strong>Not signed in</strong> —{' '}
            <Link href="/signin?next=/dashboard/billing" className="underline hover:text-emerald-400">
              Sign in
            </Link>{' '}
            to view your subscription and manage billing.
          </div>
        )}

        <h1 className="text-2xl font-bold text-white">Billing &amp; Subscription</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your TradeClaw subscription and payment details.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-300 hover:text-red-200 underline text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Current plan */}
        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Current Plan
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-xl font-bold text-white">{plan.name}</p>
                <StatusBadge tier={currentTier} />
              </div>
              <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>
            </div>
            <p className="shrink-0 text-2xl font-bold text-white">{plan.price}</p>
          </div>

          {currentTier !== 'free' && (
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <p className="text-xs text-zinc-500">
                Manage invoices, update payment method, or cancel via the Stripe
                customer portal.
              </p>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="mt-3 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/5 disabled:opacity-60"
              >
                {portalLoading ? 'Opening portal…' : 'Manage Billing'}
              </button>
            </div>
          )}
        </div>

        {/* Upgrade / switch plans */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              {currentTier === 'free' ? 'Upgrade your plan' : 'Change plan'}
            </h2>
            {currentTier === 'free' && (
              <div
                role="group"
                aria-label="Billing interval"
                className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-xs"
              >
                <button
                  type="button"
                  aria-pressed={billingInterval === 'monthly'}
                  onClick={() => setBillingInterval('monthly')}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    billingInterval === 'monthly'
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  aria-pressed={billingInterval === 'annual'}
                  onClick={() => setBillingInterval('annual')}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    billingInterval === 'annual'
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Annual <span className="ml-1 text-emerald-400">save 17%</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <UpgradeCard
              tier="pro"
              interval={billingInterval}
              currentTier={currentTier}
              userId={userId}
              onError={setError}
            />
          </div>
        </div>

        {/* Telegram connect */}
        <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-start gap-3">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="mt-0.5 shrink-0 text-sky-400"
            >
              <path
                d="M17.5 3L2.5 8.5l5 2 2 5 8-12.5z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path
                d="M7.5 10.5l2.5 2.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <div>
              <p className="font-semibold text-white">Connect Telegram</p>
              <p className="mt-1 text-sm text-zinc-400">
                Link your Telegram account to receive signals in your private group.
              </p>
              <a
                href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'tradeclawbot'}?start=${userId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-400 transition-all hover:bg-sky-500/30 border border-sky-500/30"
              >
                Open Telegram Bot
              </a>
            </div>
          </div>
        </div>

        {/* Annual plan callout */}
        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-5 py-4">
          <p className="text-sm text-emerald-300">
            <span className="font-semibold">Save 17%</span> with annual billing — Pro
            at $290/yr. Switch from the billing portal.
          </p>
        </div>
      </div>
    </div>
  );
}
