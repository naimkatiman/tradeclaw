'use client';

/**
 * CostFieldHero — client shell around the Cost Field visual. Owns data
 * fetching, the WebGL / reduced-motion fallback chain (DESIGN.md: WebGL →
 * static canvas → text), and the gross / after-cost toggle. The 3D module is
 * imported dynamically so three.js never enters the initial bundle.
 */

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from '../../motion/use-reduced-motion';
import { StaticCostField, type CostFieldData } from './static-cost-field';
import type { CostFieldMode } from './CostFieldScene';

const CostFieldScene = dynamic(
  () => import('./CostFieldScene').then((m) => m.CostFieldScene),
  { ssr: false },
);

const DATA_URL = '/api/research/cost-field';

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl'),
    );
  } catch {
    return false;
  }
}

export function CostFieldHero() {
  const [data, setData] = useState<CostFieldData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [mode, setMode] = useState<CostFieldMode>('auto');
  const [phase, setPhase] = useState<'gross' | 'net'>('gross');
  // WebGL support is a fixed client capability; probe once in a lazy
  // initializer (SSR-guarded) rather than setting state inside an effect.
  const [canWebgl] = useState(() => typeof document !== 'undefined' && webglAvailable());
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    fetch(DATA_URL)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body: CostFieldData & { count: number }) => {
        if (cancelled) return;
        if (!Array.isArray(body.t) || body.t.length === 0) {
          setStatus('empty');
          return;
        }
        setData(body);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shownPhase = mode === 'auto' ? phase : mode;
  const count = data?.t.length ?? 0;
  const countLabel = useMemo(() => count.toLocaleString('en-US'), [count]);

  if (status === 'empty' || status === 'error') {
    return (
      <div className="flex h-full min-h-72 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--glass-bg)] p-6 text-center text-sm text-[var(--text-secondary)]">
        <p>
          {status === 'empty'
            ? 'No resolved, position-sized trades are available in this environment yet. '
            : 'The trade field could not load. '}
          Inspect the dataset at{' '}
          <a href={DATA_URL} className="underline hover:text-[var(--foreground)]">
            {DATA_URL}
          </a>{' '}
          and on the <a href="/track-record" className="underline hover:text-[var(--foreground)]">track record</a>.
        </p>
      </div>
    );
  }

  return (
    <figure className="relative h-full min-h-72" data-testid="cost-field">
      <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-card)]">
        {data && canWebgl && !reducedMotion ? (
          <CostFieldScene data={data} mode={mode} onPhaseChange={setPhase} />
        ) : data ? (
          <StaticCostField data={data} />
        ) : (
          <div className="h-full w-full animate-pulse bg-[var(--glass-bg)]" aria-hidden="true" />
        )}
      </div>

      {/* State toggle — only meaningful when the animated scene runs */}
      {data && canWebgl && !reducedMotion && (
        <div
          className="absolute left-3 top-3 flex items-center gap-px overflow-hidden rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--bg-card)]/80 font-mono text-xs backdrop-blur"
          role="group"
          aria-label="Cost field state"
        >
          <button
            type="button"
            onClick={() => setMode('gross')}
            aria-pressed={shownPhase === 'gross'}
            className={`px-3 py-1.5 transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--ring)] ${
              shownPhase === 'gross'
                ? 'bg-[var(--foreground)] text-[var(--background)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            before costs
          </button>
          <button
            type="button"
            onClick={() => setMode('net')}
            aria-pressed={shownPhase === 'net'}
            className={`px-3 py-1.5 transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--ring)] ${
              shownPhase === 'net'
                ? 'bg-[var(--foreground)] text-[var(--background)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            after modeled costs
          </button>
          {mode !== 'auto' && (
            <button
              type="button"
              onClick={() => setMode('auto')}
              className="px-3 py-1.5 text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--ring)]"
            >
              auto
            </button>
          )}
        </div>
      )}

      <figcaption className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[var(--text-secondary)]">
        <span>
          {data ? (
            <>
              {countLabel} resolved trades · one dot each ·{' '}
              <span className="text-[var(--color-up)]">green = gain (above zero)</span> /{' '}
              <span className="text-[var(--color-down)]">red = loss (below zero)</span>
            </>
          ) : (
            'loading the trade field…'
          )}
        </span>
        <a
          href={DATA_URL}
          className="underline decoration-[var(--border)] underline-offset-2 transition-colors duration-200 hover:text-[var(--foreground)]"
        >
          raw JSON
        </a>
      </figcaption>
    </figure>
  );
}
