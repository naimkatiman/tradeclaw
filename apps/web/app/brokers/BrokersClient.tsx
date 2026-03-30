'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowRight,
  Code,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Zap,
  Shield,
  TrendingUp,
  Star,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface BrokerCard {
  id: string;
  name: string;
  color: string;
  letter: string;
  description: string;
  assets: string[];
  features: string[];
  docsUrl: string;
  pythonCode: string;
  nodeCode: string;
}

/* ------------------------------------------------------------------ */
/* Broker data                                                         */
/* ------------------------------------------------------------------ */

const BROKERS: BrokerCard[] = [
  {
    id: 'binance',
    name: 'Binance',
    color: '#F3BA2F',
    letter: 'B',
    description: "World's largest crypto exchange. Spot, Futures, and Options via REST + WebSocket.",
    assets: ['Crypto Spot', 'Futures', 'Options'],
    features: ['REST + WebSocket API', 'Cross-margin & isolated', 'Testnet available'],
    docsUrl: 'https://binance-docs.github.io/apidocs/',
    pythonCode: `from binance.client import Client

client = Client(api_key, api_secret)

def on_signal(signal):
    if signal["confidence"] >= 75:
        side = "BUY" if signal["direction"] == "BUY" else "SELL"
        client.create_order(
            symbol=signal["pair"],
            side=side,
            type="MARKET",
            quoteOrderQty=100  # $100 USDT
        )`,
    nodeCode: `import Binance from 'node-binance-api';
const binance = new Binance().options({ APIKEY, APISECRET });

export async function onSignal(signal) {
  if (signal.confidence < 75) return;
  const side = signal.direction; // 'BUY' or 'SELL'
  await binance.marketBuy(signal.pair, 0.001);
  console.log(\`Order placed: \${side} \${signal.pair}\`);
}`,
  },
  {
    id: 'alpaca',
    name: 'Alpaca',
    color: '#FFCD00',
    letter: 'A',
    description: 'Commission-free US stocks and crypto. Excellent paper trading support for strategy testing.',
    assets: ['US Stocks', 'ETFs', 'Crypto'],
    features: ['Paper trading support', 'Zero commissions', 'Fractional shares'],
    docsUrl: 'https://docs.alpaca.markets/',
    pythonCode: `import alpaca_trade_api as tradeapi

api = tradeapi.REST(KEY_ID, SECRET_KEY, BASE_URL)

def on_signal(signal):
    if signal["confidence"] >= 75:
        api.submit_order(
            symbol=signal["pair"],
            qty=1,
            side=signal["direction"].lower(),
            type="market",
            time_in_force="gtc"
        )`,
    nodeCode: `import Alpaca from '@alpacahq/alpaca-trade-api';
const alpaca = new Alpaca({ keyId: KEY_ID, secretKey: SECRET_KEY });

export async function onSignal(signal) {
  if (signal.confidence < 75) return;
  await alpaca.createOrder({
    symbol: signal.pair,
    qty: 1,
    side: signal.direction.toLowerCase(),
    type: 'market',
    time_in_force: 'gtc',
  });
}`,
  },
  {
    id: 'oanda',
    name: 'OANDA',
    color: '#E8192C',
    letter: 'O',
    description: 'Leading forex & CFD broker. MT4/MT5 compatible. Perfect for TradeClaw forex signals.',
    assets: ['Forex', 'CFDs', 'Commodities'],
    features: ['MT4/MT5 support', 'REST + Streaming API', 'Practice accounts'],
    docsUrl: 'https://developer.oanda.com/rest-live-v20/introduction/',
    pythonCode: `import oandapyV20.endpoints.orders as orders
from oandapyV20 import API

client = API(access_token=TOKEN)

def on_signal(signal):
    if signal["confidence"] >= 75:
        body = {
            "order": {
                "type": "MARKET",
                "instrument": signal["pair"].replace("/", "_"),
                "units": "1000" if signal["direction"] == "BUY" else "-1000",
            }
        }
        r = orders.OrderCreate(ACCOUNT_ID, data=body)
        client.request(r)`,
    nodeCode: `// OANDA via REST
export async function onSignal(signal) {
  if (signal.confidence < 75) return;
  const units = signal.direction === 'BUY' ? 1000 : -1000;
  await fetch(\`https://api-fxtrade.oanda.com/v3/accounts/\${ACCOUNT_ID}/orders\`, {
    method: 'POST',
    headers: { Authorization: \`Bearer \${TOKEN}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: { type: 'MARKET', instrument: signal.pair, units } }),
  });
}`,
  },
  {
    id: 'kraken',
    name: 'Kraken',
    color: '#5741D9',
    letter: 'K',
    description: 'High-security US crypto exchange. Spot and Futures with institutional-grade reliability.',
    assets: ['Crypto Spot', 'Futures'],
    features: ['Proof of reserves', 'REST + WebSocket', 'Staking support'],
    docsUrl: 'https://docs.kraken.com/rest/',
    pythonCode: `import krakenex

k = krakenex.API(key=API_KEY, secret=API_SECRET)

def on_signal(signal):
    if signal["confidence"] >= 75:
        k.query_private("AddOrder", {
            "pair": signal["pair"],
            "type": signal["direction"].lower(),
            "ordertype": "market",
            "volume": "0.001",
        })`,
    nodeCode: `import KrakenClient from 'kraken-api';
const kraken = new KrakenClient(API_KEY, API_SECRET);

export async function onSignal(signal) {
  if (signal.confidence < 75) return;
  await kraken.api('AddOrder', {
    pair: signal.pair,
    type: signal.direction.toLowerCase(),
    ordertype: 'market',
    volume: '0.001',
  });
}`,
  },
  {
    id: 'bybit',
    name: 'Bybit',
    color: '#F7A600',
    letter: 'By',
    description: 'Leading derivatives exchange with deep liquidity. Ideal for leveraged signal execution.',
    assets: ['Perpetuals', 'Futures', 'Spot'],
    features: ['Up to 100x leverage', 'Unified account', 'WebSocket feed'],
    docsUrl: 'https://bybit-exchange.github.io/docs/v5/intro',
    pythonCode: `from pybit.unified_trading import HTTP

session = HTTP(api_key=API_KEY, api_secret=API_SECRET)

def on_signal(signal):
    if signal["confidence"] >= 75:
        session.place_order(
            category="linear",
            symbol=signal["pair"] + "USDT",
            side=signal["direction"].capitalize(),
            orderType="Market",
            qty="0.001",
        )`,
    nodeCode: `import { RestClientV5 } from 'bybit-api';
const client = new RestClientV5({ key: API_KEY, secret: API_SECRET });

export async function onSignal(signal) {
  if (signal.confidence < 75) return;
  await client.submitOrder({
    category: 'linear',
    symbol: signal.pair + 'USDT',
    side: signal.direction === 'BUY' ? 'Buy' : 'Sell',
    orderType: 'Market',
    qty: '0.001',
  });
}`,
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    color: '#CC0000',
    letter: 'IB',
    description: 'Multi-asset institutional-grade broker. Stocks, options, futures, forex — global markets.',
    assets: ['Stocks', 'Options', 'Futures', 'Forex'],
    features: ['Global markets', 'TWS API & IB Gateway', 'Low margin rates'],
    docsUrl: 'https://interactivebrokers.github.io/tws-api/',
    pythonCode: `from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.order import Order

class IBApp(EWrapper, EClient):
    def __init__(self):
        EClient.__init__(self, self)

def on_signal(signal):
    if signal["confidence"] >= 75:
        order = Order()
        order.action = signal["direction"]
        order.orderType = "MKT"
        order.totalQuantity = 10
        app.placeOrder(app.nextOrderId(), contract, order)`,
    nodeCode: `// IB via TWS API Gateway
import { IBApi, EventName, Order } from '@stoqey/ib';
const ib = new IBApi({ port: 7497 });

export function onSignal(signal) {
  if (signal.confidence < 75) return;
  const order: Order = {
    action: signal.direction,
    orderType: 'MKT',
    totalQuantity: 10,
  };
  ib.placeOrder(nextId++, contract, order);
}`,
  },
  {
    id: 'coinbase',
    name: 'Coinbase Advanced',
    color: '#0052FF',
    letter: 'CB',
    description: 'US-regulated crypto exchange. REST API for retail and institutional traders.',
    assets: ['Crypto Spot', 'Perpetuals'],
    features: ['Regulated US exchange', 'Advanced Trade API', 'High liquidity'],
    docsUrl: 'https://docs.cdp.coinbase.com/advanced-trade/docs/welcome',
    pythonCode: `from coinbase.rest import RESTClient

client = RESTClient(api_key=API_KEY, api_secret=API_SECRET)

def on_signal(signal):
    if signal["confidence"] >= 75:
        client.market_order_buy(
            client_order_id="tradeclaw-" + signal["id"],
            product_id=signal["pair"] + "-USD",
            quote_size="100"
        )`,
    nodeCode: `import { RESTClient } from '@coinbase/coinbase-sdk';
const client = new RESTClient({ apiKey: API_KEY, apiSecret: API_SECRET });

export async function onSignal(signal) {
  if (signal.confidence < 75) return;
  const method = signal.direction === 'BUY' ? 'marketOrderBuy' : 'marketOrderSell';
  await client[method]({
    clientOrderId: \`tradeclaw-\${signal.id}\`,
    productId: \`\${signal.pair}-USD\`,
    quoteSize: '100',
  });
}`,
  },
  {
    id: 'td-ameritrade',
    name: 'TD Ameritrade / Schwab',
    color: '#00A651',
    letter: 'TD',
    description: 'US equities powerhouse. thinkorswim platform API for stocks, ETFs, and options.',
    assets: ['US Stocks', 'ETFs', 'Options'],
    features: ['thinkorswim API', 'Merged with Schwab', 'Institutional tools'],
    docsUrl: 'https://developer.tdameritrade.com/apis',
    pythonCode: `import tda

client = tda.auth.easy_client(API_KEY, REDIRECT_URI, TOKEN_PATH)

def on_signal(signal):
    if signal["confidence"] >= 75:
        r = client.place_order(
            ACCOUNT_ID,
            tda.orders.equities.equity_buy_market(
                signal["pair"], 10
            )
        )`,
    nodeCode: `import { TDAmeritradeApi } from 'ameritrade';
const api = new TDAmeritradeApi({ apiKey: API_KEY });

export async function onSignal(signal) {
  if (signal.confidence < 75) return;
  await api.placeOrder(ACCOUNT_ID, {
    orderType: 'MARKET',
    session: 'NORMAL',
    duration: 'DAY',
    orderStrategyType: 'SINGLE',
    orderLegCollection: [{
      instruction: signal.direction === 'BUY' ? 'BUY' : 'SELL',
      quantity: 10,
      instrument: { symbol: signal.pair, assetType: 'EQUITY' },
    }],
  });
}`,
  },
];

