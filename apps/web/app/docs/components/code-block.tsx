'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export function CodeBlock({ code, language = 'bash', filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-xl border border-white/8 bg-[#0a0a0a] overflow-hidden">
      {(filename || language) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
          <span className="text-xs font-mono text-zinc-500">
            {filename ?? language}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      )}
      {!filename && !language && (
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors bg-[#0a0a0a] border border-white/8 rounded px-2 py-1"
        >
          {copied ? (
            <span className="text-emerald-400">Copied!</span>
          ) : (
            'Copy'
          )}
        </button>
      )}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className={`language-${language} text-zinc-300 font-mono`}>
          {code.trim()}
        </code>
      </pre>
    </div>
  );
}
