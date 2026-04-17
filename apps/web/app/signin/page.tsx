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
  const next = params.get('next') ?? '';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'submitting' | 'error'>(
    'checking',
  );
  const [error, setError] = useState<string | null>(null);

  // If a session already exists, skip the form and go straight to checkout / next.
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
        /* fall through to form */
      }
      if (!cancelled) setStatus('idle');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function proceedAfterSession(): Promise<void> {
    if (priceId) {
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ priceId }),
        });
        const data = await res.json();
        if (res.ok && data?.url) {
          window.location.href = data.url as string;
          return;
        }
        throw new Error(data?.error ?? 'Failed to start checkout');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Checkout failed');
        setStatus('error');
        return;
      }
    }
    if (next && next.startsWith('/')) {
      router.replace(next);
      return;
    }
    router.replace('/dashboard');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error ?? 'Signin failed');
      }
      await proceedAfterSession();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pt-28 pb-24 px-4">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            {priceId ? 'Checkout' : 'Sign in'}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {priceId ? 'One step before payment' : 'Sign in with email'}
          </h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {priceId
              ? 'Enter your email — we’ll create your account and send you to secure Stripe checkout.'
              : 'Enter your email to access your dashboard. No password required.'}
          </p>
        </div>

        {status === 'checking' ? (
          <p className="mt-10 text-center text-sm text-[var(--text-secondary)]">
            Checking your session…
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-10 flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-6"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Email
              </span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-emerald-500/60"
              />
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-black transition-all hover:bg-emerald-400 disabled:opacity-60"
            >
              {status === 'submitting'
                ? 'Working…'
                : priceId
                  ? 'Continue to payment'
                  : 'Sign in'}
            </button>

            <p className="text-center text-xs text-[var(--text-secondary)]">
              By continuing you agree to our terms.{' '}
              <Link href="/pricing" className="text-emerald-400 hover:underline">
                See pricing
              </Link>
            </p>
          </form>
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
