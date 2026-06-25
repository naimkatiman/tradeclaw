'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, CreditCard, ShieldCheck, User, Users } from 'lucide-react';
import { useUserSession, type ClientSession } from '../lib/hooks/use-user-tier';

interface UserMenuProps {
  /**
   * Visual density. `compact` matches the rounded-pill marketing navbar;
   * `default` matches the in-app sticky navbar.
   */
  size?: 'compact' | 'default';
}

function tierPillClasses(tier: ClientSession['tier']): string {
  if (tier === 'free') {
    return 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50';
  }
  return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
}

function initialsOf(session: ClientSession): string {
  const source = (session.displayName ?? session.email ?? '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function AvatarImage({ session }: { session: ClientSession }) {
  const [errored, setErrored] = useState(false);
  if (!session.avatarUrl || errored) {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
        {initialsOf(session)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- avatar URL is on a third-party CDN, Next/Image would require allow-listing every provider
    <img
      src={session.avatarUrl}
      alt=""
      width={28}
      height={28}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className="h-7 w-7 rounded-full object-cover border border-white/10"
    />
  );
}

/**
 * Identity affordance for the navbar.
 *
 *  - Anonymous → renders a "Sign in" link to /signin.
 *  - Authenticated → avatar + tier pill + dropdown (Profile, Billing, Sign out).
 *
 * Used by both the marketing navbar and the in-app PageNavBar so the same
 * "I'm logged in as X" cue follows the user across surfaces.
 */
export function UserMenu({ size = 'default' }: UserMenuProps) {
  const { status, session } = useUserSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (status === 'loading') {
    // Reserve space — avoids layout shift when the session resolves.
    return <span className="h-7 w-7 rounded-full bg-white/5 animate-pulse" aria-hidden="true" />;
  }

  if (status === 'anonymous' || !session) {
    const cls =
      size === 'compact'
        ? 'rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors'
        : 'rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors';
    return (
      <Link href="/signin" className={cls} data-testid="user-menu-signin">
        Sign in
      </Link>
    );
  }

  async function signOut() {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } finally {
      // Hard navigation forces server components to re-resolve the cleared
      // cookie. Awaiting the DELETE first means the Set-Cookie header has
      // landed before this redirect; `finally` runs even on network failure
      // so the user is never stranded on a "signed-in" UI after clicking.
      window.location.href = '/';
    }
  }

  const tierLabel = session.tier.toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="user-menu-trigger"
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-white/5 transition-colors"
      >
        <AvatarImage session={session} />
        <span
          className={`hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${tierPillClasses(
            session.tier,
          )}`}
        >
          {tierLabel}
        </span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-2 w-60 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/95 backdrop-blur-2xl shadow-2xl shadow-black/40 p-1.5 z-50"
        >
          <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
            <p className="text-xs font-semibold text-white truncate">
              {session.displayName ?? session.email}
            </p>
            <p className="text-[11px] text-zinc-500 truncate">{session.email}</p>
            {session.authProvider && (
              <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-wider">
                via {session.authProvider}
              </p>
            )}
          </div>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <User className="w-3.5 h-3.5" />
            Profile & Settings
          </Link>
          <Link
            href={session.tier === 'free' ? '/pricing?from=usermenu' : '/dashboard/billing'}
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <CreditCard className="w-3.5 h-3.5" />
            {session.tier === 'free' ? 'Upgrade to Pro' : 'Billing'}
          </Link>
          <Link
            href="/referrals"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <Users className="w-3.5 h-3.5" />
            Referrals
          </Link>
          {session.isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/10"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            role="menuitem"
            data-testid="user-menu-signout"
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
