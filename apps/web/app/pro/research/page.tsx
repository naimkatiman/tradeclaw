import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readSessionFromCookies } from '../../../lib/user-session';
import { ResearchClient } from './research-client';

export const metadata: Metadata = {
  title: 'AI Research | TradeClaw',
  description: 'Multi-agent research pipeline for trading decisions.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Sign-in is still required (research jobs are per-user); the tier gate is gone.
export default async function ProResearchPage() {
  const session = await readSessionFromCookies();
  if (!session?.userId) {
    redirect('/signin?next=/pro/research');
  }

  return <ResearchClient />;
}
