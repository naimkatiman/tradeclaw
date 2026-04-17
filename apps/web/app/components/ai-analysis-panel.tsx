'use client';

import React, { useState, useCallback, useRef } from 'react';
import { fetchWithLicense } from '@/lib/license-client';

interface AIAnalysisPanelProps {
  symbol: string;
  timeframe: string;
  signalId?: string;
}

// Simple markdown-to-JSX renderer for our structured output
function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const elements: React.ReactElement[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableKey = 0;
  let blockquote: string[] = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    const headers = tableRows[0];
    const body = tableRows.slice(2); // skip separator
    elements.push(
      <div key={`t-${tableKey++}`} className="overflow-x-auto my-3">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-white/10">
              {headers.map((h, i) => (
                <th key={i} className="text-left py-1.5 px-2 text-zinc-500 font-medium text-[10px] uppercase tracking-wider">
                  {renderInline(h.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-b border-white/[0.03]">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-1.5 px-2 text-zinc-300 tabular-nums">
                    {renderInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  }

  function flushBlockquote() {
    if (blockquote.length === 0) return;
    elements.push(
      <div key={`bq-${elements.length}`} className="my-3 pl-3 border-l-2 border-emerald-500/30 bg-emerald-500/[0.03] rounded-r-lg py-2 pr-3">
        <p className="text-xs text-zinc-300 leading-relaxed">{renderInline(blockquote.join(' '))}</p>
      </div>
    );
    blockquote = [];
  }

  function renderInline(text: string): (string | React.ReactElement)[] {
    const parts: (string | React.ReactElement)[] = [];
    let remaining = text;
    let ki = 0;

    while (remaining.length > 0) {
      // Bold
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
        parts.push(<strong key={`b-${ki++}`} className="text-white font-semibold">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }
      parts.push(remaining);
      break;
    }
    return parts;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table detection
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        flushBlockquote();
        inTable = true;
      }
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      // Skip separator rows
      if (cells.every(c => /^[\s-:]+$/.test(c))) {
        tableRows.push(cells);
        continue;
      }
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blockquote.push(line.slice(2));
      continue;
    } else if (blockquote.length > 0) {
      flushBlockquote();
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-white/[0.06]" />);
      continue;
    }

    // H2 — section headers
    if (line.startsWith('## ')) {
      // Skip the first heading (summary) — handled by the panel header
      if (elements.length === 0) continue;
      elements.push(
        <h2 key={`h2-${i}`} className="text-base font-semibold text-white mt-6 mb-2">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }

    // H3 — subsection headers with icons
    if (line.startsWith('### ')) {
      const text = line.slice(4);
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-semibold text-white mt-5 mb-2 flex items-center gap-2">
          {renderInline(text)}
        </h3>
      );
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-2 my-1 pl-1">
          <span className="text-zinc-600 text-xs font-mono shrink-0">{numMatch[1]}.</span>
          <p className="text-xs text-zinc-400 leading-relaxed">{renderInline(numMatch[2])}</p>
        </div>
      );
      continue;
    }

    // Checkmark / warning items
    if (line.startsWith('✅') || line.startsWith('⚠️')) {
      elements.push(
        <p key={`ck-${i}`} className="text-xs text-zinc-400 leading-relaxed my-1">
          {renderInline(line)}
        </p>
      );
      continue;
    }

    // Italic / footer
    if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      elements.push(
        <p key={`em-${i}`} className="text-[10px] text-zinc-700 mt-4 font-mono">
          {line.replace(/^\*|\*$/g, '')}
        </p>
      );
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-zinc-400 leading-relaxed my-1.5">
        {renderInline(line)}
      </p>
    );
  }

  // Flush remaining
  if (inTable) flushTable();
  if (blockquote.length > 0) flushBlockquote();

  return elements;
}

export function AIAnalysisPanel({ symbol, timeframe }: AIAnalysisPanelProps) {
  const [markdown, setMarkdown] = useState('');
  const [summary, setSummary] = useState('');
  const [confluenceScore, setConfluenceScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (markdown) {
      setOpen(v => !v);
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetchWithLicense('/api/explain', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symbol, timeframe }),
      });
      const data = await res.json();
      if (data.error) {
        setMarkdown(`> Warning: ${data.error}`);
      } else {
        setMarkdown(data.markdown || '');
        setSummary(data.summary || '');
        setConfluenceScore(data.confluenceScore ?? 0);
      }
    } catch {
      setMarkdown('> Warning: Failed to load analysis. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [markdown, symbol, timeframe]);

  const copyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [markdown]);

  const shareAnalysis = useCallback(() => {
    const url = `${window.location.origin}/signal/${symbol}-${timeframe}-BUY`;
    if (navigator.share) {
      navigator.share({ title: summary, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
    }
  }, [symbol, timeframe, summary]);

  return (
    <div className="glass-card rounded-2xl overflow-hidden mt-3">
      {/* Toggle header */}
      <button
        onClick={load}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-white">AI Signal Analysis</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">
              {markdown ? `${confluenceScore}/5 confluence · Click to ${open ? 'collapse' : 'expand'}` : 'Generate detailed analysis for this signal'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {markdown && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              confluenceScore >= 4 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/15'
              : confluenceScore >= 3 ? 'text-zinc-400 bg-zinc-500/10 border border-zinc-500/15'
              : 'text-red-400 bg-red-500/10 border border-red-500/15'
            }`}>
              {confluenceScore}/5
            </span>
          )}
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-zinc-600 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* Content */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          open ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5 border-t border-white/5">
          {loading ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="w-4 h-4 border-2 border-zinc-800 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-xs text-zinc-600">Generating analysis...</span>
            </div>
          ) : (
            <>
              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-4 pb-2">
                <button
                  onClick={copyMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:border-white/10 transition-all"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  {copied ? 'Copied!' : 'Copy Analysis'}
                </button>
                <button
                  onClick={shareAnalysis}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:border-white/10 transition-all"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
                  </svg>
                  Share
                </button>
              </div>

              {/* Rendered markdown */}
              <div ref={contentRef} className="prose-invert max-w-none">
                {renderMarkdown(markdown)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
