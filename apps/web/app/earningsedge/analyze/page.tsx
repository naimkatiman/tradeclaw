'use client';

import { useState, useEffect } from 'react';
import type { EarningsAnalysis } from '@/lib/earningsedge/analyze';

const FREE_LIMIT = 3;
const STORAGE_KEY = 'ee_usage_count';
const HISTORY_KEY = 'ee_analysis_history';

function getUsageCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
}

function incrementUsage(): number {
  const count = getUsageCount() + 1;
  localStorage.setItem(STORAGE_KEY, String(count));
  return count;
}

function saveToHistory(analysis: EarningsAnalysis) {
  if (typeof window === 'undefined') return;
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as EarningsAnalysis[];
  history.unshift(analysis);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
}

function ToneChip({ tone }: { tone: string }) {
  const colors: Record<string, string> = {
    bullish: 'bg-green-400/10 text-green-400 border-green-400/20',
    neutral: 'bg-zinc-400/10 text-zinc-400 border-zinc-400/20',
    bearish: 'bg-red-400/10 text-red-400 border-red-400/20',
  };
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${colors[tone] || colors.neutral}`}
    >
      {tone}
    </span>
  );
}

export default function AnalyzePage() {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<EarningsAnalysis | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    const count = getUsageCount();
    setUsageCount(count);
    setLimitReached(count >= FREE_LIMIT);
  }, []);

  async function handleAnalyze() {
    if (!transcript.trim()) {
      setError('Please paste an earnings call transcript.');
      return;
    }

    if (limitReached) {
      setError('You have used all 3 free analyses. Upgrade for unlimited access.');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const res = await fetch('/api/earningsedge/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ee-usage-count': String(usageCount),
        },
        body: JSON.stringify({ transcript }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'FREE_LIMIT_REACHED') {
          setLimitReached(true);
          setError('Free limit reached. Upgrade for unlimited access.');
        } else {
          setError(data.error || 'Analysis failed. Please try again.');
        }
        return;
      }

      const newCount = incrementUsage();
      setUsageCount(newCount);
      setLimitReached(newCount >= FREE_LIMIT);
      setAnalysis(data.analysis);
      saveToHistory(data.analysis);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analyze Earnings Call</h1>
        <p className="text-gray-400">
          Paste a full earnings call transcript to get AI-powered trading insights.
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {limitReached ? (
            <span className="text-red-400">
              Free limit reached ({FREE_LIMIT}/{FREE_LIMIT}) —{' '}
              <a href="/earningsedge/pricing" className="underline hover:text-red-300">
                upgrade for unlimited
              </a>
            </span>
          ) : (
            <span className="text-gray-500">
              {FREE_LIMIT - usageCount} free{' '}
              {FREE_LIMIT - usageCount === 1 ? 'analysis' : 'analyses'} remaining
            </span>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Earnings Call Transcript
        </label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste the full earnings call transcript here...&#10;&#10;(Tip: find transcripts on Seeking Alpha, the company's IR page, or financialmodelingprep.com)"
          rows={14}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-400/50 resize-y font-mono"
          disabled={loading || limitReached}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-600">
          <span>{transcript.length.toLocaleString()} characters</span>
          <span>Recommended: 2,000–80,000 characters</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
          {limitReached && (
            <a
              href="/earningsedge/pricing"
              className="ml-2 underline hover:text-red-300 font-semibold"
            >
              Upgrade →
            </a>
          )}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={loading || limitReached || !transcript.trim()}
        className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-4 rounded-xl transition-colors text-lg mb-12"
      >
        {loading ? 'Analyzing...' : limitReached ? 'Upgrade to Analyze' : 'Analyze Transcript'}
      </button>

      {/* Results */}
      {analysis && <AnalysisResult analysis={analysis} />}

      {limitReached && !analysis && (
        <div className="text-center bg-gradient-to-r from-green-400/10 to-emerald-400/5 border border-green-400/20 rounded-2xl p-10">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold mb-2">You&apos;ve used your 3 free analyses</h2>
          <p className="text-gray-400 mb-6">
            Upgrade for unlimited analyses, history, and more.
          </p>
          <a
            href="/earningsedge/pricing"
            className="bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-3 rounded-xl transition-colors inline-block"
          >
            See pricing — from $29/month →
          </a>
        </div>
      )}
    </main>
  );
}

function AnalysisResult({ analysis }: { analysis: EarningsAnalysis }) {
  const [copied, setCopied] = useState(false);

  function copyThesis() {
    navigator.clipboard.writeText(analysis.tradingThesis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{analysis.symbol}</h2>
            <ToneChip tone={analysis.managementTone.overall} />
            <span
              className={`text-xs px-2 py-1 rounded border ${
                analysis.confidence === 'high'
                  ? 'bg-green-400/10 text-green-400 border-green-400/20'
                  : analysis.confidence === 'medium'
                    ? 'bg-zinc-400/10 text-zinc-400 border-zinc-400/20'
                    : 'bg-gray-400/10 text-gray-400 border-gray-400/20'
              }`}
            >
              {analysis.confidence} confidence
            </span>
          </div>
          <div className="text-gray-400 text-sm mt-1">{analysis.companyName}</div>
        </div>
        <div className="text-xs text-gray-500">
          {new Date(analysis.analyzedAt).toLocaleString()}
        </div>
      </div>

      {/* Trade Thesis */}
      <div className="bg-zinc-400/5 border border-zinc-400/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-zinc-400 font-semibold flex items-center gap-2">
            <span>⚡</span> Trade Thesis
          </div>
          <button
            onClick={copyThesis}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-white">{analysis.tradingThesis}</p>
      </div>

      {/* Bull / Bear */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-400/5 border border-green-400/20 rounded-xl p-5">
          <div className="text-green-400 font-semibold mb-3 flex items-center gap-2">
            <span>📈</span> Bull Case
          </div>
          <ul className="space-y-2">
            {analysis.bullCase.map((point, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-5">
          <div className="text-red-400 font-semibold mb-3 flex items-center gap-2">
            <span>📉</span> Bear Case
          </div>
          <ul className="space-y-2">
            {analysis.bearCase.map((point, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Key Metrics */}
      {analysis.keyMetrics.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="font-semibold mb-4 flex items-center gap-2">
            <span>📊</span> Key Metrics
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase">
                  <th className="text-left pb-2">Metric</th>
                  <th className="text-right pb-2">Reported</th>
                  <th className="text-right pb-2">Expected</th>
                  <th className="text-right pb-2">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {analysis.keyMetrics.map((m, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-300">{m.name}</td>
                    <td className="py-2 text-right font-mono">{m.reported}</td>
                    <td className="py-2 text-right font-mono text-gray-500">
                      {m.expected || '—'}
                    </td>
                    <td className="py-2 text-right">
                      {m.beat === true ? (
                        <span className="text-green-400 font-semibold">✓ Beat</span>
                      ) : m.beat === false ? (
                        <span className="text-red-400 font-semibold">✗ Missed</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Management Tone */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="font-semibold mb-4 flex items-center gap-2">
          <span>🎙️</span> Management Tone
        </div>
        <div className="flex items-center gap-4 mb-3">
          <ToneChip tone={analysis.managementTone.overall} />
          <span className="text-sm text-gray-400">
            Confidence: {analysis.managementTone.confidence}
          </span>
        </div>
        <p className="text-sm text-gray-300 mb-3 italic">
          &quot;{analysis.managementTone.forwardGuidance}&quot;
        </p>
        <div className="space-y-1">
          {analysis.managementTone.keySignals.map((signal, i) => (
            <div key={i} className="text-sm text-gray-400 flex gap-2">
              <span>•</span>
              <span>{signal}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade prompt for non-subscribers */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center justify-between">
        <div>
          <div className="font-semibold mb-1">Save your analysis history</div>
          <div className="text-sm text-gray-400">
            Upgrade to Pro to access all past analyses and export them.
          </div>
        </div>
        <a
          href="/earningsedge/pricing"
          className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          Upgrade →
        </a>
      </div>
    </div>
  );
}
