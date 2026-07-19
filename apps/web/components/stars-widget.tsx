'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '../app/components/locale-provider';
import { getMarketingNavTranslations } from '../lib/product-i18n/marketing-nav';
import { getHtmlLanguage } from '../lib/translations';
import { parseGitHubStarCount } from '../lib/github-star-count';
import { formatMessage } from '../lib/product-i18n/format';

export function StarsWidget() {
  const { locale } = useLocale();
  const copy = getMarketingNavTranslations(locale);
  const [stars, setStars] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const fetchStars = () => {
      fetch('/api/github-stars')
        .then(async (response) => {
          if (!response.ok) throw new Error(`GitHub star count unavailable: ${response.status}`);
          return response.json() as Promise<unknown>;
        })
        .then((data) => {
          if (!mounted) return;
          const count = parseGitHubStarCount(data);
          setStars(count);
        })
        .catch(() => {
          if (mounted) setStars(null);
        });
    };

    fetchStars();
    const interval = setInterval(fetchStars, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
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
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/8 hover:bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400 transition-all duration-200 hover:shadow-[0_0_10px_rgba(16,185,129,0.15)]"
    >
      <svg
        className="w-3 h-3 fill-current"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {typeof stars === 'number' ? (
        <span className="font-bold text-gray-900 dark:text-white tabular-nums">
          {formattedStars}
        </span>
      ) : stars === undefined ? (
        <span className="w-6 h-2.5 rounded bg-gray-200 dark:bg-white/10 animate-pulse inline-block" />
      ) : null}
    </Link>
  );
}
