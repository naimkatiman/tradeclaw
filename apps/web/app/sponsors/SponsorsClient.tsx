'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Heart, Info, Star } from 'lucide-react';

interface SponsorsResponse {
  available: boolean;
  sponsors: unknown[];
  githubUrl: string;
  message: string;
}

const DEFAULT_SPONSORS_URL = 'https://github.com/sponsors/naimkatiman';

export function SponsorsClient() {
  const [data, setData] = useState<SponsorsResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/sponsors')
      .then((response) => response.json())
      .then((response: SponsorsResponse) => {
        if (!cancelled) setData(response);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const githubUrl = data?.githubUrl ?? DEFAULT_SPONSORS_URL;

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 pt-28 text-[var(--foreground)]">
      <section className="mx-auto max-w-3xl px-6 text-center">
        <Heart className="mx-auto h-9 w-9 text-rose-400" />
        <h1 className="mt-5 text-4xl font-bold">Support TradeClaw</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-7 text-[var(--text-secondary)]">
          Sponsorship can fund maintenance, documentation, testing, and community support for the open-source
          repository.
        </p>
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-400"
        >
          Open GitHub Sponsors
          <ExternalLink className="h-4 w-4" />
        </a>
      </section>

      <section
        aria-labelledby="records-heading"
        className="mx-auto mt-16 max-w-3xl border-y border-[var(--border)] px-6 py-10"
      >
        <div className="flex items-start gap-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <h2 id="records-heading" className="text-lg font-semibold">
              Published sponsor records
            </h2>
            {!loaded ? (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Checking data availability...</p>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {data?.message ??
                    'Sponsor records are unavailable. No sponsor identities, quotes, counts, or revenue figures are shown.'}
                </p>
                <div className="mt-4 inline-flex rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs font-medium text-amber-300">
                  Data unavailable - no estimates substituted
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-4 px-6 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          GitHub is the source of record for any current sponsorship options and terms.
        </p>
        <Link
          href="https://github.com/naimkatiman/tradeclaw"
          target="_blank"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
        >
          <Star className="h-4 w-4 text-amber-400" />
          View the repository
        </Link>
      </section>
    </main>
  );
}
