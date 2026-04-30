'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../components/navbar';
import { SiteFooter } from '../../components/landing/site-footer';

function SigninInner() {
  const params = useSearchParams();
  const router = useRouter();
  const priceId = params.get('priceId') ?? '';
  const tier = params.get('tier') ?? '';
  const interval = params.get('interval') ?? '';
  const next = params.get('next') ?? '';
  const oauthError = params.get('error') ?? '';
  const hasCheckoutInterval = interval === 'monthly' || interval === 'annual';

  const googleHref = (() => {
    const u = new URLSearchParams();
    if (priceId) u.set('priceId', priceId);
    if (tier) u.set('tier', tier);
    if (interval) u.set('interval', interval);
    if (next) u.set('next', next);
    const qs = u.toString();
    return `/api/auth/google/start${qs ? `?${qs}` : ''}`;
  })();

  const [status, setStatus] = useState<'checking' | 'idle' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
        const data = await res.json();
        if (cancelled) return;
        if (data?.data?.userId) {
          await proceedAfterSession();
          return;
        }
      } catch {
        /* fall through to button */
      }
      if (!cancelled) setStatus('idle');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function proceedAfterSession(): Promise<void> {
    const checkoutBody =
      priceId
        ? { priceId }
        : tier === 'pro' && hasCheckoutInterval
          ? { tier: 'pro', interval: interval as 'monthly' | 'annual' }
          : null;

    if (checkoutBody) {
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(checkoutBody),
        });
        const data = await res.json();
        if (res.ok && data?.url) {
          window.location.href = data.url as string;
          return;
        }
        throw new Error(data?.error ?? 'Failed to start checkout');
      } catch (err: unknown) {
        if (next && next.startsWith('/') && !next.startsWith('//')) {
          const url = new URL(next, window.location.origin);
          url.searchParams.set('error', 'checkout_failed');
          router.replace(url.pathname + url.search);
          return;
        }
        setError(err instanceof Error ? err.message : 'Checkout failed');
        setStatus('error');
        return;
      }
    }
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      if (!priceId && !(tier === 'pro' && hasCheckoutInterval) && (next.startsWith('/pricing') || next.startsWith('/dashboard/billing'))) {
        const url = new URL(next, window.location.origin);
        url.searchParams.set('error', 'checkout_unavailable');
        router.replace(url.pathname + url.search);
        return;
      }
      router.replace(next);
      return;
    }
    router.replace('/dashboard');
  }

  const oauthErrorMessage = (() => {
    if (!oauthError) return null;
    if (oauthError === 'oauth_not_configured') {
      return 'Google sign-in is not configured on this server. Contact support.';
    }
    return `Sign-in failed (${oauthError}). Please try again.`;
  })();

  return (
    <main className="min-h-screen bg-[var(--background)] pt-28 pb-24 px-4">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            {priceId || (tier === 'pro' && hasCheckoutInterval) ? 'Checkout' : 'Sign in'}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {priceId || (tier === 'pro' && hasCheckoutInterval)
              ? 'One step before payment'
              : 'Sign in to TradeClaw'}
          </h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {priceId || (tier === 'pro' && hasCheckoutInterval)
              ? 'Sign in with Google — we’ll send you to secure Stripe checkout.'
              : 'Sign in with Google to access your dashboard.'}
          </p>
        </div>

        {oauthErrorMessage && (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300">
            {oauthErrorMessage}
          </p>
        )}

        {error && (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300">
            {error}
          </p>
        )}

        {status === 'checking' ? (
          <p className="mt-10 text-center text-sm text-[var(--text-secondary)]">
            Checking your session…
          </p>
        ) : (
          <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-6">
            <a
              href={googleHref}
              className="flex items-center justify-center gap-2.5 rounded-lg border border-[var(--border)] bg-white py-2.5 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.92v2.33A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.92A8.997 8.997 0 0 0 0 9c0 1.45.35 2.82.92 4.04l3.05-2.33z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 9 0 8.997 8.997 0 0 0 .92 4.96L3.97 7.3C4.68 5.18 6.66 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </a>
            <p className="text-center text-xs text-[var(--text-secondary)]">
              By continuing you agree to our terms.{' '}
              <Link href="/pricing" className="text-emerald-400 hover:underline">
                See pricing
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SigninPage() {
  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <main className="min-h-screen bg-[var(--background)] pt-28 pb-24 px-4" />
        }
      >
        <SigninInner />
      </Suspense>
      <SiteFooter />
    </>
  );
}
