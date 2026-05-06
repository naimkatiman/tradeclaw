'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageForResendError } from '../../lib/telegram-resend-messages';

interface InviteState {
  isActive: boolean;
  isExpired: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface StatusResponse {
  ok: true;
  tier: 'free' | 'pro' | 'elite';
  linked: boolean;
  invite: InviteState | null;
}

type ViewState =
  | { kind: 'loading' }
  | { kind: 'hidden' }
  | { kind: 'unlinked' }
  | { kind: 'sent'; expiresAt: string | null }
  | { kind: 'pending' }
  | { kind: 'expired' };

type ResendState = 'idle' | 'loading' | 'sent' | 'error';

function deriveView(data: StatusResponse): ViewState {
  if (data.tier === 'free') return { kind: 'hidden' };
  if (!data.linked) return { kind: 'unlinked' };
  if (!data.invite) return { kind: 'pending' };
  if (data.invite.isActive && !data.invite.isExpired) {
    return { kind: 'sent', expiresAt: data.invite.expiresAt };
  }
  return { kind: 'expired' };
}

function formatExpiry(iso: string | null): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 24) return `expires in ${Math.floor(hours / 24)}d`;
  if (hours >= 1) return `expires in ${hours}h`;
  const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `expires in ${mins}m`;
}

export function TelegramInviteBadge() {
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [resendState, setResendState] = useState<ResendState>('idle');
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/invite-status', { cache: 'no-store' });
      if (res.status === 401) {
        setView({ kind: 'hidden' });
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as StatusResponse;
      setView(deriveView(data));
    } catch {
      // Leave the prior state in place; transient network blips should not
      // wipe the badge.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onResend = useCallback(async () => {
    setResendState('loading');
    setResendMessage(null);
    try {
      const res = await fetch('/api/telegram/resend-invite', { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setResendState('sent');
        setResendMessage('Invite sent. Check your Telegram DMs.');
        await refresh();
        return;
      }
      setResendState('error');
      setResendMessage(messageForResendError(data.error));
    } catch {
      setResendState('error');
      setResendMessage('Could not reach the server. Try again.');
    }
  }, [refresh]);

  if (view.kind === 'loading' || view.kind === 'hidden') return null;

  const tone = toneFor(view.kind);
  const label = labelFor(view);

  return (
    <div
      data-testid="telegram-invite-badge"
      className={`inline-flex flex-col items-center gap-1 rounded-xl border px-4 py-2 text-xs ${tone.container}`}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className={`h-2 w-2 rounded-full ${tone.dot}`} />
        <span className="font-semibold tracking-tight">Pro invite: {label}</span>
        {view.kind !== 'unlinked' && (
          <button
            type="button"
            onClick={onResend}
            disabled={resendState === 'loading' || resendState === 'sent'}
            data-testid="telegram-invite-resend-btn"
            className="ml-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {resendState === 'loading' ? 'Sending…' : resendState === 'sent' ? 'Sent' : 'Resend'}
          </button>
        )}
      </div>
      {view.kind === 'sent' && view.expiresAt && (
        <span className="text-[10px] text-zinc-500">{formatExpiry(view.expiresAt)}</span>
      )}
      {resendMessage && (
        <span
          className={`text-[10px] ${resendState === 'error' ? 'text-red-400' : 'text-emerald-400'}`}
        >
          {resendMessage}
        </span>
      )}
    </div>
  );
}

function labelFor(view: ViewState): string {
  switch (view.kind) {
    case 'sent':
      return 'sent';
    case 'pending':
      return 'pending';
    case 'expired':
      return 'expired';
    case 'unlinked':
      return 'link Telegram first';
    default:
      return '';
  }
}

function toneFor(kind: ViewState['kind']): { container: string; dot: string } {
  switch (kind) {
    case 'sent':
      return {
        container: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
        dot: 'bg-emerald-400',
      };
    case 'pending':
      return {
        container: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
        dot: 'bg-amber-400 animate-pulse',
      };
    case 'expired':
      return {
        container: 'border-red-500/30 bg-red-500/5 text-red-300',
        dot: 'bg-red-400',
      };
    case 'unlinked':
      return {
        container: 'border-zinc-500/30 bg-zinc-500/5 text-zinc-300',
        dot: 'bg-zinc-400',
      };
    default:
      return { container: '', dot: '' };
  }
}
