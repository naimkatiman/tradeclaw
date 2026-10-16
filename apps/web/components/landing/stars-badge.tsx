'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '../../app/components/locale-provider';
import { getMarketingNavTranslations } from '../../lib/product-i18n/marketing-nav';
import { getHtmlLanguage } from '../../lib/translations';
import { parseGitHubStarCount } from '../../lib/github-star-count';
import { formatMessage } from '../../lib/product-i18n/format';

export function StarsBadge() {
  const { locale } = useLocale();
  const copy = getMarketingNavTranslations(locale);
  const [stars, setStars] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/github-stars')
      .then(async (response) => {
        if (!response.ok) throw new Error(`GitHub star count unavailable: ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((data) => setStars(parseGitHubStarCount(data)))
      .catch(() => setStars(null));
  }, []);

  const formattedStars = typeof stars === 'number'
    ? new Intl.NumberFormat(getHtmlLanguage(locale)).format(stars)
    : null;
  const accessibleLabel = formattedStars
    ? formatMessage(copy.aria.starCount, { count: formattedStars })
    : copy.aria.starPage;

  return (
    <Link
      href="/stars"
      aria-label={accessibleLabel}
      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-400 transition-all duration-300 hover:shadow-[0_0_16px_rgba(16,185,129,0.2)]"
    >
      <svg
        className="w-3.5 h-3.5 fill-current animate-pulse"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {typeof stars === 'number' ? (
        <span className="font-bold text-[var(--foreground)] tabular-nums">
          {formattedStars} ★
        </span>
      ) : stars === undefined ? (
        <span className="inline-block h-2.5 w-12 animate-pulse rounded bg-white/10" />
      ) : (
        <span className="text-[var(--text-secondary)]">{copy.actions.star}</span>
      )}
      <span className="text-[var(--text-secondary)]">{locale === 'ar' ? '←' : '→'}</span>
    </Link>
  );
}
