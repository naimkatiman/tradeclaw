import type { Metadata } from 'next';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Paper Trading',
  description: 'A virtual TradeClaw ledger that requires explicit observed entry and exit prices. Paper results are not broker fills or customer returns.',
};

export default function PaperTradingPage() {
  const { prev, next } = getPrevNext('/docs/paper-trading');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Core Features</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Paper Trading</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          Use a $10,000 virtual ledger to record simulated positions. Opens and closes require
          positive observed prices; missing prices stay unavailable instead of being estimated.
          Paper results are not broker fills, live execution, or customer portfolio returns.
        </p>
      </div>

      {/* How it works */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">How It Works</h2>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Open simulated positions', desc: 'The signed-in UI supplies the latest available provider price; the API requires an explicit observed entryPrice.' },
            { step: '2', title: 'Mark from provider prices', desc: 'Open P&L and SL/TP checks run only for symbols with an available provider price. Missing symbols are not estimated.' },
            { step: '3', title: 'Review the paper ledger', desc: 'Metrics are calculated from closed simulated trades and their supplied entry/exit observations.' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-4 p-4 rounded-xl border border-white/6 bg-white/[0.02]">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-emerald-400">{item.step}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                <p className="text-xs text-zinc-500 mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Opening a Position */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Opening a Position</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          Use the order form on the <code className="text-emerald-400 text-sm">/paper-trading</code> page,
          or call the API directly:
        </p>
        <CodeBlock language="bash" code={`curl -X POST http://localhost:3000/api/paper-trading/open \\
  -H "Content-Type: application/json" \\
  -d '{
    "symbol": "XAUUSD",
    "direction": "BUY",
    "quantity": 500,
    "entryPrice": 2315.40,
    "stopLoss": 2280.00,
    "takeProfit": 2350.00
  }'`} />
        <CodeBlock language="json" filename="Response" code={`{
  "position": {
    "id": "pos_abc123",
    "symbol": "XAUUSD",
    "direction": "BUY",
    "quantity": 500,
    "entryPrice": 2315.40,
    "stopLoss": 2280.00,
    "takeProfit": 2350.00,
    "openedAt": "2026-07-15T10:00:00.000Z"
  },
  "balance": 10000
}`} />
      </section>

      {/* Auto-Follow */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Follow One Signal Candidate</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          The follow endpoint records one explicitly supplied signal candidate in the virtual ledger.
          It requires the candidate&apos;s observed entry and rule-derived TP/SL fields; it does not
          subscribe the server to every future signal.
        </p>
        <CodeBlock language="bash" code={`curl -X POST http://localhost:3000/api/paper-trading/follow-signal \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "XAUUSD-H1-BUY",
    "symbol": "XAUUSD",
    "direction": "BUY",
    "entry": 2315.40,
    "stopLoss": 2280.00,
    "takeProfit": 2350.00,
    "positionSizePct": 0.05
  }'`} />
        <div className="mt-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <p className="text-sm text-blue-200">
            <strong>Note:</strong> The page can follow candidates currently loaded in its signal panel.
            That browser action is not a durable server-side subscription.
          </p>
        </div>
      </section>

      {/* Closing Positions */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Closing Positions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">Close a single position</h3>
            <CodeBlock language="bash" code={`curl -X POST http://localhost:3000/api/paper-trading/close \\
  -H "Content-Type: application/json" \\
  -d '{ "positionId": "pt_abc123", "exitPrice": 2328.10 }'`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">Close all positions</h3>
            <CodeBlock language="bash" code={`curl -X POST http://localhost:3000/api/paper-trading/close-all \
  -H "Content-Type: application/json" \
  -d '{ "prices": { "XAUUSD": 2328.10, "BTCUSD": 70000 } }'`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">Reset portfolio</h3>
            <CodeBlock language="bash" code={`# Resets balance to $10,000 and clears all history
curl -X POST http://localhost:3000/api/paper-trading/reset`} />
          </div>
        </div>
      </section>

      {/* Performance Metrics */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Performance Metrics</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          The stats endpoint returns metrics calculated from the signed-in user&apos;s closed paper trades:
        </p>
        <CodeBlock language="bash" code={`curl http://localhost:3000/api/paper-trading/stats`} />
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Win Rate', desc: 'Percentage of profitable closed trades' },
            { label: 'Sharpe Ratio', desc: 'Risk-adjusted return (annualized)' },
            { label: 'Max Drawdown', desc: 'Largest peak-to-trough decline' },
            { label: 'Profit Factor', desc: 'Gross profit / gross loss ratio' },
            { label: 'Total Return', desc: 'Portfolio gain/loss from $10,000' },
            { label: 'Avg Win', desc: 'Average profit on winning trades' },
            { label: 'Avg Loss', desc: 'Average loss on losing trades' },
            { label: 'Open Positions', desc: 'Currently active trades' },
          ].map(m => (
            <div key={m.label} className="p-3 rounded-lg border border-white/6 bg-white/[0.02]">
              <p className="text-xs font-medium text-emerald-400">{m.label}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data Storage */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Data Storage</h2>
        <p className="text-zinc-400 leading-relaxed">
          Paper trading data is stored in PostgreSQL tables scoped to the signed-in user. The ledger
          includes the virtual balance, open simulated positions, observed entry/exit prices, and closed
          trade history. API requests require a valid TradeClaw session.
        </p>
      </section>

      {/* API Reference */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">API Reference</h2>
        <div className="space-y-2">
          {[
            { method: 'GET', path: '/api/paper-trading', desc: 'Get portfolio state (balance, positions, history)' },
            { method: 'POST', path: '/api/paper-trading/open', desc: 'Open a new position' },
            { method: 'POST', path: '/api/paper-trading/close', desc: 'Close a specific position' },
            { method: 'POST', path: '/api/paper-trading/close-all', desc: 'Close all open positions' },
            { method: 'POST', path: '/api/paper-trading/reset', desc: 'Reset portfolio to $10,000' },
            { method: 'POST', path: '/api/paper-trading/follow-signal', desc: 'Record one supplied signal candidate' },
            { method: 'GET', path: '/api/paper-trading/stats', desc: 'Get performance statistics' },
          ].map(ep => (
            <div key={ep.path} className="flex items-center gap-3 p-3 rounded-lg border border-white/6 bg-white/[0.02]">
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                ep.method === 'GET' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'
              }`}>{ep.method}</span>
              <code className="text-sm text-zinc-300 font-mono">{ep.path}</code>
              <span className="text-xs text-zinc-500 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/paper-trading/page.tsx" />
    </article>
  );
}
