'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SignalPreview {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  stopLoss?: number;
  confidence: number;
  timestamp: string;
}

interface WelcomeClientProps {
  userId: string;
}

export function WelcomeClient({ userId }: WelcomeClientProps) {
  const [signal, setSignal] = useState<SignalPreview | null>(null);
  const [signalState, setSignalState] = useState<'loading' | 'none' | 'ready'>('loading');
  // Deep link is built from a one-time HMAC-signed token issued by
  // /api/telegram/link-token rather than the raw userId, so an attacker
  // cannot bind their own chat to this account by guessing the UUID.
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/telegram/link-token', { method: 'POST' });
        if (!res.ok) {
          if (!cancelled) setLinkError('Could not generate Telegram link. Try refreshing.');
          return;
        }
        const data = (await res.json()) as { deepLink?: string };
        if (data.deepLink && !cancelled) setDeepLink(data.deepLink);
      } catch {
        if (!cancelled) setLinkError('Could not generate Telegram link. Try refreshing.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/signals', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setSignalState('none');
          return;
        }
        const data = (await res.json()) as { signals?: unknown[] } | unknown[];
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as { signals?: unknown[] }).signals)
            ? (data as { signals: unknown[] }).signals
            : [];
        const first = list[0] as Partial<SignalPreview> | undefined;
        if (first && first.symbol && first.direction && typeof first.entry === 'number') {
          if (!cancelled) {
            setSignal({
              symbol: first.symbol,
              direction: first.direction as 'BUY' | 'SELL',
              entry: first.entry,
              tp1: first.tp1,
              tp2: first.tp2,
              tp3: first.tp3,
              stopLoss: first.stopLoss,
              confidence: first.confidence ?? 0,
              timestamp: first.timestamp ?? '',
            });
            setSignalState('ready');
          }
        } else {
          if (!cancelled) setSignalState('none');
        }
      } catch {
        if (!cancelled) setSignalState('none');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <StepCard
        index={1}
        title="Connect Telegram"
        description="Tap the button below. We'll link your account and send your private Pro group invite automatically."
      >
        {deepLink ? (
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="connect-telegram-btn"
            className="inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            Open Telegram bot
          </a>
        ) : (
          <span className="inline-block rounded-lg bg-emerald-500/30 px-4 py-2 text-sm font-semibold text-emerald-200">
            {linkError ?? 'Generating link…'}
          </span>
        )}
      </StepCard>

      <StepCard
        index={2}
        title="Your latest live signal"
        description={
          signalState === 'loading'
            ? 'Loading\u2026'
            : signalState === 'ready'
              ? 'This is exactly the format that hits your Telegram in real time.'
              : 'No signals live right now. Next one will land in your Telegram.'
        }
      >
        {signal && <SignalPreviewCard signal={signal} />}
      </StepCard>

      <div className="mt-6 text-center">
        <Link href="/dashboard" className="text-sm text-[var(--text-secondary)] underline">
          Skip to dashboard
        </Link>
      </div>
    </div>
  );
}

interface StepCardProps {
  index: number;
  title: string;
  description: string;
  children?: React.ReactNode;
}

function StepCard({ index, title, description, children }: StepCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/20 text-xs font-semibold text-[var(--foreground)]">
          {index}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[var(--foreground)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function SignalPreviewCard({ signal }: { signal: SignalPreview }) {
  return (
    <div className="rounded-xl border border-emerald-500/40 bg-black/20 p-4 font-mono text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[var(--foreground)]">{signal.symbol}</span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            signal.direction === 'BUY' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'
          }`}
        >
          {signal.direction}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-1 text-xs">
        <dt className="text-[var(--text-secondary)]">Entry</dt>
        <dd className="text-right">{signal.entry}</dd>
        {signal.tp1 !== undefined && (
          <>
            <dt className="text-[var(--text-secondary)]">TP1</dt>
            <dd className="text-right">{signal.tp1}</dd>
          </>
        )}
        {signal.tp2 !== undefined && (
          <>
            <dt className="text-[var(--text-secondary)]">TP2</dt>
            <dd className="text-right">{signal.tp2}</dd>
          </>
        )}
        {signal.tp3 !== undefined && (
          <>
            <dt className="text-[var(--text-secondary)]">TP3</dt>
            <dd className="text-right">{signal.tp3}</dd>
          </>
        )}
        {signal.stopLoss !== undefined && (
          <>
            <dt className="text-red-400">SL</dt>
            <dd className="text-right text-red-400">{signal.stopLoss}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