/* ------------------------------------------------------------------ */
/* Generic webhook snippet                                              */
/* ------------------------------------------------------------------ */

const GENERIC_WEBHOOK_NODE = `// Generic broker routing pattern (Express.js)
import express from 'express';
const app = express();

app.post('/tradeclaw-webhook', async (req, res) => {
  const { pair, direction, confidence, entry } = req.body;

  // Only act on high-confidence signals
  if (confidence >= 75 && direction === 'BUY') {
    await broker.createOrder(pair, 'market', 'buy', qty);
    console.log(\`[TradeClaw] BUY \${pair} @ \${entry} (conf: \${confidence}%)\`);
  }

  res.json({ ok: true });
});

app.listen(3001, () => console.log('Webhook receiver running on :3001'));`;

/* ------------------------------------------------------------------ */
/* Copy button                                                          */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Broker card                                                          */
/* ------------------------------------------------------------------ */

function BrokerCardComponent({ broker }: { broker: BrokerCard }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'python' | 'node'>('python');

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-4 p-5">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-black font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: broker.color }}
        >
          {broker.letter}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-white">{broker.name}</h3>
            <a
              href={broker.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              Docs <ExternalLink size={11} />
            </a>
          </div>
          <p className="text-sm text-zinc-400 mt-0.5">{broker.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {broker.assets.map((a) => (
              <span key={a} className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-5 pb-3">
        <ul className="space-y-1">
          {broker.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
              <div className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-colors border-t border-zinc-800"
      >
        <span className="flex items-center gap-1.5">
          <Code size={12} /> View code examples
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Code examples */}
      {expanded && (
        <div className="border-t border-zinc-800">
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setTab('python')}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                tab === 'python'
                  ? 'text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setTab('node')}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                tab === 'node'
                  ? 'text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Node.js
            </button>
          </div>
          <div className="relative">
            <pre className="p-4 text-xs text-zinc-300 font-mono overflow-x-auto bg-zinc-950 leading-relaxed whitespace-pre-wrap">
              {tab === 'python' ? broker.pythonCode : broker.nodeCode}
            </pre>
            <div className="absolute top-3 right-3">
              <CopyButton text={tab === 'python' ? broker.pythonCode : broker.nodeCode} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

export function BrokersClient() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Hero */}
      <section className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-4">
            <Building2 size={16} />
            Broker Integrations
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Connect Your Broker
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Route TradeClaw AI signals directly to your broker or exchange via webhook.
            Supports 8+ brokers across crypto, forex, stocks, and derivatives.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-8">
            {[
              { icon: <Globe size={16} />, label: '8+ Brokers' },
              { icon: <Zap size={16} />, label: 'Webhook routing' },
              { icon: <Shield size={16} />, label: 'HMAC-signed payloads' },
              { icon: <TrendingUp size={16} />, label: 'Python + Node.js examples' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="text-emerald-400">{stat.icon}</span>
                {stat.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signal routing diagram */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-lg font-semibold text-white mb-4">How Signal Routing Works</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-mono">
            {[
              { label: 'TradeClaw Signal Engine', color: 'emerald' },
              { arrow: true },
              { label: '/api/webhooks', color: 'purple' },
              { arrow: true },
              { label: 'Your Webhook Receiver', color: 'blue' },
              { arrow: true },
              { label: 'Broker REST API', color: 'yellow' },
              { arrow: true },
              { label: 'Order Executed ✓', color: 'emerald' },
            ].map((item, i) =>
              'arrow' in item ? (
                <ArrowRight key={i} size={16} className="text-zinc-600" />
              ) : (
                <span
                  key={i}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    item.color === 'emerald'
                      ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                      : item.color === 'purple'
                      ? 'bg-purple-950 border-purple-800 text-purple-300'
                      : item.color === 'blue'
                      ? 'bg-blue-950 border-blue-800 text-blue-300'
                      : 'bg-yellow-950 border-yellow-800 text-yellow-300'
                  }`}
                >
                  {item.label}
                </span>
              )
            )}
          </div>
          <p className="text-xs text-zinc-500 text-center mt-4">
            TradeClaw dispatches a signed JSON payload to your configured webhook URL.
            Your receiver validates the HMAC signature, then routes to your broker.
          </p>
        </div>

        {/* Generic code snippet */}
        <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-800/50">
            <span className="text-xs text-zinc-400 font-medium">Generic webhook receiver (Node.js)</span>
            <CopyButton text={GENERIC_WEBHOOK_NODE} />
          </div>
          <pre className="p-4 text-xs text-zinc-300 font-mono overflow-x-auto bg-zinc-950 leading-relaxed">
            {GENERIC_WEBHOOK_NODE}
          </pre>
        </div>
      </section>

      {/* Broker cards */}
      <section className="max-w-5xl mx-auto px-6 pb-10">
        <h2 className="text-lg font-semibold text-white mb-6">Supported Brokers &amp; Exchanges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BROKERS.map((broker) => (
            <BrokerCardComponent key={broker.id} broker={broker} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-10">
        <div className="bg-gradient-to-r from-emerald-950 to-zinc-900 border border-emerald-900 rounded-xl p-8 text-center">
          <Building2 className="mx-auto mb-3 text-emerald-400" size={32} />
          <h2 className="text-xl font-bold text-white mb-2">Ready to connect your broker?</h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            Set up a webhook in TradeClaw settings, paste your endpoint, and start routing
            signals in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/settings/webhooks"
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              Configure Webhooks <ArrowRight size={14} />
            </Link>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Star size={14} /> Star on GitHub
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
