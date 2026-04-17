'use client';

import type { ConnectionState } from '../lib/hooks/use-price-stream';

interface ConnectionStatusProps {
  state: ConnectionState;
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  if (state === 'connected') {
    return (
      <div className="flex items-center gap-1.5" title="Connected — live data streaming">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="text-[11px] font-bold text-emerald-400 tracking-widest uppercase">LIVE</span>
      </div>
    );
  }

  if (state === 'connecting') {
    return (
      <div className="flex items-center gap-1.5" title="Connecting to price stream…">
        <span className="h-2 w-2 rounded-full bg-zinc-400 animate-pulse shrink-0" />
        <span className="text-[11px] text-zinc-400 font-mono">···</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5" title="Disconnected — reconnecting…">
      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
      <span className="text-[11px] text-rose-500 font-mono">OFF</span>
    </div>
  );
}
