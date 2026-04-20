import { redirect } from 'next/navigation';
import { readSessionFromCookies } from '../../lib/user-session';
import { getStripe } from '../../lib/stripe';
import { Navbar } from '../components/navbar';
import { SiteFooter } from '../../components/landing/site-footer';
import { WelcomeClient } from './WelcomeClient';

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function WelcomePage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  const session = await readSessionFromCookies();
  if (!session?.userId) {
    const next =
      '/welcome' + (session_id ? `?session_id=${encodeURIComponent(session_id)}` : '');
    redirect(`/signin?next=${encodeURIComponent(next)}`);
  }

  let verified = false;
  if (session_id) {
    try {
      const stripe = getStripe();
      const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
      verified = checkoutSession.client_reference_id === session.userId;
    } catch {
      verified = false;
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--background)] pt-28 pb-24 px-4">
        <div className="mx-auto max-w-xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Welcome to Pro
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--foreground)]">
              {verified ? "You're in. Let's finish setup." : 'Finish setting up your account.'}
            </h1>
            <p className="mt-3 text-[var(--text-secondary)]">
              Two quick steps and your Telegram is live.
            </p>
          </div>
          <div className="mt-10">
            <WelcomeClient userId={session.userId} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
