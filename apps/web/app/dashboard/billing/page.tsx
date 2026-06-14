'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUserSession } from '../../../lib/hooks/use-user-tier';
import { TIER_DEFINITIONS } from '../../../lib/stripe-tiers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tier = 'free' | 'pro' | 'elite';
type Interval = 'monthly' | 'annual';

interface PlanInfo {
  name: string;
  price: string;
  description: string;
  color: string;
}

function getPlanInfo(tier: Tier, interval: Interval = 'monthly'): PlanInfo {
  const def = TIER_DEFINITIONS.find((d) => d.id === tier);
  if (tier === 'free') {
    return {
      name: 'Free',
      price: '$0/mo',
      description:
        def?.tagline ?? 'Delayed signals, 6 symbols across asset classes, public Telegram channel.',
      color: 'text-zinc-400',
    };
  }
  const priceDisplay =
    tier === 'pro'
      ? interval === 'annual'
        ? '$290/yr'
        : '$29/mo'
      : interval === 'annual'
        ? '$990/yr'
        : '$99/mo';
  return {
    name: def?.name ?? tier,
    price: priceDisplay,
    description:
      def?.tagline ?? '',
    color: tier === 'pro' ? 'text-emerald-400' : 'text-amber-400',
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createCheckoutSession(interval: Interval): Promise<string> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'pro', interval }),
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to create checkout session');
  return data.url;
}

async function createPortalSession(): Promise<string> {
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
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
    elite: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
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
  onError: (msg: string) => void;
}

