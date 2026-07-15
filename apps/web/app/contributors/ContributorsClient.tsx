'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, ExternalLink, RefreshCw, Star, Medal, Crown, Heart, Code } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ContributorStats {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  contributions: number;
  rank: number;
  isBot: boolean;
}

interface ContributorResponse {
  available: boolean;
  contributors: ContributorStats[];
}

/* ------------------------------------------------------------------ */
/*  Rank Badge                                                         */
/* ------------------------------------------------------------------ */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={18} className="text-amber-400" />;
  if (rank === 2) return <Medal size={18} className="text-gray-300" />;
  if (rank === 3) return <Medal size={18} className="text-amber-600" />;
  return (
    <span className="text-xs font-mono w-5 text-center" style={{ color: 'var(--text-secondary)' }}>
      #{rank}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Contributor Card                                                   */
/* ------------------------------------------------------------------ */

function ContributorCard({ contrib }: { contrib: ContributorStats }) {
  const isTop3 = contrib.rank <= 3;
  return (
    <div
      className="rounded-xl p-4 md:p-5 transition-all hover:scale-[1.01]"
      style={{
        background: isTop3 ? 'var(--accent-muted)' : 'var(--bg-card)',
        border: `1px solid ${isTop3 ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
        boxShadow: isTop3 ? '0 0 30px rgba(16,185,129,0.05)' : 'none',
      }}
    >
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className="flex-shrink-0">
          <RankBadge rank={contrib.rank} />
        </div>

        {/* Avatar */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={contrib.avatarUrl}
          alt={contrib.login}
          className="w-12 h-12 rounded-full border-2"
          style={{
            borderColor: isTop3 ? 'rgba(16,185,129,0.3)' : 'var(--border)',
          }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={contrib.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold truncate hover:text-emerald-500 transition-colors flex items-center gap-1"
            >
              {contrib.login}
              <ExternalLink size={12} className="opacity-50" />
            </a>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {contrib.contributions} contributions
          </p>
        </div>
      </div>

      {/* Contribution bar */}
      <div className="mt-3 pl-12 md:pl-0">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min(100, (contrib.contributions / 100) * 100)}%`,
              background: 'linear-gradient(90deg, #10b981, #a855f7)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ContributorsClient() {
  const [contributors, setContributors] = useState<ContributorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchContributors() {
      try {
        const res = await fetch('/api/github/contributors');
        if (!res.ok) throw new Error('Contributor API error');
        const data = (await res.json()) as ContributorResponse;

        if (cancelled) return;
        if (!data.available) throw new Error('GitHub contributor data unavailable');
        setContributors(Array.isArray(data.contributors) ? data.contributors : []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchContributors();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalContribs = contributors.reduce((s, c) => s + c.contributions, 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
          <Link
            href="/"
            className="text-xs font-medium flex items-center gap-1.5 mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            ← Back to TradeClaw
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
              <Users size={20} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Contributors</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Contributor totals reported by GitHub. Pull-request, merge, and issue counts are not inferred from this
            single upstream total.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <Users size={20} className="mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold">{contributors.length}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Contributors
            </p>
          </div>
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <Code size={20} className="mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-bold">{totalContribs.toLocaleString()}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              GitHub Contributions
            </p>
          </div>
        </div>

        {/* Contributors list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-emerald-500" />
          </div>
        ) : contributors.length > 0 ? (
          <div className="space-y-3">
            {contributors.map((c) => (
              <ContributorCard key={c.login} contrib={c} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
            GitHub returned no contributor records.
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-xs text-amber-400">
              GitHub contributor data is unavailable. No cached or estimated counts are shown.
            </p>
          </div>
        )}

        {/* contrib.rocks image */}
        <div
          className="rounded-xl p-5 text-center"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <h3 className="text-sm font-semibold mb-4">Contributor Wall</h3>
          <a
            href="https://github.com/naimkatiman/tradeclaw/graphs/contributors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://contrib.rocks/image?repo=naimkatiman/tradeclaw"
              alt="TradeClaw contributors"
              className="mx-auto rounded-lg"
              width={600}
            />
          </a>
          <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
            Made with{' '}
            <a
              href="https://contrib.rocks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:underline"
            >
              contrib.rocks
            </a>
          </p>
        </div>

        {/* Join CTA */}
        <div
          className="rounded-2xl p-6 md:p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(168,85,247,0.08))',
            border: '1px solid rgba(16,185,129,0.15)',
          }}
        >
          <Heart size={24} className="mx-auto mb-3 text-emerald-500" />
          <h3 className="text-lg font-bold mb-2">Join the Team</h3>
          <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            TradeClaw is open source and community-driven. Whether it&apos;s code, docs, or ideas — every contribution
            is celebrated.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contribute"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
              }}
            >
              <Code size={16} /> Start Contributing
            </Link>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            >
              <Star size={16} className="text-amber-400" /> Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
