import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How TradeClaw Scores Trading Signals | TradeClaw Blog',
  description: 'Full walkthrough of the TradeClaw signal scoring algorithm — 5 indicator weights, quality gates, confidence calibration, and the math behind every signal.',
  openGraph: {
    title: 'How TradeClaw Scores Trading Signals: A Full Walkthrough',
    description: 'The exact algorithm behind TradeClaw signals — indicator weights, quality gates, confidence calibration.',
  },
  keywords: ['trading signal algorithm', 'signal scoring', 'open source trading', 'confidence score', 'MACD RSI EMA scoring'],
};

export default function HowWeScoreSignalsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 md:pb-8">
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/blog" className="text-xs text-zinc-400 hover:text-white transition-colors">← Blog</Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex gap-2 mb-4">
          {['Algorithm', 'Signal Scoring', 'Open Source'].map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{tag}</span>
          ))}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
          How TradeClaw Scores Trading Signals: A Full Walkthrough
        </h1>

        <div className="text-sm text-zinc-400 mb-8">March 22, 2026 · 12 min read</div>

        <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-sm leading-7">

          <p className="text-base text-zinc-300">
            Most AI trading signal tools are black boxes — you get a &quot;BUY&quot; label and a confidence percentage, with no explanation of how it was computed. TradeClaw is different: the entire scoring engine is open source, and this post walks through exactly how every signal gets generated.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">The Big Picture: A Points System</h2>
          <p className="text-zinc-300">
            TradeClaw uses a simple, deterministic points system. Every signal is scored by running 5 technical indicators and awarding points based on what each indicator shows. The total is normalised to a confidence percentage.
          </p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-4 py-2 text-left font-normal">Indicator</th>
                  <th className="px-4 py-2 text-right font-normal">Max Points</th>
                  <th className="px-4 py-2 text-left font-normal">What It Measures</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {[
                  ['RSI (14)', '20', 'Overbought / oversold momentum'],
                  ['MACD (12/26/9)', '25', 'Trend direction & momentum change'],
                  ['EMA (20/50/200)', '20', 'Price vs moving average alignment'],
                  ['Stochastic (14/3/3)', '15', 'K/D position and crossover'],
                  ['Bollinger Bands (20, 2σ)', '10', 'Price at extremes of volatility range'],
                  ['Total', '90', '→ Scaled to 48–95% confidence'],
                ].map(([ind, pts, desc]) => (
                  <tr key={ind} className={`border-b border-zinc-800/50 ${ind === 'Total' ? 'bg-zinc-800/30 font-semibold' : ''}`}>
                    <td className="px-4 py-2 font-mono">{ind}</td>
                    <td className="px-4 py-2 text-right text-emerald-400">{pts}</td>
                    <td className="px-4 py-2 text-zinc-400">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">Step 1: Compute Both Directions</h2>
          <p className="text-zinc-300">
            For every asset and timeframe, TradeClaw computes a BUY score <em>and</em> a SELL score independently. Whichever score is higher and exceeds the minimum threshold (58% confidence) becomes the signal. Signals between 55–57% appear on the watchlist only. If neither exceeds 55%, no signal is emitted — &quot;no opinion&quot; is a valid output.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">Step 2: Quality Gates (Filters)</h2>
          <p className="text-zinc-300">Before a signal is emitted, it must pass 4 quality checks:</p>
          <ul className="space-y-2 text-zinc-400 list-disc list-inside">
            <li><strong className="text-white">ATR check:</strong> Average True Range must be &gt; 0.3% of price. Signals in flat/dead markets are filtered out.</li>
            <li><strong className="text-white">Bollinger bandwidth:</strong> Must be &gt; 1%. Consolidating markets produce false signals.</li>
            <li><strong className="text-white">EMA slope:</strong> At least one EMA must have non-zero slope. Zero-slope = no trend = noise.</li>
            <li><strong className="text-white">Stop distance:</strong> SL must be &gt; 0.5% from entry. Tight stops get triggered by normal noise and produce misleading results.</li>
          </ul>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">Step 3: Confidence Normalisation</h2>
          <p className="text-zinc-300">
            Raw score (0–90) → confidence (50–98%). The formula:
          </p>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 font-mono text-sm text-zinc-300">
            confidence = min(95, max(48, round(42 + rawScore × 0.62)))
          </div>
          <p className="text-zinc-400">
            Why cap at 95%? No deterministic indicator combination can justify 100% certainty. The floor of 48% prevents meaninglessly low scores from cluttering the output.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">Is It Actually Calibrated?</h2>
          <p className="text-zinc-300">
            Good calibration means: signals at 80% confidence should win ~80% of the time. We track this on the <Link href="/calibration" className="text-emerald-400 hover:underline">calibration page</Link> using Expected Calibration Error (ECE). The honest answer: with synthetic seed data, calibration is not yet validated. As live signals accumulate, that page will reflect real performance.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">Multi-Timeframe Confluence</h2>
          <p className="text-zinc-300">
            TradeClaw also generates signals across H1, H4, and D1 timeframes and checks for confluence. When all three timeframes agree, confidence gets a +15% boost. When they disagree, confidence is reduced and the signal is flagged as &quot;conflicted.&quot;
          </p>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">Limitations We&apos;re Honest About</h2>
          <ul className="space-y-2 text-zinc-400 list-disc list-inside">
            <li>All indicators are <strong className="text-white">lagging</strong> — they react to price, they don&apos;t predict it</li>
            <li>Crypto and forex have <strong className="text-white">different characteristics</strong> — RSI(14) behaves differently on 1-hour BTC vs daily EUR/USD</li>
            <li>The scoring weights are <strong className="text-white">manually tuned</strong>, not machine-learned from backtested data (yet)</li>
            <li>No fundamental analysis, news, or macro factors are considered</li>
          </ul>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 mt-6">
            <p className="text-zinc-300 text-sm">
              <strong className="text-white">The algorithm is 100% open source.</strong> If you think the weights are wrong, the quality gates are too loose, or the indicators should be different — submit a PR. That&apos;s the whole point.
            </p>
            <a href="https://github.com/naimkatiman/tradeclaw" className="text-emerald-400 hover:underline text-sm mt-2 inline-block" target="_blank" rel="noreferrer">
              View source on GitHub →
            </a>
          </div>

          <div className="border-t border-zinc-800 pt-6 mt-8">
            <p className="text-zinc-400 text-xs">
              <Link href="/how-it-works" className="text-emerald-400 hover:underline">Full technical walkthrough with code</Link>
              {' '}· <Link href="/calibration" className="text-emerald-400 hover:underline">Calibration stats</Link>
              {' '}· <Link href="/accuracy" className="text-emerald-400 hover:underline">Accuracy history</Link>
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
