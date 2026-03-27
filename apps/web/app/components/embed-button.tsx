'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

interface Props {
  pair: string;
}

function CodeSnippet({ code }: { code: string }) {
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
        onClick={handleCopy}
        className="absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded bg-white/8 border border-white/10 text-zinc-500 hover:text-zinc-200 transition-colors"
      >
        {copied ? <Check className="inline h-3 w-3" /> : 'Copy'}
      </button>
    </div>
  );
}

export function EmbedButton({ pair }: Props) {
  const [open, setOpen] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tradeclaw.com';

  const iframeCode = `<iframe src="${origin}/embed/${pair}?theme=dark" width="320" height="420" frameborder="0" scrolling="no" style="border-radius:12px;overflow:hidden;"></iframe>`;
  const scriptCode = `<script src="${origin}/api/embed?pair=${pair}" data-pair="${pair}" data-theme="dark" data-width="320" data-height="420"></script>`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center transition-colors
          bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
      >
        Embed Widget
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
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold">Embed {pair} Widget</div>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              Paste into any website to show a live {pair} signal card that auto-refreshes every 60 seconds.
            </p>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">iframe method</div>
                <CodeSnippet code={iframeCode} />
              </div>
              <div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Script tag</div>
                <CodeSnippet code={scriptCode} />
              </div>
            </div>

            <a
              href="/embed"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4 text-center text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              View full embed docs →
            </a>
          </div>
        </div>
      )}
    </>
  );
}
