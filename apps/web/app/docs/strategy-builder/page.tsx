import type { Metadata } from 'next';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Strategy Builder',
  description: 'Visual drag-and-drop indicator composer for TradeClaw — create, export, and backtest custom strategies.',
};

export default function StrategyBuilderPage() {
  const { prev, next } = getPrevNext('/docs/strategy-builder');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Core Features</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Strategy Builder</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          Build trading strategies visually using IF/THEN logic blocks. Combine indicators like
          RSI, MACD, EMA, and Bollinger Bands — then export as JSON, save to your library,
          or run directly against the backtester.
        </p>
      </div>

      {/* Concepts */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">How Strategies Work</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          A strategy is a set of <strong className="text-zinc-200">conditions</strong> (IF blocks)
          that, when all met, trigger an <strong className="text-zinc-200">action</strong> (THEN block).
          The builder gives you a visual interface, but under the hood each strategy is a JSON document
          you can export, share, and import.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: 'IF Blocks (Conditions)', desc: 'Indicator checks: RSI above 70, MACD histogram positive, price above EMA20, etc.', color: 'blue' },
            { title: 'THEN Blocks (Actions)', desc: 'What happens when conditions are met: BUY, SELL, or custom signal generation.', color: 'emerald' },
            { title: 'Operators', desc: 'Combine conditions with AND (all must be true) or OR (any can be true).', color: 'amber' },
            { title: 'Parameters', desc: 'Each indicator has configurable periods, thresholds, and timeframes.', color: 'purple' },
          ].map(item => (
            <div key={item.title} className="p-4 rounded-xl border border-white/6 bg-white/[0.02]">
              <p className="text-sm font-medium text-zinc-200">{item.title}</p>
              <p className="text-xs text-zinc-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Available Indicators */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Available Indicators</h2>
        <div className="space-y-2">
          {[
            { name: 'RSI', params: 'period (default: 14), overbought (70), oversold (30)', ops: 'above, below, crosses above, crosses below' },
            { name: 'MACD', params: 'fast (12), slow (26), signal (9)', ops: 'histogram positive/negative, signal cross, divergence' },
            { name: 'EMA', params: 'short period (20), long period (50)', ops: 'price above/below, golden cross, death cross' },
            { name: 'Bollinger Bands', params: 'period (20), stdDev (2)', ops: 'price above upper, below lower, squeeze' },
            { name: 'Stochastic', params: 'k (14), d (3), smooth (3)', ops: 'above/below levels, %K crosses %D' },
          ].map(ind => (
            <div key={ind.name} className="p-4 rounded-xl border border-white/6 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-emerald-400">{ind.name}</span>
              </div>
              <p className="text-xs text-zinc-500"><strong className="text-zinc-400">Params:</strong> {ind.params}</p>
              <p className="text-xs text-zinc-500"><strong className="text-zinc-400">Operations:</strong> {ind.ops}</p>
            </div>
          ))}
        </div>
      </section>

      {/* JSON Format */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Strategy JSON Format</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          Strategies are portable JSON documents. Export from the builder, share with teammates,
          or create programmatically:
        </p>
        <CodeBlock language="json" filename="golden-cross-strategy.json" code={`{
  "name": "Golden Cross RSI Filter",
  "version": 1,
  "blocks": [
    {
      "type": "IF",
      "indicator": "EMA",
      "condition": "golden_cross",
      "params": { "shortPeriod": 20, "longPeriod": 50 }
    },
    {
      "type": "IF",
      "indicator": "RSI",
      "condition": "below",
      "value": 70,
      "params": { "period": 14 }
    },
    {
      "type": "THEN",
      "action": "BUY",
      "confidence_boost": 15
    }
  ]
}`} />
      </section>

      {/* Export / Import */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Export &amp; Import</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">Export</h3>
            <p className="text-zinc-400 leading-relaxed">
              Click the <strong className="text-zinc-200">Export JSON</strong> button in the strategy
              builder to download the strategy as a <code className="text-emerald-400 text-sm">.json</code> file.
              The file includes all blocks, parameters, and metadata.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">Import</h3>
            <p className="text-zinc-400 leading-relaxed">
              Click <strong className="text-zinc-200">Import</strong> and select a{' '}
              <code className="text-emerald-400 text-sm">.json</code> file. The builder validates the
              file structure and loads the strategy into the canvas.
            </p>
          </div>
        </div>
      </section>

      {/* Backtest Integration */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Backtest Integration</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          Click <strong className="text-zinc-200">Run Backtest</strong> in the strategy builder to
          send the strategy to the backtester. The strategy is base64-encoded in the URL parameter —
          the backtest page auto-loads and runs it with historical data.
        </p>
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-sm text-emerald-200">
            <strong>Validation:</strong> The builder requires at least one IF block and one THEN block
            before you can save, export, or run a backtest. This prevents empty strategies from
            wasting compute.
          </p>
        </div>
      </section>

      {/* My Strategies Library */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">My Strategies Library</h2>
        <p className="text-zinc-400 leading-relaxed">
          Strategies are saved to <code className="text-emerald-400 text-sm">localStorage</code> in
          the browser. Click any saved strategy to reload it into the builder. The library stores
          up to 20 strategies — delete old ones by hovering and clicking the trash icon.
        </p>
      </section>

      {/* API */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Strategies API</h2>
        <CodeBlock language="bash" code={`# List saved strategies (server-side)
curl http://localhost:3000/api/strategies

# Validate a strategy
curl -X POST http://localhost:3000/api/strategies \\
  -H "Content-Type: application/json" \\
  -d @golden-cross-strategy.json`} />
      </section>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/strategy-builder/page.tsx" />
    </article>
  );
}
