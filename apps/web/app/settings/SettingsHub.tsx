'use client';

import React from 'react';
import Link from 'next/link';
import {
  Settings as SettingsIcon,
  Bell,
  Webhook,
  ChevronRight,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useUserSession, type ClientSession } from '../../lib/hooks/use-user-tier';

function initialsOf(session: ClientSession): string {
  const source = (session.displayName ?? session.email ?? '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6 transition-colors ${className}`}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-[#050505] text-white"
      style={{ fontFamily: 'var(--font-geist-sans, sans-serif)' }}
    >
      <div className="border-b border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-1">
            <SettingsIcon className="h-6 w-6 text-emerald-400" />
            <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Profile, alert channels, and webhook delivery — all in one place.
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8 pb-20 md:pb-8 space-y-6">
        {children}
      </div>
    </div>
  );
}

async function signOut(): Promise<void> {
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } finally {
    window.location.href = '/';
  }
}

function SignOutButton() {
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        setBusy(true);
        void signOut();
      }}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#141414] border border-[#2a2a2a] text-zinc-400 rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors disabled:opacity-40"
    >
      <LogOut className="h-3.5 w-3.5" />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

function ProfileCard({ session }: { session: ClientSession }) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        {session.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-14 w-14 rounded-full border border-[#1a1a1a] object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-sm font-semibold text-emerald-300 flex-shrink-0">
            {initialsOf(session)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-base font-semibold truncate">
              {session.displayName ?? session.email}
            </h2>
            {session.isAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="h-3 w-3" />
                Admin
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate">{session.email}</p>
          {session.authProvider && (
            <p className="text-[11px] text-zinc-600 mt-1 uppercase tracking-wider">
              Signed in via {session.authProvider}
            </p>
          )}
        </div>
      </div>

      <p className="text-[11px] text-zinc-600 mt-4 leading-relaxed">
        Profile name, email, and avatar come from your sign-in provider. To
        change them, update them with {session.authProvider ?? 'your provider'}{' '}
        and sign in again.
      </p>
    </Card>
  );
}

interface HubLinkProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function HubLink({ href, icon, title, description }: HubLinkProps) {
  return (
    <Link
      href={href}
      className="group block bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 hover:border-emerald-500/30 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

function AnonymousState() {
  return (
    <Card className="text-center py-12">
      <div className="flex justify-center mb-3">
        <LogIn className="h-8 w-8 text-zinc-600" />
      </div>
      <p className="text-zinc-300 text-sm">Sign in to manage your settings.</p>
      <p className="text-zinc-600 text-xs mt-1">
        Profile, alert channels, and webhooks are tied to your account.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link
          href="/signin?next=/settings"
          className="px-4 py-2 bg-emerald-500 text-black text-xs font-semibold rounded-lg hover:bg-emerald-400 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/"
          className="px-4 py-2 bg-[#141414] border border-[#2a2a2a] text-zinc-300 text-xs rounded-lg hover:border-zinc-600 transition-colors"
        >
          Back home
        </Link>
      </div>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card className="flex items-center justify-center py-12">
      <Spinner />
    </Card>
  );
}

export default function SettingsHub() {
  const { status, session } = useUserSession();

  return (
    <PageShell>
      {status === 'loading' && <LoadingState />}
      {status === 'anonymous' && <AnonymousState />}
      {status === 'authenticated' && session && (
        <>
          <ProfileCard session={session} />

          <div>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
              Notifications
            </h2>
            <div className="space-y-3">
              <HubLink
                href="/settings/alerts"
                icon={<Bell className="h-5 w-5" />}
                title="Alert Channels"
                description="Telegram, Discord, and email — pick what gets pinged when a signal fires."
              />
              <HubLink
                href="/settings/webhooks"
                icon={<Webhook className="h-5 w-5" />}
                title="Webhooks"
                description="Push signals to any HTTP endpoint, with optional HMAC-SHA256 signing."
              />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
              Account
            </h2>
            <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-zinc-300">Sign out of this session</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Clears the session cookie on this browser. Other devices stay signed in.
                </p>
              </div>
              <SignOutButton />
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}
