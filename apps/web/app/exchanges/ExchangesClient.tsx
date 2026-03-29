'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Globe,
  Lock,
  Zap,
  Layers,
  BarChart3,
  RefreshCw,
  Search,
  X,
  Star,
  Key,
  Eye,
  EyeOff,
  Check,
  Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Exchange {
  id: string;
  name: string;
  color: string;
  hasFutures: boolean;
  tags: string[];
}

interface ConnectionResult {
  success: boolean;
  exchange?: string;
  balance?: Record<string, string>;
  latencyMs?: number;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Exchange data (static fallback, overridden by API fetch)            */
/* ------------------------------------------------------------------ */

const FALLBACK_EXCHANGES: Exchange[] = [
  { id: 'binance', name: 'Binance', color: '#F3BA2F', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'coinbase', name: 'Coinbase', color: '#0052FF', hasFutures: false, tags: ['Spot', 'CEX'] },
  { id: 'kraken', name: 'Kraken', color: '#5741D9', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'okx', name: 'OKX', color: '#000000', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'bybit', name: 'Bybit', color: '#F7A600', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'bitfinex', name: 'Bitfinex', color: '#16B157', hasFutures: false, tags: ['Spot', 'CEX'] },
  { id: 'huobi', name: 'Huobi', color: '#2083DD', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'kucoin', name: 'KuCoin', color: '#23AF91', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'gateio', name: 'Gate.io', color: '#2354E6', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'bitget', name: 'Bitget', color: '#00F0FF', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'mexc', name: 'MEXC', color: '#2DB892', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'phemex', name: 'Phemex', color: '#5200FF', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'deribit', name: 'Deribit', color: '#03A9F4', hasFutures: true, tags: ['Futures', 'Options'] },
  { id: 'bitmex', name: 'BitMEX', color: '#FF5C5C', hasFutures: true, tags: ['Futures', 'CEX'] },
  { id: 'gemini', name: 'Gemini', color: '#00DCFA', hasFutures: false, tags: ['Spot', 'CEX'] },
  { id: 'bitstamp', name: 'Bitstamp', color: '#346AA9', hasFutures: false, tags: ['Spot', 'CEX'] },
  { id: 'poloniex', name: 'Poloniex', color: '#14B8A6', hasFutures: false, tags: ['Spot', 'CEX'] },
  { id: 'hitbtc', name: 'HitBTC', color: '#4E5B76', hasFutures: false, tags: ['Spot', 'CEX'] },
  { id: 'bittrex', name: 'Bittrex', color: '#1A5EB8', hasFutures: false, tags: ['Spot', 'CEX'] },
  { id: 'xtcom', name: 'XT.com', color: '#FFC107', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'coinex', name: 'CoinEx', color: '#2ECC71', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'ascendex', name: 'AscendEX', color: '#2196F3', hasFutures: false, tags: ['Spot', 'CEX'] },
  { id: 'whitebit', name: 'WhiteBIT', color: '#A0AEC0', hasFutures: true, tags: ['Spot', 'Futures'] },
  { id: 'upbit', name: 'Upbit', color: '#07ACE2', hasFutures: false, tags: ['Spot', 'CEX'] },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function LetterIcon({ name, color }: { name: string; color: string }) {
  const letter = name.charAt(0).toUpperCase();
  const bg = color === '#000000' ? '#27272a' : color;
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
      style={{ backgroundColor: bg, color: '#fff' }}
    >
      {letter}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ExchangesClient() {
  const [exchanges, setExchanges] = useState<Exchange[]>(FALLBACK_EXCHANGES);
  const [search, setSearch] = useState('');
  const [modalExchange, setModalExchange] = useState<Exchange | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);

  useEffect(() => {
    fetch('/api/exchanges')
      .then((r) => r.json())
      .then((d: { exchanges: Exchange[] }) => {
        if (d.exchanges?.length) setExchanges(d.exchanges);
      })
      .catch(() => {});
  }, []);

  const filtered = exchanges.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openModal(ex: Exchange) {
    setModalExchange(ex);
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
    setShowSecret(false);
    setResult(null);
  }

  function closeModal() {
    setModalExchange(null);
    setResult(null);
  }

  async function testConnection() {
    if (!modalExchange || !apiKey || !apiSecret) return;
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch('/api/exchanges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchangeId: modalExchange.id,
          apiKey,
          secret: apiSecret,
        }),
      });
      const data = (await res.json()) as ConnectionResult;
      setResult(data);
    } catch {
      setResult({ success: false, error: 'Network error' });
    } finally {
      setTesting(false);
    }
  }

  function saveConnection() {
    if (!modalExchange) return;
    const stored = JSON.parse(localStorage.getItem('tc_exchanges') || '{}');
    stored[modalExchange.id] = {
      apiKey,
      secret: apiSecret,
      passphrase: passphrase || undefined,
      connectedAt: new Date().toISOString(),
    };
    localStorage.setItem('tc_exchanges', JSON.stringify(stored));
    closeModal();
  }

  const needsPassphrase = modalExchange?.id === 'okx' || modalExchange?.id === 'bitget';

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#050505] text-white font-[Geist,sans-serif]">
      {/* ---- Hero ---- */}
      <div className="border-b border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-8 h-8 text-emerald-400" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Trade on <span className="text-emerald-400">100+</span> Exchanges
            </h1>
          </div>

          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
            Connect TradeClaw to any exchange via{' '}
            <span className="text-white font-medium">CCXT</span> — the open-source
            unified crypto trading library. One API, every exchange.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="https://github.com/naimkatiman/tradeclaw"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors text-sm"
            >
              <Star className="w-4 h-4" /> Star on GitHub
            </Link>
            <Link
              href="/api-docs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium rounded-lg hover:border-zinc-700 transition-colors text-sm"
            >
              API Docs
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* ---- Search ---- */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exchanges..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* ---- Exchange Grid ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((ex) => (
            <div
              key={ex.id}
              className="group bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.06)] transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <LetterIcon name={ex.name} color={ex.color} />
                <div>
                  <h3 className="font-semibold text-white">{ex.name}</h3>
                  <div className="flex gap-1.5 mt-1">
                    {ex.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <Check className="w-3 h-3" /> Supported via CCXT
                </span>
                <button
                  onClick={() => openModal(ex)}
                  className="px-3 py-1.5 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                >
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-zinc-500 text-sm">
            No exchanges match &quot;{search}&quot;. CCXT supports 100+ exchanges — check the full list at{' '}
            <Link href="https://github.com/ccxt/ccxt" className="text-emerald-400 hover:underline">
              github.com/ccxt/ccxt
            </Link>
            .
          </p>
        )}

        {/* ---- CCXT Capabilities ---- */}
        <section>
          <h2 className="text-2xl font-bold text-center mb-8">
            Why <span className="text-emerald-400">CCXT</span>?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Layers,
                title: 'Unified API',
                desc: 'One interface for all exchanges. Write once, trade everywhere.',
              },
              {
                icon: Globe,
                title: '100+ Exchanges',
                desc: 'Binance, Coinbase, Kraken, OKX, Bybit and many more supported.',
              },
              {
                icon: BarChart3,
                title: 'Spot & Futures',
                desc: 'Trade spot markets, perpetual futures, and options through one SDK.',
              },
              {
                icon: RefreshCw,
                title: 'Real-time Data',
                desc: 'Live orderbooks, OHLCV candles, tickers, and account balances.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center"
              >
                <item.icon className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- How It Works ---- */}
        <section>
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { step: '1', title: 'Install CCXT', desc: 'npm install ccxt — included in the TradeClaw Docker image.' },
              { step: '2', title: 'Connect API Keys', desc: 'Add your exchange API key and secret via the UI or .env file.' },
              { step: '3', title: 'Receive Signals', desc: 'TradeClaw sends AI-generated signals directly to your exchange.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <h3 className="font-semibold text-white mb-1">{s.title}</h3>
                <p className="text-sm text-zinc-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Bottom CTA ---- */}
        <section className="text-center py-8">
          <h2 className="text-2xl font-bold mb-3">
            Ready to connect your exchange?
          </h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Self-host TradeClaw in minutes with Docker Compose and start receiving
            AI trading signals on your favourite exchange.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="https://github.com/naimkatiman/tradeclaw"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-black font-medium rounded-lg hover:bg-emerald-400 transition-colors text-sm"
            >
              <Star className="w-4 h-4" /> Star on GitHub
            </Link>
            <Link
              href="/docs/telegram"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium rounded-lg hover:border-zinc-700 transition-colors text-sm"
            >
              Setup Guide
            </Link>
          </div>
        </section>
      </div>

      {/* ---- Connect Modal ---- */}
      {modalExchange && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-md bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LetterIcon name={modalExchange.name} color={modalExchange.color} />
                <div>
                  <h3 className="font-semibold text-white text-lg">
                    Connect {modalExchange.name}
                  </h3>
                  <p className="text-xs text-zinc-500">Enter your API credentials</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
                  API Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
                  API Secret
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your API secret"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {needsPassphrase && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
                    Passphrase
                  </label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Exchange passphrase (required for OKX/Bitget)"
                    className="w-full px-4 py-2.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2.5">
              <Lock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-400">
                Keys are stored locally in your browser. They are never sent to
                TradeClaw servers.
              </p>
            </div>

            {/* Result */}
            {result && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  result.success
                    ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/5 border border-red-500/20 text-red-400'
                }`}
              >
                {result.success ? (
                  <div className="space-y-1">
                    <p className="font-medium">Connected to {result.exchange}</p>
                    {result.balance && (
                      <div className="flex gap-4 text-xs text-zinc-400">
                        {Object.entries(result.balance).map(([coin, val]) => (
                          <span key={coin}>
                            {coin}: <span className="text-white font-mono">{val}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {result.latencyMs && (
                      <p className="text-xs text-zinc-500">
                        Latency: {result.latencyMs}ms
                      </p>
                    )}
                  </div>
                ) : (
                  <p>{result.error}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={testConnection}
                disabled={testing || !apiKey || !apiSecret}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-40"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Test Connection
              </button>
              <button
                onClick={saveConnection}
                disabled={!apiKey || !apiSecret}
                className="flex-1 px-4 py-2.5 bg-emerald-500 text-black text-sm font-medium rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-40"
              >
                Save &amp; Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
