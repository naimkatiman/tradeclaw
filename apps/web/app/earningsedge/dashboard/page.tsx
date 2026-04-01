'use client';

import { useEffect, useState } from 'react';
import type { EarningsAnalysis } from '@/lib/earningsedge/analyze';
import Link from 'next/link';

const HISTORY_KEY = 'ee_analysis_history';

export default function EarningsEdgeDashboard() {
  const [history, setHistory] = useState<EarningsAnalysis[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored) as EarningsAnalysis[]);
      } catch {
        setHistory([]);
      }
    }
  }, []);

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Analysis History</h1>
          <p className="text-gray-400 text-sm">
            Your recent earnings analyses — stored locally on this device.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/earningsedge/analyze"
            className="bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            New Analysis
          </Link>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="border border-white/10 hover:border-white/20 text-gray-400 hover:text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📋</div>
          <div className="text-lg font-semibold mb-2">No analyses yet</div>
          <div className="text-sm mb-6">
            Analyze your first earnings call to see results here.
          </div>
          <Link
            href="/earningsedge/analyze"
            className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6 py-3 rounded-xl transition-colors inline-block"
          >
            Analyze a transcript →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((a, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{a.symbol}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        a.managementTone.overall === 'bullish'
                          ? 'bg-green-400/10 text-green-400 border-green-400/20'
                          : a.managementTone.overall === 'bearish'
                            ? 'bg-red-400/10 text-red-400 border-red-400/20'
                            : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                      }`}
                    >
                      {a.managementTone.overall}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm">{a.companyName}</div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(a.analyzedAt).toLocaleDateString()}
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-3 border-l-2 border-yellow-400/40 pl-3">
                {a.tradingThesis}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-green-400 font-medium mb-1">Top Bull</div>
                  <div className="text-xs text-gray-400">{a.bullCase[0]}</div>
                </div>
                <div>
                  <div className="text-xs text-red-400 font-medium mb-1">Top Bear</div>
                  <div className="text-xs text-gray-400">{a.bearCase[0]}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-5 flex items-center justify-between">
          <div>
            <div className="font-semibold mb-1">Want cloud-synced history?</div>
            <div className="text-sm text-gray-400">
              Upgrade to Pro to save analyses to your account from any device.
            </div>
          </div>
          <Link
            href="/earningsedge/pricing"
            className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Upgrade to Pro →
          </Link>
        </div>
      )}
    </main>
  );
}
