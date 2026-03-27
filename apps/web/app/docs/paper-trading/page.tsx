import type { Metadata } from 'next';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Paper Trading',
  description: 'Risk-free trading simulation with TradeClaw — virtual portfolio, auto-follow signals, and performance stats.',
};

export default function PaperTradingPage() {
  const { prev, next } = getPrevNext('/docs/paper-trading');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Core Features</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Paper Trading</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          Practice trading with a $10,000 virtual portfolio. Follow signals automatically,
          track equity over time, and measure performance with professional metrics — all
          without risking real capital.
        </p>
      </div>

      {/* How it works */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">How It Works</h2>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Open positions', desc: 'Manually enter trades or enable auto-follow to mirror every signal.' },
            { step: '2', title: 'Track in real-time', desc: 'Open P&L updates with simulated price ticks. SL/TP triggers automatically.' },
            { step: '3', title: 'Measure performance', desc: 'Win rate, Sharpe ratio, max drawdown, profit factor — all calculated live.' },
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
    "size": 0.1,
    "stopLoss": 2280.00,
    "takeProfit": 2350.00
  }'`} />
        <CodeBlock language="json" filename="Response" code={`{
  "id": "pt_abc123",
  "symbol": "XAUUSD",
  "direction": "BUY",
  "size": 0.1,
  "entryPrice": 2315.40,
  "stopLoss": 2280.00,
  "takeProfit": 2350.00,
  "openedAt": "2026-03-27T10:00:00.000Z",
  "status": "open",
  "unrealizedPnl": 0
}`} />
      </section>

      {/* Auto-Follow */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Auto-Follow Signals</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          Enable auto-follow to automatically open a paper position for every new signal.
          The system uses the signal&apos;s recommended TP/SL levels.
        </p>
        <CodeBlock language="bash" code={`curl -X POST http://localhost:3000/api/paper-trading/follow-signal \\
  -H "Content-Type: application/json" \\
  -d '{
    "signalId": "XAUUSD-H1-BUY",
    "size": 0.1
  }'`} />
        <div className="mt-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <p className="text-sm text-blue-200">
            <strong>Tip:</strong> Use the toggle on the Paper Trading page&apos;s signal feed panel
            to enable auto-follow without writing code.
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
  -d '{ "id": "pt_abc123" }'`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">Close all positions</h3>
            <CodeBlock language="bash" code={`curl -X POST http://localhost:3000/api/paper-trading/close-all`} />
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
          The stats endpoint returns professional performance metrics:
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
          Paper trading data is stored in{' '}
          <code className="text-emerald-400 text-sm">data/paper-trading.json</code>. This includes
          account balance, open positions, and closed trade history. The file persists across
          restarts when using Docker volumes or running on disk.
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
            { method: 'POST', path: '/api/paper-trading/follow-signal', desc: 'Auto-follow a signal' },
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
