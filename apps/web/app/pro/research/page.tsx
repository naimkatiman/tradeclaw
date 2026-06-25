import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readSessionFromCookies } from '../../../lib/user-session';
import { getUserTier } from '../../../lib/tier';
import { ResearchClient } from './research-client';

export const metadata: Metadata = {
  title: 'AI Research | TradeClaw Pro',
  description: 'Multi-agent research pipeline for trading decisions.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ProResearchPage() {
  const session = await readSessionFromCookies();
  if (!session?.userId) {
    redirect('/login?from=/pro/research');
  }

  const tier = await getUserTier(session.userId);
  const isPro = tier === 'pro' || tier === 'elite' || tier === 'custom';

  if (!isPro) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4">
        <div className="max-w-md rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-400"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Pro Feature</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Multi-agent research pipeline is available on TradeClaw Pro.
            Get AI-powered analyst, risk manager, and portfolio manager
            working together on your trading decisions.
          </p>
          <a
            href="/pricing?from=research"
            className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Upgrade to Pro
          </a>
        </div>
      </div>
    );
  }

  return <ResearchClient />;
}
