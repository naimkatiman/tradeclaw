'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import Link from 'next/link';
import {
  Server,
  Plug,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Shield,
  Zap,
  Terminal,
  Star,
  ChevronDown,
  MonitorSmartphone,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type BrokerType = 'metatrader' | 'ibkr' | 'alpaca' | 'binance';
type ConnectionPhase = 'idle' | 'authenticating' | 'handshake' | 'syncing' | 'connected' | 'error';

interface BrokerConfig {
  id: BrokerType;
  name: string;
  icon: React.ReactNode;
  fields: { key: string; label: string; placeholder: string; type: string; defaultValue: string }[];
  connectionString: string;
  docs: string;
}

interface MockAccount {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  leverage: number;
  currency: string;
  openPositions: number;
}

/* ------------------------------------------------------------------ */
/*  Broker Configs                                                     */
/* ------------------------------------------------------------------ */

const BROKERS: BrokerConfig[] = [
  {
    id: 'metatrader',
    name: 'MetaTrader 5',
    icon: <MonitorSmartphone size={20} />,
    fields: [
      { key: 'server', label: 'Server', placeholder: 'MetaQuotes-Demo', type: 'text', defaultValue: 'MetaQuotes-Demo' },
      { key: 'login', label: 'Login', placeholder: '50124792', type: 'text', defaultValue: '50124792' },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password', defaultValue: 'tc_demo_2026' },
      { key: 'token', label: 'MetaAPI Token', placeholder: 'eyJ0eXAiOiJKV...', type: 'text', defaultValue: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.tc-demo-token' },
    ],
    connectionString: 'mt5://MetaQuotes-Demo:50124792?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.tc-demo-token',
    docs: 'https://metaapi.cloud/docs/client/guides/connect/',
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    icon: <Server size={20} />,
    fields: [
      { key: 'host', label: 'Gateway Host', placeholder: 'localhost', type: 'text', defaultValue: 'localhost' },
      { key: 'port', label: 'Port', placeholder: '4001', type: 'text', defaultValue: '4001' },
      { key: 'clientId', label: 'Client ID', placeholder: '1', type: 'text', defaultValue: '1' },
      { key: 'accountId', label: 'Account ID', placeholder: 'DU1234567', type: 'text', defaultValue: 'DU1234567' },
    ],
    connectionString: 'ibkr://localhost:4001?clientId=1&account=DU1234567',
    docs: 'https://interactivebrokers.github.io/tws-api/',
  },
  {
    id: 'alpaca',
    name: 'Alpaca Markets',
    icon: <Zap size={20} />,
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'PK...', type: 'text', defaultValue: 'PKTEST1234567890ABCD' },
      { key: 'apiSecret', label: 'API Secret', placeholder: '••••••••', type: 'password', defaultValue: 'abc123def456ghi789jkl012mno345pqr678' },
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://paper-api.alpaca.markets', type: 'text', defaultValue: 'https://paper-api.alpaca.markets' },
    ],
    connectionString: 'alpaca://paper-api.alpaca.markets?key=PKTEST1234567890ABCD',
    docs: 'https://docs.alpaca.markets/',
  },
  {
    id: 'binance',
    name: 'Binance',
    icon: <Shield size={20} />,
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'vmPU...', type: 'text', defaultValue: 'vmPUZE6mv9SD5VNHk4HlWFsOr6aKE2zvsw0MuIgwCIPy6utIco14y7Ju91duEh8A' },
      { key: 'apiSecret', label: 'API Secret', placeholder: '••••••••', type: 'password', defaultValue: 'NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j' },
      { key: 'testnet', label: 'Testnet', placeholder: 'true', type: 'text', defaultValue: 'true' },
    ],
    connectionString: 'binance://testnet.binance.vision?key=vmPU...&testnet=true',
    docs: 'https://binance-docs.github.io/apidocs/',
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const PHASE_LABELS: Record<ConnectionPhase, string> = {
  idle: 'Disconnected',
  authenticating: 'Authenticating...',
  handshake: 'TLS Handshake...',
  syncing: 'Syncing Account...',
  connected: 'Connected',
  error: 'Connection Failed',
};

const PHASE_COLORS: Record<ConnectionPhase, string> = {
  idle: 'var(--text-secondary)',
  authenticating: '#f59e0b',
  handshake: '#f59e0b',
  syncing: '#06b6d4',
  connected: '#10b981',
  error: '#ef4444',
};

function generateMockAccount(): MockAccount {
  return {
    balance: 10000 + Math.random() * 90000,
    equity: 10000 + Math.random() * 90000,
    margin: Math.random() * 5000,
    freeMargin: 8000 + Math.random() * 80000,
    leverage: [50, 100, 200, 500][Math.floor(Math.random() * 4)],
    currency: 'USD',
    openPositions: Math.floor(Math.random() * 8),
  };
}

/* ------------------------------------------------------------------ */
/*  Copy Button                                                        */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md transition-colors hover:bg-white/10"
      title="Copy"
    >
      {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} style={{ color: 'var(--text-secondary)' }} />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Connection Log                                                     */
