import type { Metadata } from 'next';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Plugins',
  description: 'Write custom JavaScript indicator modules for TradeClaw — plugin API, sandboxed execution, built-in plugins, and a Williams %R example.',
};

export default function PluginsPage() {
  const { prev, next } = getPrevNext('/docs/plugins');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Integrations</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Plugins</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          The plugin system lets you extend TradeClaw with custom technical indicators
          written in plain JavaScript. Each plugin is a single function that receives
          OHLCV candles and returns a signal value — no build step, no dependencies.
        </p>
      </div>

      {/* Plugin interface */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Plugin Interface</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          A plugin is a JavaScript function assigned to{' '}
          <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">module.exports</code>.
          It receives an array of candles and an optional parameters object, and must return
          a <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">PluginResult</code>.
        </p>
        <CodeBlock
          language="typescript"
          code={`// Candle shape passed to every plugin
interface Candle {
  time: number;    // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Return type — all fields required
interface PluginResult {
  value: number;          // Numeric indicator value
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  strength: number;       // 0–100, feeds into confluence score
  label: string;          // Short human-readable label, e.g. "Williams %R: -23"
}

// Your plugin exports a single function
module.exports = function(candles: Candle[], params: Record<string, number>): PluginResult {
  // … your indicator logic
  return { value, signal, strength, label };
};`}
        />
      </section>

      {/* Sandboxed execution */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Sandboxed Execution</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          Plugin code runs inside a V8 isolate with a 500ms CPU budget. Network calls,
          file system access, and <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">require()</code> calls
          to external modules are blocked. Only pure computation is allowed.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Allowed', items: ['Math.*', 'Array methods', 'JSON.*', 'console.log (dev only)', 'Closures and recursion'] },
            { label: 'Blocked', items: ['fetch / XMLHttpRequest', 'require() / import()', 'process / Buffer', 'fs / path', 'setTimeout / setInterval'] },
          ].map(g => (
            <div key={g.label} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <p className={`text-sm font-medium mb-2 ${g.label === 'Allowed' ? 'text-emerald-400' : 'text-red-400'}`}>{g.label}</p>
              <ul className="space-y-1">
                {g.items.map(i => (
                  <li key={i} className="text-xs text-zinc-500 font-mono">{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 text-sm text-zinc-400">
          <strong className="text-amber-400">CPU budget:</strong> Plugins that exceed 500ms are killed and the run
          is marked as timed out. Test your plugin with{' '}
          <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">GET /api/plugins/test?id=xxx</code> before deploying.
        </div>
      </section>

      {/* Built-in plugins */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-2">Built-in Plugins</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          TradeClaw ships four production-ready plugins. They are visible in the plugin
          panel and can be used as references for custom implementations.
        </p>
        <div className="space-y-3">
          {[
            {
              name: 'VWAP',
              category: 'Volume',
              desc: 'Volume-Weighted Average Price. Calculates intraday VWAP and returns BUY when price is above VWAP, SELL when below. Strength scales with distance from VWAP.',
            },
            {
              name: 'ATR',
              category: 'Volatility',
              desc: 'Average True Range with a configurable period (default 14). Returns the ATR value and a NEUTRAL signal — used as a volatility filter by other indicators.',
            },
            {
              name: 'OBV',
              category: 'Volume',
              desc: 'On-Balance Volume. Measures buying/selling pressure by accumulating volume. An upward OBV slope with rising price confirms bullish momentum.',
            },
            {
              name: 'Ichimoku',
              category: 'Trend',
              desc: 'Ichimoku Cloud (Tenkan-sen 9, Kijun-sen 26, Senkou Span B 52). Returns BUY when price is above the cloud and Tenkan crosses above Kijun.',
            },
          ].map(p => (
            <div key={p.name} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-zinc-200">{p.name}</p>
                <code className="text-[10px] font-mono text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 px-2 py-0.5 rounded">{p.category}</code>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Plugin Categories</h2>
        <div className="flex flex-wrap gap-2">
          {['Momentum', 'Trend', 'Volatility', 'Volume', 'Oscillator', 'Pattern', 'Custom'].map(cat => (
            <span key={cat} className="px-3 py-1 text-sm font-mono text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-full">
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* API routes */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">API Routes</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          {[
            { method: 'GET', path: '/api/plugins', desc: 'List all installed plugins with metadata.' },
            { method: 'POST', path: '/api/plugins', desc: 'Install a plugin. Pass name, description, category, and JS code.', params: 'name, description, version, category, code, params' },
            { method: 'GET', path: '/api/plugins/[id]', desc: 'Retrieve full plugin details including source code.' },
            { method: 'GET', path: '/api/plugins/test', desc: 'Run plugin against 100 dummy candles and return result.', params: 'id' },
          ].map(ep => (
            <div key={ep.path} className="p-4 border-b border-white/4 last:border-0">
              <div className="flex items-center gap-2.5 mb-1">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${ep.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-blue-500/15 text-blue-400 border-blue-500/25'}`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-zinc-200">{ep.path}</code>
              </div>
              <p className="text-sm text-zinc-500">{ep.desc}</p>
              {'params' in ep && ep.params && (
                <p className="mt-1 text-xs font-mono text-zinc-600">{ep.params}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Williams %R example */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Example: Williams %R Plugin</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          Williams %R is a momentum oscillator similar to Stochastic but inverted.
          Values near -100 indicate oversold conditions; values near 0 indicate overbought.
          This example shows a complete, installable plugin.
        </p>
        <CodeBlock
          language="javascript"
          filename="williams-r.js — paste into the plugin editor"
          code={`/**
 * Williams %R — Momentum Oscillator
 * Range: -100 to 0
 * Oversold:  < -80  → BUY signal
 * Overbought: > -20  → SELL signal
 */
module.exports = function williamsR(candles, params) {
  const period = (params && params.period) || 14;

  if (candles.length < period) {
    return { value: -50, signal: 'NEUTRAL', strength: 0, label: 'Williams %R: N/A' };
  }

  const slice = candles.slice(-period);
  const highestHigh = Math.max(...slice.map(c => c.high));
  const lowestLow  = Math.min(...slice.map(c => c.low));
  const currentClose = candles[candles.length - 1].close;

  const range = highestHigh - lowestLow;
  const value = range === 0 ? -50 : ((highestHigh - currentClose) / range) * -100;

  let signal = 'NEUTRAL';
  let strength = 50;

  if (value < -80) {
    signal = 'BUY';
    // Strength scales from 50 at -80 to 100 at -100
    strength = Math.round(50 + ((value + 80) / -20) * 50);
  } else if (value > -20) {
    signal = 'SELL';
    // Strength scales from 50 at -20 to 100 at 0
    strength = Math.round(50 + ((value + 20) / 20) * 50);
  }

  return {
    value: Math.round(value * 100) / 100,
    signal,
    strength: Math.min(100, Math.max(0, strength)),
    label: \`Williams %R: \${value.toFixed(1)}\`,
  };
};`}
        />
        <CodeBlock
          language="bash"
          filename="Install via API"
          code={`curl -X POST https://your-instance.com/api/plugins \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Williams %R",
    "description": "Momentum oscillator ranging -100 to 0",
    "version": "1.0.0",
    "category": "Momentum",
    "params": [{ "key": "period", "default": 14, "min": 5, "max": 50 }],
    "code": "…paste code here…"
  }'`}
        />
      </section>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/plugins/page.tsx" />
    </article>
  );
}
