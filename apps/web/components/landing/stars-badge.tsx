'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface GitHubStats {
  stars: number;
}

export function StarsBadge() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/github-stars')
      .then((r) => r.json())
      .then((data: GitHubStats) => setStars(data.stars))
      .catch(() => {});
  }, []);

  return (
    <Link
      href="/stars"
      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-400 transition-all duration-300 hover:shadow-[0_0_16px_rgba(16,185,129,0.2)]"
    >
      <svg
        className="w-3.5 h-3.5 fill-current animate-pulse"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {stars !== null ? (
        <span>
<<<<<<< HEAD
          <span className="font-bold text-white">{stars.toLocaleString()}</span> stars
=======
          <span className="font-bold text-[var(--foreground)]">{stars.toLocaleString()}</span> stars
>>>>>>> origin/main
        </span>
      ) : (
        <span className="text-[var(--text-secondary)]">Loading stars…</span>
      )}
      <span className="text-[var(--text-secondary)]">→</span>
    </Link>
  );
}
