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

  const oauthQuery = (() => {
    const u = new URLSearchParams();
    if (priceId) u.set('priceId', priceId);
    if (tier) u.set('tier', tier);
    if (interval) u.set('interval', interval);
    if (next) u.set('next', next);
    const qs = u.toString();
    return qs ? `?${qs}` : '';
  })();
  const googleHref = `/api/auth/google/start${oauthQuery}`;
  const githubHref = `/api/auth/github/start${oauthQuery}`;

  const [status, setStatus] = useState<'checking' | 'idle' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicErr, setMagicErr] = useState<string | null>(null);
  const [magicBusy, setMagicBusy] = useState(false);

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

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMagicBusy(true);
    setMagicErr(null);
    try {
      const res = await fetch('/api/auth/magic-link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to send link');
      }
      setMagicSent(true);
    } catch (err) {
      setMagicErr(err instanceof Error ? err.message : 'Failed');
    } finally {
      setMagicBusy(false);
    }
  }

  const oauthErrorMessage = (() => {
    if (!oauthError) return null;
    if (oauthError === 'oauth_not_configured') {
      return 'OAuth sign-in is not configured on this server. Contact support.';
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
              ? 'Sign in with Google or GitHub — we’ll send you to secure Stripe checkout.'
              : 'Sign in with Google or GitHub to access your dashboard.'}
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
            <a
              href={githubHref}
              className="flex items-center justify-center gap-2.5 rounded-lg border border-white/15 bg-[#24292f] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#2f363d]"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Continue with GitHub
            </a>
            <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-zinc-500">
              <span className="flex-1 h-px bg-white/10" /> or <span className="flex-1 h-px bg-white/10" />
            </div>
            {magicSent ? (
              <div className="text-sm text-emerald-300 text-center">Check your inbox — link sent.</div>
            ) : (
              <form onSubmit={sendMagicLink} className="space-y-2">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="submit"
                  disabled={magicBusy}
                  className="w-full py-2.5 rounded-lg bg-white/8 border border-white/15 text-sm font-semibold text-zinc-100 hover:bg-white/12 disabled:opacity-50"
                >
                  {magicBusy ? 'Sending…' : 'Email me a sign-in link'}
                </button>
                {magicErr && <div className="text-xs text-rose-400">{magicErr}</div>}
              </form>
            )}
            <p className="text-center text-xs text-[var(--text-secondary)]">
              By continuing you agree to our terms.{' '}
              <Link href="/pricing?from=signin" className="text-emerald-400 hover:underline">
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
