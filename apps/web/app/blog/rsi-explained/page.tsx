import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RSI Explained: The Math Behind the Most Popular Trading Indicator | TradeClaw',
  description: "Relative Strength Index explained from first principles — Wilder's formula, TypeScript implementation, overbought/oversold zones, and how TradeClaw uses RSI in signal scoring.",
  openGraph: {
    title: 'RSI Explained: The Math Behind the Most Popular Trading Indicator',
    description: "Complete breakdown of RSI — the formula, implementation, and how it's used in real trading signal generation.",
  },
  keywords: ['RSI indicator', 'relative strength index explained', 'RSI formula', 'Wilder RSI', 'RSI TypeScript', 'trading signals'],
};

export default function RSIExplainedPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 md:pb-8">
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/blog" className="text-xs text-zinc-400 hover:text-white transition-colors">← Blog</Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex gap-2 mb-4">
          {['RSI', 'Technical Analysis', 'Indicators'].map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{tag}</span>
          ))}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
          RSI Explained: The Math Behind the Most Popular Trading Indicator
        </h1>

        <div className="text-sm text-zinc-400 mb-8">March 20, 2026 · 8 min read</div>

        <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-sm leading-7">

          <p className="text-base text-zinc-300">
            RSI (Relative Strength Index) appears on the screen of virtually every trader. Created by J. Welles Wilder Jr. in 1978, it's one of the oldest and most used technical indicators. But most traders use it as a magic number — "below 30 = buy, above 70 = sell" — without understanding the math behind it.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">What RSI Actually Measures</h2>
          <p className="text-zinc-300">
            RSI measures the <strong className="text-white">speed and magnitude of price changes</strong>. It compares the average gains on up-days to average losses on down-days over a rolling window (default: 14 periods). The result is a number between 0 and 100.
          </p>
          <ul className="space-y-1 text-zinc-400 list-disc list-inside">
            <li><strong className="text-white">RSI above 70</strong> — asset has been rising hard, may be overbought</li>
            <li><strong className="text-white">RSI below 30</strong> — asset has been falling hard, may be oversold</li>
            <li><strong className="text-white">RSI at 50</strong> — equal gains and losses, neutral momentum</li>
          </ul>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">The Formula</h2>
          <p className="text-zinc-300">Wilder's formula in three steps:</p>

          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 font-mono text-sm space-y-2 text-zinc-300">
            <div><span className="text-zinc-500">Step 1:</span> RS = Average Gain(n) / Average Loss(n)</div>
            <div><span className="text-zinc-500">Step 2:</span> RSI = 100 − (100 / (1 + RS))</div>
            <div><span className="text-zinc-500">Smoothing:</span> AvgGain = (prevAvgGain × (n−1) + currentGain) / n</div>
          </div>

          <p className="text-zinc-400">Where <code className="text-emerald-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">n = 14</code> by default (Wilder's original choice).</p>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">TypeScript Implementation (from TradeClaw)</h2>
          <p className="text-zinc-300">Here's the exact implementation we use — no third-party TA library, just math:</p>

          <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-zinc-800 border-b border-zinc-700 text-xs text-zinc-400 font-mono">apps/web/app/lib/ta-engine.ts</div>
            <pre className="p-4 text-xs text-zinc-300 overflow-x-auto leading-relaxed">{`function calculateRSI(closes: number[], period = 14) {
  const result = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;

  let gains = 0, losses = 0;

  // Initial average: simple mean of first period
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  // Wilder's smoothing for all subsequent values
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, delta)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -delta)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }

  return result;
}`}</pre>
          </div>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">How TradeClaw Uses RSI in Signal Scoring</h2>
          <p className="text-zinc-300">RSI contributes up to 20 points in TradeClaw's 90-point signal scoring system:</p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-4 py-2 text-left font-normal">RSI Value</th>
                  <th className="px-4 py-2 text-left font-normal">BUY score</th>
                  <th className="px-4 py-2 text-left font-normal">SELL score</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {[
                  ['< 30 (Oversold)', '+20 pts', '−10 pts'],
                  ['30–40', '+15 pts', '+0 pts'],
                  ['40–50', '+8 pts', '+0 pts'],
                  ['50–60', '+0 pts', '+8 pts'],
                  ['60–70', '+0 pts', '+15 pts'],
                  ['> 70 (Overbought)', '−10 pts', '+20 pts'],
                ].map(([range, buy, sell]) => (
                  <tr key={range} className="border-b border-zinc-800/50">
                    <td className="px-4 py-2 font-mono">{range}</td>
                    <td className={`px-4 py-2 ${buy.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{buy}</td>
                    <td className={`px-4 py-2 ${sell.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{sell}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">RSI Limitations</h2>
          <p className="text-zinc-300">RSI alone isn't enough. These are its known weaknesses:</p>
          <ul className="space-y-2 text-zinc-400 list-disc list-inside">
            <li><strong className="text-white">Trending markets</strong> — in a strong uptrend, RSI can stay above 70 for weeks. "Overbought" can mean "strong trend" not "reversal."</li>
            <li><strong className="text-white">Period sensitivity</strong> — RSI(14) behaves very differently from RSI(5) or RSI(30). Shorter = more signals, more noise.</li>
            <li><strong className="text-white">No price level context</strong> — RSI tells you about momentum, not whether the price is at a key level.</li>
          </ul>
          <p className="text-zinc-300">That's why TradeClaw combines RSI with MACD, EMA trend, Bollinger Bands, and Stochastic before emitting any signal. See the <Link href="/how-it-works" className="text-emerald-400 hover:underline">full scoring algorithm</Link> for details.</p>

          <div className="border-t border-zinc-800 pt-6 mt-8">
            <p className="text-zinc-400 text-xs">
              The TradeClaw signal engine is fully open source.{' '}
              <a href="https://github.com/naimkatiman/tradeclaw" className="text-emerald-400 hover:underline" target="_blank" rel="noreferrer">View on GitHub</a>
              {' '}· <Link href="/calibration" className="text-emerald-400 hover:underline">See calibration data</Link>
              {' '}· <Link href="/accuracy" className="text-emerald-400 hover:underline">See accuracy stats</Link>
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