function UpgradeCard({ tier, interval, currentTier, onError }: UpgradeCardProps) {
  const [loading, setLoading] = useState(false);
  const plan = getPlanInfo('pro', interval);
  const isCurrentPlan = currentTier === tier;
  const isDowngrade = false;

  async function handleClick() {
    setLoading(true);
    try {
      if (currentTier !== 'free') {
        // Existing subscriber → Stripe Portal to switch interval
        const url = await createPortalSession();
        window.location.href = url;
        return;
      }
      const url = await createCheckoutSession(interval);
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

function formatLongDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Premium Telegram Channel card
// ---------------------------------------------------------------------------

function PremiumChannelCard({ tier }: { tier: Exclude<Tier, 'free'> }) {
  const [invite, setInvite] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchInvite() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/telegram/channel-invite');
      const data = (await res.json()) as { invite?: string; error?: string };
      if (!res.ok || !data.invite) {
        setError(data.error ?? 'Could not load invite link.');
        return;
      }
      setInvite(data.invite);
      window.open(data.invite, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Could not load invite link.');
    } finally {
      setLoading(false);
    }
  }

  const label = tier === 'elite' ? 'Elite' : 'Pro';
  const color = tier === 'elite' ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-start gap-3">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className={`mt-0.5 shrink-0 ${color}`}
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
        <div className="w-full">
          <p className="font-semibold text-white">Join the {label} Telegram channel</p>
          <p className="mt-1 text-sm text-zinc-400">
            Get real-time high-confidence signals, priority alerts, and strategy
            commentary posted directly to the private {label} channel.
          </p>

          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={fetchInvite}
              disabled={loading}
              className={`inline-block rounded-lg px-4 py-2 text-sm font-semibold transition-all border disabled:opacity-50 ${
                tier === 'elite'
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30'
              }`}
            >
              {loading ? 'Fetching link…' : `Open ${label} channel`}
            </button>
            {invite && (
              <span className="text-xs text-zinc-500">Link loaded — check your new tab.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Referral card
// ---------------------------------------------------------------------------

function ReferralCard({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);
  const link = `https://tradeclaw.win/pricing?ref=${referralCode}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback not needed — modern browsers support clipboard API
    }
  }

  const shareText = encodeURIComponent(
    'I use TradeClaw for real-time AI trading signals. Get 7 days free Pro with my link:',
  );
  const shareUrl = encodeURIComponent(link);

  return (
    <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-start gap-3">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="mt-0.5 shrink-0 text-emerald-400"
        >
          <path
            d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 10a5 5 0 11-10 0 5 5 0 0110 0z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
        <div className="w-full">
          <p className="font-semibold text-white">Refer &amp; Earn</p>
          <p className="mt-1 text-sm text-zinc-400">
            Share TradeClaw with traders you know. When they subscribe via your
            link, you earn <span className="text-emerald-400 font-semibold">20% revenue share</span>.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={link}
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-emerald-500/40"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/5"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-white/10 border border-white/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </a>

          <Link
            href="/referrals"
            className="mt-3 ml-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition-all hover:text-emerald-300"
          >
            View Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { status, session } = useUserSession();
  const userId = session?.userId ?? '';
  // Map the server tier ('free'|'pro'|'elite'|'custom') to what this page
  // renders. 'custom' is a Pro-equivalent admin grant so we display it as Pro;
  // 'elite' is paid so we surface it as its own tier (the user is paying for
  // it and should see that on the page they cancel from).
  const serverTier = session?.tier;
  const currentTier: Tier =
    serverTier === 'elite'
      ? 'elite'
      : serverTier === 'pro' || serverTier === 'custom'
        ? 'pro'
        : 'free';
  const cancelAtPeriodEnd = session?.cancelAtPeriodEnd ?? false;
  const periodEndLabel = formatLongDate(session?.currentPeriodEnd ?? null);
  const [billingInterval, setBillingInterval] = useState<Interval>('monthly');

  const plan = getPlanInfo(currentTier, billingInterval);
  const [error, setError] = useState<string | null>(null);
  const isLoading = status === 'loading';
  const isDemo = status === 'anonymous';
  const [portalLoading, setPortalLoading] = useState(false);
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);

  async function openTelegramLink() {
    setTelegramLoading(true);
    try {
      const res = await fetch('/api/telegram/link-token', { method: 'POST' });
      if (!res.ok) {
        setError('Could not generate a Telegram link. Sign in and try again.');
        return;
      }
      const data = (await res.json()) as { deepLink?: string };
      if (!data.deepLink) {
        setError('Could not generate a Telegram link.');
        return;
      }
      setTelegramDeepLink(data.deepLink);
      window.open(data.deepLink, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Could not generate a Telegram link.');
    } finally {
      setTelegramLoading(false);
    }
  }

  async function openPortal() {
    if (!userId) {
      setError('Please sign in to manage your billing.');
      return;
    }
    setPortalLoading(true);
    try {
      const url = await createPortalSession();
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

          {currentTier !== 'free' && cancelAtPeriodEnd && (
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-200">
              <span className="font-semibold">Cancellation scheduled</span>
              {periodEndLabel ? (
                <> — your plan ends on <span className="font-semibold">{periodEndLabel}</span>. Reactivate from the billing portal anytime before then.</>
              ) : (
                <> — your plan ends at the current period close. Reactivate from the billing portal anytime before then.</>
              )}
            </div>
          )}

          {currentTier !== 'free' && (
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <p className="text-xs text-zinc-500">
                Manage invoices, update payment method, or cancel via the Stripe
                customer portal.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/5 disabled:opacity-60"
                >
                  {portalLoading ? 'Opening portal…' : 'Manage Billing'}
                </button>
                <Link
                  href="/data"
                  className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                >
                  Planning to cancel? Export your data first →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Upgrade / switch plans — Elite is the top paid tier; route them to
            the portal via the Manage Billing button above instead of offering
            a downgrade-shaped "Change plan" prompt. */}
        {currentTier !== 'elite' && (
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
              onError={setError}
            />
          </div>
        </div>
        )}

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
              {currentTier === 'free' ? (
                <>
                  <p className="font-semibold text-white">Join the public Telegram channel</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Free tier signals are posted to{' '}
                    <span className="font-mono text-zinc-300">@tradeclawwin</span> with a 30-minute delay.
                    The private Pro group unlocks after upgrade.
                  </p>
                  <a
                    href="https://t.me/tradeclawwin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-400 transition-all hover:bg-sky-500/30 border border-sky-500/30"
                  >
                    Open public channel
                  </a>
                </>
              ) : (
                <>
                  <p className="font-semibold text-white">Connect Telegram</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Link your Telegram account to receive signals in your private Pro group.
                  </p>
                  <button
                    type="button"
                    onClick={openTelegramLink}
                    disabled={telegramLoading || isDemo}
                    className="mt-3 inline-block rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-400 transition-all hover:bg-sky-500/30 border border-sky-500/30 disabled:opacity-50"
                  >
                    {telegramLoading ? 'Generating link…' : 'Open Telegram Bot'}
                  </button>
                  {telegramDeepLink && (
                    <p className="mt-2 text-[11px] text-zinc-500">
                      Link expires in 10 minutes. If the bot doesn&apos;t open, click again for a fresh link.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Premium Telegram Channel — Pro / Elite only */}
        {currentTier !== 'free' && (
          <PremiumChannelCard tier={currentTier} />
        )}

        {/* Referral program */}
        {session?.referralCode && (
          <ReferralCard referralCode={session.referralCode} />
        )}

        {/* Annual plan callout — only relevant on the Pro/free tiers */}
        {currentTier !== 'elite' && (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-5 py-4">
            <p className="text-sm text-emerald-300">
              <span className="font-semibold">Save 17%</span> with annual billing — Pro
              at $290/yr. Switch from the billing portal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
