'use client';

import { useLocale } from '../app/components/locale-provider';
import type { ConnectionState } from '../lib/hooks/use-price-stream';
import { getDashboardLiveTranslations } from '../lib/product-i18n/dashboard-live';

interface ConnectionStatusProps {
  state: ConnectionState;
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const { locale } = useLocale();
  const t = getDashboardLiveTranslations(locale);

  if (state === 'connected') {
    return (
      <div
        className="flex items-center gap-1.5"
        title={t.connection.connectedTooltip}
        aria-label={t.connection.connectedTooltip}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="text-[11px] font-bold text-emerald-400 tracking-widest uppercase">{t.common.live}</span>
      </div>
    );
  }

  if (state === 'connecting') {
    return (
      <div
        className="flex items-center gap-1.5"
        title={t.connection.connectingTooltip}
        aria-label={t.connection.connectingTooltip}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="h-2 w-2 rounded-full bg-zinc-400 animate-pulse shrink-0" />
        <span className="text-[11px] text-zinc-400 font-mono">···</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5"
      title={t.connection.disconnectedTooltip}
      aria-label={t.connection.disconnectedTooltip}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
      <span className="text-[11px] text-rose-500 font-mono">{t.common.off}</span>
    </div>
  );
}
