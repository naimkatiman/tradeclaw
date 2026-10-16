'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useLocale } from './locale-provider';
import { formatMessage } from '@/lib/product-i18n/format';
import {
  getTrackRecordWidgetTranslations,
  type TrackRecordWidgetTranslations,
} from '@/lib/product-i18n/track-record-widgets';

interface Props {
  /** Per-pair signal embed (legacy use). Mutually exclusive with embedPath. */
  pair?: string;
  /** Explicit embed path (e.g. '/embed/track-record'). Mutually exclusive with pair. */
  embedPath?: string;
  /** Button label override. Default: "Embed". */
  label?: string;
  /** iframe dimensions. Defaults: 320 x 420 for pair, 600 x 360 for track-record. */
  width?: number;
  height?: number;
}

function LtrTemplate({ template, value }: { template: string; value: string }) {
  const [before, after = ''] = template.split('{pair}');
  return (
    <>
      {before}
      <bdi dir="ltr">{value}</bdi>
      {after}
    </>
  );
}

function CodeSnippet({
  code,
  method,
  t,
}: {
  code: string;
  method: string;
  t: TrackRecordWidgetTranslations['embed'];
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative">
      <pre className="bg-white/[0.03] border border-white/8 rounded-lg p-3 text-[10px] font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        {code}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={formatMessage(t.copyCode, { method })}
        className="absolute end-2 top-2 inline-flex items-center gap-1 rounded border border-white/10 bg-white/8 px-2 py-0.5 text-[9px] text-zinc-500 transition-colors hover:text-zinc-200"
      >
        {copied && <Check className="h-3 w-3" aria-hidden="true" />}
        {copied ? t.copied : t.copy}
      </button>
    </div>
  );
}

export function EmbedButton({ pair, embedPath, label, width, height }: Props) {
  const { locale } = useLocale();
  const t = getTrackRecordWidgetTranslations(locale).embed;
  const [open, setOpen] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tradeclaw.win';

  const path = embedPath ?? (pair ? `/embed/${pair}` : '/embed');
  const w = width ?? (pair ? 320 : 600);
  const h = height ?? (pair ? 420 : 360);

  const iframeCode = `<iframe src="${origin}${path}?theme=dark" width="${w}" height="${h}" frameborder="0" scrolling="no" style="border-radius:12px;overflow:hidden;"></iframe>`;
  const scriptCode = pair
    ? `<script src="${origin}/api/embed?pair=${pair}" data-pair="${pair}" data-theme="dark" data-width="${w}" data-height="${h}"></script>`
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center transition-colors
          bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
      >
        {label ?? t.defaultLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-md glass-card rounded-2xl p-5 z-10"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="embed-widget-title"
          >
            <div className="flex items-center justify-between mb-4">
              <div id="embed-widget-title" className="text-sm font-semibold">
                {pair
                  ? <LtrTemplate template={t.pairTitle} value={pair} />
                  : t.trackRecordTitle}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.close}
                className="text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              {pair
                ? <LtrTemplate template={t.pairDescription} value={pair} />
                : t.trackRecordDescription}
            </p>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">{t.iframeMethod}</div>
                <CodeSnippet code={iframeCode} method={t.iframeMethod} t={t} />
              </div>
              {scriptCode && (
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">{t.scriptTag}</div>
                  <CodeSnippet code={scriptCode} method={t.scriptTag} t={t} />
                </div>
              )}
            </div>

            <a
              href="/embed"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4 text-center text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              {t.docs}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
