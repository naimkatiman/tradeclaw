'use client';

import { useState, useEffect, useCallback } from 'react';

export function EmailDigestClient() {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const [copied, setCopied] = useState(false);

  const fetchDigest = useCallback(async (p: '7d' | '30d') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/email-digest?format=html&period=${p}`);
      const text = await res.text();
      setHtml(text);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDigest(period);
  }, [period, fetchDigest]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `tradeclaw-digest-${date}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Email Digest Preview
          </h1>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto">
            Preview the weekly signal digest email. Copy the HTML for Mailchimp, ConvertKit, or any email platform.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <button
              onClick={() => setPeriod('7d')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === '7d'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setPeriod('30d')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === '30d'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy HTML
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium border border-zinc-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download .html
          </button>

          <a
            href={`/api/email-digest?format=html&period=${period}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium border border-zinc-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            Open Raw
          </a>
        </div>

        {/* Instructions */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 mb-8 text-sm text-zinc-400">
          <h3 className="text-white font-semibold mb-2">Usage</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li><strong className="text-zinc-200">Mailchimp:</strong> Create campaign → Code editor → paste HTML</li>
            <li><strong className="text-zinc-200">ConvertKit:</strong> Broadcast → HTML block → paste HTML</li>
            <li><strong className="text-zinc-200">RSS automation:</strong> Point your tool at <code className="text-emerald-400/80 bg-zinc-800 px-1.5 py-0.5 rounded">/api/email-digest?format=html</code></li>
            <li><strong className="text-zinc-200">JSON API:</strong> <code className="text-emerald-400/80 bg-zinc-800 px-1.5 py-0.5 rounded">/api/email-digest?format=json</code> for structured data</li>
          </ul>
        </div>

        {/* Preview */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
          <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-zinc-700" />
              <span className="w-3 h-3 rounded-full bg-zinc-700" />
              <span className="w-3 h-3 rounded-full bg-zinc-700" />
            </div>
            <span className="text-xs text-zinc-500 ml-2">Email Preview</span>
          </div>
          <div className="flex justify-center p-6 bg-zinc-950">
            {loading ? (
              <div className="flex items-center justify-center h-[600px]">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <iframe
                srcDoc={html}
                title="Email digest preview"
                className="w-full max-w-[620px] min-h-[800px] bg-[#0a0a0a] border-0"
                sandbox="allow-same-origin"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