/* ------------------------------------------------------------------ */

function ConnectionLog({ phase, broker }: { phase: ConnectionPhase; broker: string }) {
  const logs: string[] = [];

  if (phase !== 'idle') logs.push(`[${new Date().toISOString()}] Connecting to ${broker}...`);
  if (['handshake', 'syncing', 'connected'].includes(phase)) logs.push(`[${new Date().toISOString()}] ✓ Authentication successful`);
  if (['handshake', 'syncing', 'connected'].includes(phase)) logs.push(`[${new Date().toISOString()}] TLS 1.3 handshake complete`);
  if (['syncing', 'connected'].includes(phase)) logs.push(`[${new Date().toISOString()}] Syncing account data...`);
  if (phase === 'connected') logs.push(`[${new Date().toISOString()}] ✓ Account synced. Ready.`);
  if (phase === 'error') logs.push(`[${new Date().toISOString()}] ✗ Connection timeout after 30s`);

  return (
    <div className="rounded-lg p-3 font-mono text-xs overflow-x-auto" style={{ background: '#0a0a0a', color: '#a1a1aa' }}>
      {logs.length === 0 ? (
        <span className="opacity-50">Waiting for connection...</span>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="leading-relaxed">
            {log.includes('✓') ? (
              <span className="text-emerald-400">{log}</span>
            ) : log.includes('✗') ? (
              <span className="text-red-400">{log}</span>
            ) : (
              log
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function BrokerSimClient() {
  const [selectedBroker, setSelectedBroker] = useState<BrokerType>('metatrader');
  const [phase, setPhase] = useState<ConnectionPhase>('idle');
  const [account, setAccount] = useState<MockAccount | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showConnectionStr, setShowConnectionStr] = useState(false);

  const broker = BROKERS.find(b => b.id === selectedBroker)!;

  // Initialize field values when broker changes
  useEffect(() => {
    const vals: Record<string, string> = {};
    broker.fields.forEach(f => { vals[f.key] = f.defaultValue; });
    startTransition(() => {
      setFieldValues(vals);
      setPhase('idle');
      setAccount(null);
    });
  }, [selectedBroker, broker.fields]);

  const simulate = useCallback(async () => {
    setPhase('authenticating');
    setAccount(null);
    await new Promise(r => setTimeout(r, 800));
    setPhase('handshake');
    await new Promise(r => setTimeout(r, 600));
    setPhase('syncing');
    await new Promise(r => setTimeout(r, 1000));

    // 90% chance success
    if (Math.random() > 0.1) {
      setPhase('connected');
      setAccount(generateMockAccount());
    } else {
      setPhase('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    setPhase('idle');
    setAccount(null);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
          <Link href="/" className="text-xs font-medium flex items-center gap-1.5 mb-4" style={{ color: 'var(--text-secondary)' }}>
            ← Back to TradeClaw
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
              <Plug size={20} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Broker Simulator</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Paper-test a real broker connection flow. See what a live MetaTrader, IBKR, Alpaca, or Binance integration looks like — with mock APIs and copy-paste connection strings.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Broker selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BROKERS.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBroker(b.id)}
              className="rounded-xl p-4 text-left transition-all"
              style={{
                background: selectedBroker === b.id ? 'var(--accent-muted)' : 'var(--bg-card)',
                border: `1px solid ${selectedBroker === b.id ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: selectedBroker === b.id ? '#10b981' : 'var(--text-secondary)' }}>
                  {b.icon}
                </span>
                <span className="text-sm font-medium" style={{ color: selectedBroker === b.id ? '#10b981' : 'var(--foreground)' }}>
                  {b.name}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Config form */}
          <div className="space-y-4">
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Terminal size={16} className="text-emerald-500" />
                Connection Settings
              </h3>
              <div className="space-y-3">
                {broker.fields.map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={fieldValues[field.key] || ''}
                      onChange={e => setFieldValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full text-sm rounded-lg px-3 py-2 font-mono"
                      style={{
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Connection string */}
              <div className="mt-4">
                <button
                  onClick={() => setShowConnectionStr(!showConnectionStr)}
                  className="text-xs flex items-center gap-1 mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ChevronDown size={12} className={`transition-transform ${showConnectionStr ? 'rotate-180' : ''}`} />
                  Connection String
                </button>
                {showConnectionStr && (
                  <div className="flex items-center gap-2 rounded-lg p-2 font-mono text-xs" style={{ background: '#0a0a0a', color: '#a1a1aa' }}>
                    <code className="flex-1 overflow-x-auto whitespace-nowrap">{broker.connectionString}</code>
                    <CopyButton text={broker.connectionString} />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-5">
                {phase === 'idle' || phase === 'error' ? (
                  <button
                    onClick={simulate}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >
                    <Plug size={16} /> Connect
                  </button>
                ) : phase === 'connected' ? (
                  <button
                    onClick={disconnect}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--sell-muted)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    <XCircle size={16} /> Disconnect
                  </button>
                ) : (
                  <button disabled className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <Loader2 size={16} className="animate-spin" /> Connecting...
                  </button>
                )}
                <a
                  href={broker.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-1"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                >
                  Docs <ArrowRight size={14} />
                </a>
              </div>
            </div>

            {/* Connection log */}
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Terminal size={16} style={{ color: 'var(--text-secondary)' }} />
                Connection Log
              </h3>
              <ConnectionLog phase={phase} broker={broker.name} />
            </div>
          </div>

          {/* Right: Status + Account */}
          <div className="space-y-4">
            {/* Status */}
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4">Connection Status</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ background: PHASE_COLORS[phase], boxShadow: phase === 'connected' ? '0 0 8px rgba(16,185,129,0.5)' : 'none' }} />
                <span className="text-sm font-medium" style={{ color: PHASE_COLORS[phase] }}>
                  {PHASE_LABELS[phase]}
                </span>
              </div>
              {/* Progress steps */}
              <div className="space-y-2">
                {(['authenticating', 'handshake', 'syncing', 'connected'] as ConnectionPhase[]).map((p, i) => {
                  const phases: ConnectionPhase[] = ['authenticating', 'handshake', 'syncing', 'connected'];
                  const currentIdx = phases.indexOf(phase);
                  const done = currentIdx >= i;
                  const active = currentIdx === i && phase !== 'connected';
                  return (
                    <div key={p} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{
                        background: done ? 'rgba(16,185,129,0.2)' : 'var(--glass-bg)',
                        color: done ? '#10b981' : 'var(--text-secondary)',
                        border: active ? '2px solid #f59e0b' : '1px solid var(--border)',
                      }}>
                        {done && !active ? '✓' : i + 1}
                      </div>
                      <span className="text-xs" style={{ color: done ? 'var(--foreground)' : 'var(--text-secondary)' }}>
                        {PHASE_LABELS[p]}
                      </span>
                      {active && <Loader2 size={12} className="animate-spin text-amber-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Account Info */}
            {account && (
              <div className="rounded-xl p-5 transition-all duration-500" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-emerald-500" />
                  Account Info <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">PAPER</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Balance', value: `$${account.balance.toFixed(2)}` },
                    { label: 'Equity', value: `$${account.equity.toFixed(2)}` },
                    { label: 'Margin', value: `$${account.margin.toFixed(2)}` },
                    { label: 'Free Margin', value: `$${account.freeMargin.toFixed(2)}` },
                    { label: 'Leverage', value: `1:${account.leverage}` },
                    { label: 'Open Positions', value: account.openPositions.toString() },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg p-3" style={{ background: 'var(--glass-bg)' }}>
                      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                      <p className="text-sm font-mono font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What this would look like in production */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
              <h3 className="text-sm font-semibold mb-2 text-purple-400">In Production, This Would...</h3>
              <ul className="text-xs space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
                <li>• Connect to your real {broker.name} account</li>
                <li>• Auto-execute TradeClaw signals as market orders</li>
                <li>• Apply position sizing from your risk settings</li>
                <li>• Set SL/TP from signal levels automatically</li>
                <li>• Stream real-time P&L back to the dashboard</li>
              </ul>
              <a
                href="https://github.com/naimkatiman/tradeclaw/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-purple-400 mt-3 hover:text-purple-300 transition-colors"
              >
                Vote for live broker integrations <ArrowRight size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Code examples */}
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-4">Integration Code Example</h3>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#0a0a0a', color: '#a1a1aa' }}>
            <pre>{`import { TradeclawClient } from 'tradeclaw-js';
import { connectBroker } from './broker-adapter';

const tc = new TradeclawClient({ baseUrl: 'http://localhost:3000' });
const broker = await connectBroker({
  type: '${selectedBroker}',
  connectionString: '${broker.connectionString}',
});

// Auto-follow signals
const signals = await tc.signals({ minConfidence: 75 });
for (const signal of signals) {
  await broker.placeOrder({
    symbol: signal.symbol,
    direction: signal.direction,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit1,
    size: calculatePositionSize(broker.account, signal),
  });
}`}</pre>
          </div>
          <div className="flex justify-end mt-2">
            <CopyButton text={`import { TradeclawClient } from 'tradeclaw-js';\nimport { connectBroker } from './broker-adapter';\n\nconst tc = new TradeclawClient({ baseUrl: 'http://localhost:3000' });\nconst broker = await connectBroker({\n  type: '${selectedBroker}',\n  connectionString: '${broker.connectionString}',\n});\n\nconst signals = await tc.signals({ minConfidence: 75 });\nfor (const signal of signals) {\n  await broker.placeOrder({\n    symbol: signal.symbol,\n    direction: signal.direction,\n    stopLoss: signal.stopLoss,\n    takeProfit: signal.takeProfit1,\n    size: calculatePositionSize(broker.account, signal),\n  });\n}`} />
          </div>
        </div>

        {/* Star CTA */}
        <div className="text-center py-6">
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Star size={16} className="text-amber-400" /> Star TradeClaw on GitHub to vote for live broker integrations
          </a>
        </div>
      </div>
    </div>
  );
}
