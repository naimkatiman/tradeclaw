'use client';

import { useState } from 'react';
import { fetchWithLicense } from '@/lib/license-client';

interface SignalExplanationProps {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  timeframe: string;
  indicators?: string[];
}

export function SignalExplanation({ symbol, direction, confidence, entry, timeframe, indicators }: SignalExplanationProps) {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null);
  const [flipFrom, setFlipFrom] = useState<'BUY' | 'SELL' | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (explanation) { setOpen(v => !v); return; }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetchWithLicense('/api/explain', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symbol, direction, confidence, entry, timeframe, indicators }),
      });
      const data = await res.json();
      setExplanation(data.explanation || data.summary || data.markdown || 'No explanation available.');
      setSource(data.source);
      setFlipFrom(data.flipFrom ?? null);
    } catch {
      setExplanation('Explanation unavailable. Check network or API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={load}
        className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        {open ? 'Hide explanation' : 'Why this signal?'}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-zinc-700 border-t-emerald-500 rounded-full animate-spin flex-shrink-0" />
              <span className="text-[11px] text-zinc-600">Analyzing signal...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {flipFrom && (
                <p className="text-[11px] text-amber-400/90 leading-relaxed">
                  Direction flipped from <strong>{flipFrom}</strong> to <strong>{direction}</strong> on the previous bar. The indicators realigned — see below for what changed.
                </p>
              )}
              <p className="text-[12px] text-zinc-400 leading-relaxed">{explanation}</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  source === 'ai'
                    ? 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/15'
                    : 'text-zinc-600 bg-white/[0.03] border border-white/5'
                }`}>
                  {source === 'ai' ? 'AI analysis' : 'Pattern match'}
                </span>
                {flipFrom && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded text-amber-400 bg-amber-500/10 border border-amber-500/20">
                    Flip {flipFrom} → {direction}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
