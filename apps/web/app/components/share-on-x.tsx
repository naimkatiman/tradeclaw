'use client';

import { useMemo } from 'react';
import { useLocale } from './locale-provider';
import { formatMessage } from '@/lib/product-i18n/format';
import { getTrackRecordWidgetTranslations } from '@/lib/product-i18n/track-record-widgets';
import { getHtmlLanguage } from '@/lib/translations';

const PUBLIC_ORIGIN = 'https://tradeclaw.win';

interface ShareOnXProps {
  /** Win rate %, e.g. 62. Omit to use a generic message. */
  winRate?: number;
  /** Resolved-trade count over the same period as winRate. */
  resolved?: number;
  /** Period label (e.g. "7d", "30d") used in copy and as a UTM tag. */
  period?: string;
  /** Override label. */
  label?: string;
}

/**
 * Pre-filled X share button for the public signal study.
 */
export function ShareOnX({ winRate, resolved, period = 'recent', label }: ShareOnXProps) {
  const { locale } = useLocale();
  const t = getTrackRecordWidgetTranslations(locale).share;
  const href = useMemo(() => {
    const url = `${PUBLIC_ORIGIN}/track-record?utm_source=x&utm_medium=share&utm_campaign=track_record&period=${encodeURIComponent(period)}`;
    const language = getHtmlLanguage(locale);
    const text =
      typeof winRate === 'number' && typeof resolved === 'number' && resolved > 0
        ? formatMessage(t.xObserved, {
            winRate: new Intl.NumberFormat(language, {
              style: 'percent',
              maximumFractionDigits: 2,
            }).format(winRate / 100),
            resolved: new Intl.NumberFormat(language).format(resolved),
          })
        : t.xGeneric;
    const params = new URLSearchParams({ text, url });
    return `https://x.com/intent/post?${params.toString()}`;
  }, [winRate, resolved, period, locale, t]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="share-on-x"
      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
      aria-label={t.xAria}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        aria-hidden="true"
        className="fill-current"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      <span>{label ?? t.xDefaultLabel}</span>
    </a>
  );
}
