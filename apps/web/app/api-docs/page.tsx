'use client';

import { useState, useCallback } from 'react';
import { Play, Loader2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface Param {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;
  description: string;
  params?: Param[];
  exampleBody?: Record<string, unknown>;
  responseExample: unknown;
}

interface Category {
  id: string;
  label: string;
  endpoints: Endpoint[];
}

// ─── API Spec ────────────────────────────────────────────────────────────────

const SPEC: Category[] = [
  {
    id: 'signals',
    label: 'Signals',
    endpoints: [
      {
        id: 'get-signals',
        method: 'GET',
        path: '/api/signals',
        description:
          'List trading signals with optional filters. Returns BUY/SELL signals generated from multi-indicator technical analysis (RSI, MACD, EMA, Stochastic, Bollinger Bands).',
        params: [
          { name: 'symbol', type: 'string', required: false, description: 'Filter by trading pair', example: 'XAUUSD' },
          { name: 'timeframe', type: 'string', required: false, description: 'Timeframe: M5, M15, H1, H4, D1', example: 'H1' },
          { name: 'direction', type: 'string', required: false, description: 'Signal direction: BUY or SELL', example: 'BUY' },
          { name: 'minConfidence', type: 'number', required: false, description: 'Minimum confidence score (0–100)', example: '70' },
        ],
        responseExample: {
          count: 2,
          timestamp: '2026-03-27T10:00:00.000Z',
          engine: { real: 2, fallback: 0, version: '2.0.0' },
          filters: { symbol: null, timeframe: null, direction: null, minConfidence: null },
          signals: [
            {
              id: 'SIG-1711530000000-1',
              symbol: 'XAUUSD',
              direction: 'BUY',
              confidence: 82,
              entry: 2315.50,
              stopLoss: 2308.00,
              takeProfit1: 2323.25,
              takeProfit2: 2334.25,
              takeProfit3: 2345.25,
              timeframe: 'H1',
              timestamp: '2026-03-27T10:00:00.000Z',
              status: 'active',
              source: 'real',
            },
          ],
        },
      },
      {
        id: 'get-signals-multitf',
        method: 'GET',
        path: '/api/signals/multi-tf',
        description:
          'Multi-timeframe confluence analysis. Evaluates H1, H4, and D1 signals for each symbol and returns agreement scores. 3/3 agreement yields +15 confluence bonus.',
        params: [
          { name: 'pair', type: 'string', required: false, description: 'Filter results to a single symbol', example: 'BTCUSD' },
        ],
        responseExample: {
          timestamp: '2026-03-27T10:00:00.000Z',
          count: 12,
          summary: { bullish: 5, bearish: 4, conflicted: 2, allAligned: 1 },
          results: [
            {
              symbol: 'XAUUSD',
              dominantDirection: 'BUY',
              agreementCount: 3,
              confluenceBonus: 15,
              isConflicted: false,
              entry: 2315.50,
              timeframes: [
                { timeframe: 'H1', direction: 'BUY', confidence: 82 },
                { timeframe: 'H4', direction: 'BUY', confidence: 76 },
                { timeframe: 'D1', direction: 'BUY', confidence: 71 },
              ],
            },
          ],
        },
      },
      {
        id: 'get-prices',
        method: 'GET',
        path: '/api/prices',
        description:
          'Current market prices for all 12 supported symbols. Sources: CoinGecko for crypto, Stooq for forex and metals.',
        responseExample: {
          timestamp: '2026-03-27T10:00:00.000Z',
          count: 12,
          prices: {
            XAUUSD: { price: 2315.50, change24h: 0.42, source: 'stooq' },
            BTCUSD: { price: 67250.00, change24h: 1.23, source: 'coingecko' },
            EURUSD: { price: 1.0845, change24h: -0.12, source: 'stooq' },
          },
        },
      },
    ],
  },
  {
    id: 'paper-trading',
    label: 'Paper Trading',
    endpoints: [
      {
        id: 'get-portfolio',
        method: 'GET',
        path: '/api/paper-trading',
        description: 'Get the full virtual portfolio state: positions, trade history, balance, and performance stats.',
        responseExample: {
          balance: 10420.50,
          startingBalance: 10000,
          positions: [],
          trades: [],
          stats: { totalTrades: 12, winRate: 0.67, totalPnl: 420.50, maxDrawdown: 0.05 },
          equityCurve: [10000, 10050, 10120, 10080, 10420],
        },
      },
      {
        id: 'open-position',
        method: 'POST',
        path: '/api/paper-trading/open',
        description: 'Open a new virtual trading position. Deducts margin from balance.',
        params: [
          { name: 'symbol', type: 'string', required: true, description: 'Trading pair (e.g. XAUUSD)', example: 'XAUUSD' },
          { name: 'direction', type: 'string', required: true, description: 'BUY or SELL', example: 'BUY' },
          { name: 'quantity', type: 'number', required: false, description: 'Lot size (default: 0.1)', example: '0.1' },
          { name: 'signalId', type: 'string', required: false, description: 'Link position to a signal ID', example: 'SIG-1711530000000-1' },
          { name: 'stopLoss', type: 'number', required: false, description: 'Stop loss price level', example: '2308.00' },
          { name: 'takeProfit', type: 'number', required: false, description: 'Take profit price level', example: '2323.25' },
        ],
        exampleBody: { symbol: 'XAUUSD', direction: 'BUY', quantity: 0.1, stopLoss: 2308.00, takeProfit: 2323.25 },
        responseExample: {
          position: {
            id: 'pos-1711530000000',
            symbol: 'XAUUSD',
            direction: 'BUY',
            entryPrice: 2315.50,
            quantity: 0.1,
            openTime: '2026-03-27T10:00:00.000Z',
            status: 'open',
          },
          balance: 9884.50,
        },
      },
      {
        id: 'close-position',
        method: 'POST',
        path: '/api/paper-trading/close',
        description: 'Close an open virtual position. Uses current market price unless an exit price is specified.',
        params: [
          { name: 'positionId', type: 'string', required: true, description: 'ID of position to close', example: 'pos-1711530000000' },
          { name: 'exitPrice', type: 'number', required: false, description: 'Override exit price (uses live price if omitted)' },
        ],
        exampleBody: { positionId: 'pos-1711530000000' },
        responseExample: {
          trade: {
            id: 'trade-1711530000000',
            symbol: 'XAUUSD',
            direction: 'BUY',
            entryPrice: 2315.50,
            exitPrice: 2323.25,
            pnl: 7.75,
            closeTime: '2026-03-27T11:00:00.000Z',
          },
          balance: 10008.25,
        },
      },
      {
        id: 'close-all',
        method: 'POST',
        path: '/api/paper-trading/close-all',
        description: 'Close all open virtual positions simultaneously at current market prices.',
        exampleBody: {},
        responseExample: { closed: 3, balance: 10420.50 },
      },
      {
        id: 'follow-signal',
        method: 'POST',
        path: '/api/paper-trading/follow-signal',
        description: 'Auto-open a position following a signal, with risk-proportional sizing.',
        params: [
          { name: 'symbol', type: 'string', required: true, description: 'Trading pair', example: 'XAUUSD' },
          { name: 'direction', type: 'string', required: true, description: 'BUY or SELL', example: 'BUY' },
          { name: 'entry', type: 'number', required: true, description: 'Entry price from signal', example: '2315.50' },
          { name: 'stopLoss', type: 'number', required: true, description: 'Stop loss from signal', example: '2308.00' },
          { name: 'takeProfit', type: 'number', required: true, description: 'Take profit from signal', example: '2323.25' },
          { name: 'id', type: 'string', required: false, description: 'Signal ID to link', example: 'SIG-1711530000000-1' },
          { name: 'positionSizePct', type: 'number', required: false, description: 'Risk % of balance (default: 1)', example: '1' },
        ],
        exampleBody: { symbol: 'XAUUSD', direction: 'BUY', entry: 2315.50, stopLoss: 2308.00, takeProfit: 2323.25, id: 'SIG-1711530000000-1' },
        responseExample: {
          position: {
            id: 'pos-1711530000000',
            symbol: 'XAUUSD',
            direction: 'BUY',
            entryPrice: 2315.50,
            quantity: 0.13,
            status: 'open',
          },
          balance: 9884.50,
        },
      },
      {
        id: 'reset-portfolio',
        method: 'POST',
        path: '/api/paper-trading/reset',
        description: 'Reset the virtual portfolio to the starting balance ($10,000), clearing all positions and trade history.',
        exampleBody: {},
        responseExample: { ok: true, balance: 10000 },
      },
      {
        id: 'get-stats',
        method: 'GET',
        path: '/api/paper-trading/stats',
        description: 'Aggregated performance statistics and equity curve data for the virtual portfolio.',
        responseExample: {
          stats: {
            totalTrades: 12,
            winRate: 0.67,
            totalPnl: 420.50,
            maxDrawdown: 0.05,
            avgWin: 58.30,
            avgLoss: -28.15,
            profitFactor: 2.07,
          },
          equityCurve: [10000, 10050, 10120, 10080, 10420],
          balance: 10420.50,
          startingBalance: 10000,
        },
      },
    ],
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    endpoints: [
      {
        id: 'list-webhooks',
        method: 'GET',
        path: '/api/webhooks',
        description: 'List all registered webhooks. Secrets are redacted from the response (use hasSecret to check if one exists).',
        responseExample: {
          webhooks: [
            {
              id: 'wh-abc123',
              name: 'Discord Alerts',
              url: 'https://discord.com/api/webhooks/...',
              enabled: true,
              hasSecret: false,
              createdAt: '2026-03-27T10:00:00.000Z',
            },
          ],
        },
      },
      {
        id: 'create-webhook',
        method: 'POST',
        path: '/api/webhooks',
        description: 'Register a new webhook endpoint to receive trading signal notifications via HTTP POST.',
        params: [
          { name: 'url', type: 'string', required: true, description: 'HTTPS URL to deliver events to', example: 'https://hooks.slack.com/services/T00/B00/xxx' },
          { name: 'name', type: 'string', required: false, description: 'Friendly label', example: 'Slack Alerts' },
          { name: 'secret', type: 'string', required: false, description: 'HMAC-SHA256 signing secret for verification', example: 'my-secret-key' },
        ],
        exampleBody: { url: 'https://hooks.slack.com/services/T00/B00/xxx', name: 'Slack Alerts' },
        responseExample: {
          webhook: {
            id: 'wh-abc123',
            name: 'Slack Alerts',
            url: 'https://hooks.slack.com/services/T00/B00/xxx',
            enabled: true,
            hasSecret: false,
            createdAt: '2026-03-27T10:00:00.000Z',
          },
        },
      },
      {
        id: 'update-webhook',
        method: 'PATCH',
        path: '/api/webhooks',
        description: 'Update an existing webhook. Can change URL, name, secret, or toggle enabled status.',
        params: [
          { name: 'id', type: 'string', required: true, description: 'Webhook ID to update', example: 'wh-abc123' },
          { name: 'name', type: 'string', required: false, description: 'New friendly label', example: 'My Webhook' },
          { name: 'url', type: 'string', required: false, description: 'New delivery URL' },
          { name: 'enabled', type: 'boolean', required: false, description: 'Enable or disable deliveries', example: 'false' },
          { name: 'secret', type: 'string', required: false, description: 'New signing secret (empty string to remove)' },
        ],
        exampleBody: { id: 'wh-abc123', enabled: false },
        responseExample: {
          webhook: { id: 'wh-abc123', name: 'Slack Alerts', url: 'https://hooks.slack.com/services/T00/B00/xxx', enabled: false, hasSecret: false },
        },
      },
      {
        id: 'delete-webhook',
        method: 'DELETE',
        path: '/api/webhooks',
        description: 'Permanently delete a webhook by ID.',
        params: [
          { name: 'id', type: 'string', required: true, description: 'Webhook ID to delete', example: 'wh-abc123' },
        ],
        exampleBody: { id: 'wh-abc123' },
        responseExample: { ok: true },
      },
      {
        id: 'test-webhook',
        method: 'POST',
        path: '/api/webhooks/test',
        description: 'Send a test payload to a webhook URL to verify it is reachable and returning 2xx.',
        params: [
          { name: 'url', type: 'string', required: true, description: 'Target URL to test', example: 'https://hooks.slack.com/services/T00/B00/xxx' },
        ],
        exampleBody: { url: 'https://hooks.slack.com/services/T00/B00/xxx' },
        responseExample: { ok: true, status: 200, latencyMs: 142 },
      },
      {
        id: 'webhook-deliveries',
        method: 'GET',
        path: '/api/webhooks/[id]/deliveries',
        description: 'Retrieve the delivery log for a specific webhook. Returns all past delivery attempts with HTTP status codes, timestamps, latency, and error messages.',
        params: [
          { name: 'id', type: 'string', required: true, description: 'Webhook ID (path parameter)', example: 'wh-abc123' },
        ],
        responseExample: {
          deliveries: [
            { id: 'del-1', webhookId: 'wh-abc123', status: 'success', statusCode: 200, timestamp: '2026-03-27T10:00:00.000Z', latencyMs: 142 },
            { id: 'del-2', webhookId: 'wh-abc123', status: 'failed', statusCode: 500, timestamp: '2026-03-27T09:00:00.000Z', error: 'Internal Server Error' },
          ],
        },
      },
      {
        id: 'test-webhook-id',
        method: 'POST',
        path: '/api/webhooks/[id]/test',
        description: 'Send a test signal payload to a specific registered webhook. Useful for verifying delivery and payload formatting after registration.',
        params: [
          { name: 'id', type: 'string', required: true, description: 'Webhook ID (path parameter)', example: 'wh-abc123' },
        ],
        exampleBody: {},
        responseExample: { ok: true, statusCode: 200, error: null },
      },
      {
        id: 'dispatch-webhooks',
        method: 'POST',
        path: '/api/webhooks/dispatch',
        description: 'Dispatch a signal event to all active registered webhooks asynchronously (fire-and-forget). Used internally by the signal engine when new signals are generated.',
        params: [
          { name: 'event', type: 'string', required: true, description: 'Event type identifier', example: 'signal.new' },
          { name: 'signal', type: 'object', required: true, description: 'Signal payload to deliver to all webhooks' },
        ],
        exampleBody: { event: 'signal.new', signal: { symbol: 'XAUUSD', direction: 'BUY', confidence: 82, entry: 2315.50 } },
        responseExample: { ok: true, dispatched: 3 },
      },
    ],
  },
  {
    id: 'telegram',
    label: 'Telegram',
    endpoints: [
      {
        id: 'send-telegram',
        method: 'POST',
        path: '/api/telegram',
        description:
          'Send a signal notification via Telegram bot, or send a test connection message. Requires your bot token and chat ID.',
        params: [
          { name: 'botToken', type: 'string', required: true, description: 'Bot token from @BotFather', example: '123456:ABC-DEF...' },
          { name: 'chatId', type: 'string', required: true, description: 'Target chat / channel ID', example: '-100123456789' },
          { name: 'test', type: 'boolean', required: false, description: 'Send a test message instead of a signal', example: 'true' },
          { name: 'signal', type: 'object', required: false, description: 'Signal payload (symbol, direction, confidence, entry, stopLoss, takeProfit)' },
        ],
        exampleBody: { botToken: '123456:ABC-DEF...', chatId: '-100123456789', test: true },
        responseExample: { ok: true, message: 'Test message sent' },
      },
      {
        id: 'telegram-status',
        method: 'GET',
        path: '/api/telegram/status',
        description: 'Check whether a Telegram bot token is configured in the environment and report connection status.',
        responseExample: { connected: true, botToken: '***configured***', chatId: '-100123456789' },
      },
      {
        id: 'telegram-send',
        method: 'POST',
        path: '/api/telegram/send',
        description: 'Broadcast a formatted trading signal to Telegram subscribers with optional pair and confidence filters. Supports rate-limited multi-subscriber delivery (~30 msg/sec).',
        params: [
          { name: 'signal', type: 'object', required: true, description: 'Signal payload (symbol, direction, confidence, entry, stopLoss, takeProfit)' },
          { name: 'broadcast', type: 'boolean', required: false, description: 'Send to all active subscribers (default: false)', example: 'true' },
          { name: 'chatId', type: 'string', required: false, description: 'Specific chat ID when broadcast is false', example: '-100123456789' },
          { name: 'test', type: 'boolean', required: false, description: 'Send a connectivity test message instead of a real signal', example: 'true' },
        ],
        exampleBody: {
          signal: { symbol: 'XAUUSD', direction: 'BUY', confidence: 82, entry: 2315.50, stopLoss: 2308.00, takeProfit: 2323.25 },
          broadcast: true,
        },
        responseExample: { ok: true, sent: 4, failed: 0 },
      },
      {
        id: 'telegram-bot-webhook',
        method: 'POST',
        path: '/api/telegram/webhook',
        description: 'Telegram Bot API webhook receiver. Registered with Telegram to handle incoming messages and commands (/start, /subscribe, /unsubscribe, /signals, /pairs, /settings, /help). Not intended for direct calls.',
        params: [
          { name: 'update_id', type: 'number', required: true, description: 'Telegram update ID (injected by Telegram servers)', example: '123456789' },
          { name: 'message', type: 'object', required: false, description: 'Telegram message object containing chat, text, and from fields' },
        ],
        exampleBody: { update_id: 123456789, message: { chat: { id: -100123456789 }, text: '/subscribe', from: { username: 'trader' } } },
        responseExample: { ok: true },
      },
    ],
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    endpoints: [
      {
        id: 'get-leaderboard',
        method: 'GET',
        path: '/api/leaderboard',
        description: 'Asset performance leaderboard ranked by hit rate, total signals, or average confidence. Pass a pair filter to retrieve its full signal history instead of the ranked table.',
        params: [
          { name: 'period', type: 'string', required: false, description: 'Lookback window: 7d, 30d, or all (default: 30d)', example: '30d' },
          { name: 'sort', type: 'string', required: false, description: 'Rank by: hitRate, totalSignals, or avgConfidence (default: hitRate)', example: 'hitRate' },
          { name: 'pair', type: 'string', required: false, description: 'Filter to a single symbol — returns its signal history (max 50)', example: 'XAUUSD' },
        ],
        responseExample: {
          period: '30d',
          sort: 'hitRate',
          count: 12,
          leaderboard: [
            { rank: 1, symbol: 'XAUUSD', hitRate: 0.78, totalSignals: 27, avgConfidence: 79, pnl: 420.5 },
            { rank: 2, symbol: 'BTCUSD', hitRate: 0.71, totalSignals: 34, avgConfidence: 75, pnl: 310.2 },
          ],
        },
      },
    ],
  },
  {
    id: 'strategies',
    label: 'Strategies',
    endpoints: [
      {
        id: 'list-strategies',
        method: 'GET',
        path: '/api/strategies',
        description: 'List all strategy presets and custom strategies. Returns indicator configs, applicable timeframes, risk settings, and simulated performance for each entry.',
        responseExample: {
          strategies: [
            {
              id: 'momentum-scalper',
              name: 'Momentum Scalper',
              description: 'Short-term momentum entries on M5/M15 using RSI + MACD.',
              indicators: [{ name: 'RSI', period: 14 }, { name: 'MACD' }],
              timeframes: ['M5', 'M15'],
              risk: { stopLossPct: 0.5, takeProfitPct: 1.0, riskRewardRatio: 2 },
              performance: { winRate: 0.63, avgRR: 1.8, totalTrades: 120 },
              isPreset: true,
            },
          ],
        },
      },
      {
        id: 'create-strategy',
        method: 'POST',
        path: '/api/strategies',
        description: 'Save a custom strategy configuration. Provide a name, indicator settings, applicable timeframes, and optional risk parameters.',
        params: [
          { name: 'name', type: 'string', required: true, description: 'Strategy name', example: 'My Strategy' },
          { name: 'description', type: 'string', required: false, description: 'Short description', example: 'RSI reversal on H4' },
          { name: 'indicators', type: 'array', required: true, description: 'Indicator configs (name, period, optional params)', example: '[{"name":"RSI","period":14}]' },
          { name: 'timeframes', type: 'array', required: true, description: 'Applicable timeframes', example: '["H1","H4"]' },
          { name: 'risk', type: 'object', required: false, description: 'Risk config (stopLossPct, takeProfitPct, riskRewardRatio)' },
        ],
        exampleBody: {
          name: 'My Strategy',
          description: 'RSI reversal on H4',
          indicators: [{ name: 'RSI', period: 14 }],
          timeframes: ['H1', 'H4'],
          risk: { stopLossPct: 1.0, takeProfitPct: 2.0, riskRewardRatio: 2 },
        },
        responseExample: {
          strategy: {
            id: 'custom-1711530000000',
            name: 'My Strategy',
            description: 'RSI reversal on H4',
            indicators: [{ name: 'RSI', period: 14 }],
            timeframes: ['H1', 'H4'],
            risk: { stopLossPct: 1.0, takeProfitPct: 2.0, riskRewardRatio: 2 },
            isPreset: false,
          },
        },
      },
    ],
  },
  {
    id: 'explain',
    label: 'Explain',
    endpoints: [
      {
        id: 'explain-signal',
        method: 'POST',
        path: '/api/explain',
        description: 'Generate a two-sentence natural-language explanation for a trading signal: technical reason + key risk. Uses Claude AI when ANTHROPIC_API_KEY is set; falls back to deterministic explanations.',
        params: [
          { name: 'symbol', type: 'string', required: true, description: 'Trading pair', example: 'XAUUSD' },
          { name: 'direction', type: 'string', required: true, description: 'BUY or SELL', example: 'BUY' },
          { name: 'confidence', type: 'number', required: true, description: 'Signal confidence score (0–100)', example: '82' },
          { name: 'entry', type: 'number', required: true, description: 'Entry price', example: '2315.50' },
          { name: 'timeframe', type: 'string', required: true, description: 'Timeframe: M5, M15, H1, H4, D1', example: 'H1' },
          { name: 'indicators', type: 'object', required: false, description: 'Optional indicator snapshot for richer AI explanations' },
        ],
        exampleBody: { symbol: 'XAUUSD', direction: 'BUY', confidence: 82, entry: 2315.50, timeframe: 'H1' },
        responseExample: {
          explanation: 'RSI crossed above 50 with a bullish MACD crossover on H1, confirming a momentum shift in favor of buyers. Watch for a rejection at the 2320 resistance level as the primary risk to this setup.',
          source: 'ai',
        },
      },
    ],
  },
  {
    id: 'tpsl',
    label: 'TP / SL',
    endpoints: [
      {
        id: 'calculate-tpsl',
        method: 'POST',
        path: '/api/tpsl',
        description: 'Calculate Take Profit and Stop Loss levels using ATR-based stops and Fibonacci extensions. Returns three TP targets, nearest support/resistance zones, and a position size based on account risk percentage.',
        params: [
          { name: 'symbol', type: 'string', required: true, description: 'Trading pair', example: 'XAUUSD' },
          { name: 'direction', type: 'string', required: true, description: 'BUY or SELL', example: 'BUY' },
          { name: 'entry', type: 'number', required: true, description: 'Entry price', example: '2315.50' },
          { name: 'accountSize', type: 'number', required: false, description: 'Account size in USD for position sizing (default: 10000)', example: '10000' },
          { name: 'riskPct', type: 'number', required: false, description: 'Risk per trade as % of account (default: 1)', example: '1' },
          { name: 'atrMultiplier', type: 'number', required: false, description: 'ATR multiplier for stop distance (default: 1.5)', example: '1.5' },
        ],
        exampleBody: { symbol: 'XAUUSD', direction: 'BUY', entry: 2315.50, accountSize: 10000, riskPct: 1 },
        responseExample: {
          symbol: 'XAUUSD',
          direction: 'BUY',
          entry: 2315.50,
          stopLoss: 2308.00,
          takeProfit1: 2323.25,
          takeProfit2: 2334.25,
          takeProfit3: 2345.25,
          riskRewardRatios: [1.0, 2.5, 4.0],
          positionSize: 0.13,
          riskAmount: 100,
          supportResistance: { nearestSupport: 2310.0, nearestResistance: 2325.0 },
        },
      },
    ],
  },
  {
    id: 'embed',
    label: 'Embed',
    endpoints: [
      {
        id: 'get-embed-script',
        method: 'GET',
        path: '/api/embed',
        description:
          'Returns a JavaScript loader script (application/javascript) that injects a signal card iframe into any webpage. Drop the <script> tag on your site to embed live signals.',
        params: [
          { name: 'pair', type: 'string', required: false, description: 'Trading symbol to display (default: BTCUSD)', example: 'XAUUSD' },
        ],
        responseExample: '(function(){ /* injects iframe for /embed/XAUUSD */ })();',
      },
    ],
  },
  {
    id: 'health',
    label: 'Health',
    endpoints: [
      {
        id: 'health-check',
        method: 'GET',
        path: '/api/health',
        description: 'Server health check endpoint. Returns status, semantic version, process uptime, and Node.js version.',
        responseExample: {
          status: 'ok',
          version: '1.0.0',
          uptime: 3642.5,
          timestamp: '2026-03-27T10:00:00.000Z',
          node: 'v22.0.0',
          build: 'development',
        },
      },
    ],
  },
];

// ─── Utilities ───────────────────────────────────────────────────────────────

const METHOD_STYLES: Record<HttpMethod, { badge: string; dot: string }> = {
  GET:    { badge: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20', dot: 'bg-emerald-400' },
  POST:   { badge: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',         dot: 'bg-blue-400' },
  PATCH:  { badge: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',      dot: 'bg-amber-400' },
  DELETE: { badge: 'text-rose-400 bg-rose-500/10 border border-rose-500/20',         dot: 'bg-rose-400' },
};

function syntaxHighlight(json: string): string {
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      const safe = match.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let color: string;
      if (match.startsWith('"')) {
        color = /:\s*$/.test(match) ? '#93c5fd' : '#86efac';
      } else if (match === 'true' || match === 'false') {
        color = '#fb923c';
      } else if (match === 'null') {
        color = '#f87171';
      } else {
        color = '#fbbf24';
      }
      return `<span style="color:${color}">${safe}</span>`;
    }
  );
}

function genCurl(endpoint: Endpoint, params: Record<string, string>, body: string): string {
  const isBody = endpoint.method !== 'GET';
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const url = new URL(endpoint.path, base);
  if (!isBody) {
    Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
  }
  const lines = [`curl -X ${endpoint.method} "${url.toString()}"`];
  if (isBody) {
    lines[0] += ' \\';
    lines.push('  -H "Content-Type: application/json" \\');
    if (body && body !== '{}') lines.push(`  -d '${body}'`);
    else lines[lines.length - 1] = lines[lines.length - 1].replace(' \\', '');
  }
  return lines.join('\n');
}

function genPython(endpoint: Endpoint, params: Record<string, string>, body: string): string {
  const isBody = endpoint.method !== 'GET';
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const url = `${base}${endpoint.path}`;
  const lines = ['import requests', ''];
  const filled = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
  if (!isBody && Object.keys(filled).length > 0) {
    lines.push(`params = ${JSON.stringify(filled, null, 2)}`, '');
    lines.push(`response = requests.get("${url}", params=params)`);
  } else if (isBody && body && body !== '{}') {
    lines.push(`payload = ${body}`, '');
    lines.push(`response = requests.${endpoint.method.toLowerCase()}("${url}", json=payload)`);
  } else {
    lines.push(`response = requests.${endpoint.method.toLowerCase()}("${url}")`);
  }
  lines.push('print(response.json())');
  return lines.join('\n');
}

function genJs(endpoint: Endpoint, params: Record<string, string>, body: string): string {
  const isBody = endpoint.method !== 'GET';
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const filled = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
  let urlExpr = `"${base}${endpoint.path}"`;
  if (!isBody && Object.keys(filled).length > 0) {
    urlExpr = `\`${base}${endpoint.path}?\${new URLSearchParams(${JSON.stringify(filled)}).toString()}\``;
  }
  const opts: string[] = [`  method: "${endpoint.method}"`];
  if (isBody && body && body !== '{}') {
    opts.push('  headers: { "Content-Type": "application/json" }');
    opts.push(`  body: JSON.stringify(${body})`);
  }
  return [
    `const res = await fetch(${urlExpr}, {`,
    opts.join(',\n') + ',',
    '});',
    'const data = await res.json();',
    'console.log(data);',
  ].join('\n');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: HttpMethod }) {
  const s = METHOD_STYLES[method];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono tracking-wider ${s.badge}`}>
      {method}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
    >
      {copied ? (
        <><span className="text-emerald-400">✓</span> Copied</>
      ) : (
        <><span>⎘</span> Copy</>
      )}
    </button>
  );
}

interface PlaygroundState {
  params: Record<string, string>;
  body: string;
  response: { status: number; data: unknown; time: number } | null;
  loading: boolean;
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const isBody = endpoint.method !== 'GET';
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'docs' | 'try' | 'code'>('docs');
  const [lang, setLang] = useState<'curl' | 'python' | 'js'>('curl');

  const [pg, setPg] = useState<PlaygroundState>({
    params: Object.fromEntries((endpoint.params ?? []).map(p => [p.name, p.example ?? ''])),
    body: endpoint.exampleBody ? JSON.stringify(endpoint.exampleBody, null, 2) : '{}',
    response: null,
    loading: false,
  });

  const setParam = (name: string, value: string) =>
    setPg(s => ({ ...s, params: { ...s.params, [name]: value } }));

  const execute = useCallback(async () => {
    setPg(s => ({ ...s, loading: true, response: null }));
    const start = Date.now();
    try {
      const url = new URL(endpoint.path, window.location.origin);
      if (!isBody) {
        Object.entries(pg.params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
      }
      const opts: RequestInit = { method: endpoint.method };
      if (isBody) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = pg.body;
      }
      const res = await fetch(url.toString(), opts);
      const ct = res.headers.get('content-type') ?? '';
      const data: unknown = ct.includes('json') ? await res.json() : await res.text();
      setPg(s => ({ ...s, loading: false, response: { status: res.status, data, time: Date.now() - start } }));
    } catch (err) {
      setPg(s => ({ ...s, loading: false, response: { status: 0, data: { error: String(err) }, time: Date.now() - start } }));
    }
  }, [endpoint, isBody, pg.params, pg.body]);

  const snippets: Record<'curl' | 'python' | 'js', string> = {
    curl: genCurl(endpoint, pg.params, pg.body),
    python: genPython(endpoint, pg.params, pg.body),
    js: genJs(endpoint, pg.params, pg.body),
  };

  const statusColor = (s: number) =>
    s >= 200 && s < 300 ? 'text-emerald-400' : s >= 400 ? 'text-rose-400' : 'text-zinc-400';

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors group"
      >
        <MethodBadge method={endpoint.method} />
        <span className="font-mono text-sm text-zinc-200 flex-1 truncate">{endpoint.path}</span>
        <span className="text-xs text-zinc-500 hidden sm:block max-w-[380px] truncate">{endpoint.description}</span>
        <span className={`text-zinc-600 group-hover:text-zinc-400 transition-transform duration-200 ml-2 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-[#1a1a1a]">
          {/* Description */}
          <div className="px-5 pt-4 pb-2 text-sm text-zinc-400 leading-relaxed">
            {endpoint.description}
          </div>

          {/* Tabs */}
          <div className="flex gap-0 px-5 pt-2 border-b border-[#1a1a1a]">
            {(['docs', 'try', 'code'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-medium capitalize border-b-2 transition-colors -mb-px ${
                  tab === t
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t === 'try' ? 'Try It' : t === 'docs' ? 'Reference' : 'Code'}
              </button>
            ))}
          </div>

          {/* Tab: Reference */}
          {tab === 'docs' && (
            <div className="p-5 space-y-5">
              {endpoint.params && endpoint.params.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    {isBody ? 'Request Body' : 'Query Parameters'}
                  </h4>
                  <div className="rounded-lg border border-[#1a1a1a] overflow-x-auto">
                    <table className="w-full min-w-[480px] text-xs">
                      <thead>
                        <tr className="bg-white/[0.02] text-zinc-500 text-left">
                          <th className="px-4 py-2.5 font-medium w-36">Name</th>
                          <th className="px-4 py-2.5 font-medium w-20">Type</th>
                          <th className="px-4 py-2.5 font-medium w-20">Required</th>
                          <th className="px-4 py-2.5 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1a1a1a]">
                        {endpoint.params.map(p => (
                          <tr key={p.name} className="hover:bg-white/[0.01]">
                            <td className="px-4 py-3 font-mono text-zinc-200">{p.name}</td>
                            <td className="px-4 py-3 text-amber-400/80 font-mono">{p.type}</td>
                            <td className="px-4 py-3">
                              {p.required ? (
                                <span className="text-rose-400 font-medium">required</span>
                              ) : (
                                <span className="text-zinc-600">optional</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">
                              {p.description}
                              {p.example && (
                                <span className="ml-2 font-mono text-zinc-600">e.g. {p.example}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Response Example</h4>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#050505]">
                  <pre
                    className="p-4 text-xs font-mono leading-5 overflow-auto max-h-72 text-zinc-400"
                    dangerouslySetInnerHTML={{
                      __html: syntaxHighlight(
                        typeof endpoint.responseExample === 'string'
                          ? endpoint.responseExample
                          : JSON.stringify(endpoint.responseExample, null, 2)
                      ),
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Try It */}
          {tab === 'try' && (
            <div className="p-5 space-y-4">
              {!isBody && endpoint.params && endpoint.params.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Query Parameters</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {endpoint.params.map(p => (
                      <div key={p.name}>
                        <label className="block text-[11px] font-mono text-zinc-500 mb-1">
                          {p.name}
                          {p.required && <span className="text-rose-400 ml-1">*</span>}
                          <span className="text-zinc-700 ml-1">({p.type})</span>
                        </label>
                        <input
                          type="text"
                          value={pg.params[p.name] ?? ''}
                          onChange={e => setParam(p.name, e.target.value)}
                          placeholder={p.example ?? ''}
                          className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-[#1a1a1a] text-xs font-mono text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-emerald-500/40 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isBody && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Request Body (JSON)</h4>
                  <textarea
                    value={pg.body}
                    onChange={e => setPg(s => ({ ...s, body: e.target.value }))}
                    rows={8}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#050505] border border-[#1a1a1a] text-xs font-mono text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-emerald-500/40 transition-colors resize-y"
                    spellCheck={false}
                  />
                </div>
              )}

              <button
                onClick={execute}
                disabled={pg.loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pg.loading ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                ) : (
                  <><Play className="w-3 h-3" /> Execute</>
                )}
              </button>

              {pg.response && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-sm font-bold tabular-nums ${statusColor(pg.response.status)}`}>
                      {pg.response.status || 'Error'}
                    </span>
                    <span className="text-xs text-zinc-600 font-mono tabular-nums">{pg.response.time}ms</span>
                  </div>
                  <div className="rounded-lg border border-[#1a1a1a] bg-[#050505]">
                    <pre
                      className="p-4 text-xs font-mono leading-5 overflow-auto max-h-72 text-zinc-400"
                      dangerouslySetInnerHTML={{
                        __html: syntaxHighlight(
                          typeof pg.response.data === 'string'
                            ? pg.response.data
                            : JSON.stringify(pg.response.data, null, 2)
                        ),
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Code */}
          {tab === 'code' && (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {(['curl', 'python', 'js'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                        lang === l
                          ? 'bg-white/10 text-zinc-200 border border-white/15'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      {l === 'js' ? 'JavaScript' : l === 'python' ? 'Python' : 'curl'}
                    </button>
                  ))}
                </div>
                <CopyButton text={snippets[lang]} />
              </div>
              <div className="rounded-lg border border-[#1a1a1a] bg-[#050505]">
                <pre className="p-4 text-xs font-mono leading-5 overflow-auto text-zinc-400 whitespace-pre">
                  {snippets[lang]}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const totalEndpoints = SPEC.reduce((n, c) => n + c.endpoints.length, 0);

  const filtered = SPEC.map(cat => ({
    ...cat,
    endpoints: cat.endpoints.filter(ep => {
      const inCategory = activeCategory === 'all' || activeCategory === cat.id;
      if (!inCategory) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        ep.path.toLowerCase().includes(q) ||
        ep.description.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q)
      );
    }),
  })).filter(cat => cat.endpoints.length > 0);

  const visibleCount = filtered.reduce((n, c) => n + c.endpoints.length, 0);

  return (
    <div className="min-h-screen" style={{ background: '#050505', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      {/* Header */}
      <div className="border-b border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono text-zinc-500 tracking-wider uppercase">REST API v1</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                OpenAPI 3.0
              </span>
            </div>
            <a
              href="/api/openapi"
              download="tradeclaw-openapi.json"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-emerald-400">
                <path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Download OpenAPI
            </a>
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-3">API Reference</h1>
          <p className="text-zinc-400 max-w-xl leading-relaxed">
            Programmatic access to TradeClaw signals, paper trading, webhooks, and more.
            All endpoints return JSON. Public endpoints work without authentication — add an API key for higher rate limits.
          </p>

          {/* Authentication */}
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 max-w-xl">
            <p className="text-xs font-semibold text-emerald-400 mb-2">Authentication</p>
            <p className="text-xs text-zinc-400 mb-3">
              Public endpoints work without a key. Add an API key for rate-limited access (1,000 req/hour free).
              Pass as a query param or <code className="font-mono text-zinc-300">Authorization</code> header.{' '}
              <a href="/api-keys" className="text-emerald-400 hover:underline">Get a free key →</a>
            </p>
            <pre className="text-xs font-mono bg-black/40 rounded-lg p-3 text-emerald-300 overflow-x-auto">
{`# Query param
curl "https://tradeclaw.win/api/signals?api_key=tc_live_YOUR_KEY"

# Bearer header
curl -H "Authorization: Bearer tc_live_YOUR_KEY" \\
  https://tradeclaw.win/api/signals`}
            </pre>
          </div>

          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="font-mono text-zinc-400 tabular-nums">{totalEndpoints}</span> endpoints
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400/60 inline-block" />
              Base URL: <span className="font-mono text-zinc-400">http://localhost:3000</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-20 md:pb-8 space-y-6">
        {/* Search + Category Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">⌕</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search endpoints…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-emerald-500/40 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 flex-shrink-0">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'all'
                  ? 'bg-white/10 text-zinc-200 border border-white/15'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              All
            </button>
            {SPEC.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-white/10 text-zinc-200 border border-white/15'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results summary */}
        {search && (
          <p className="text-xs text-zinc-600 font-mono">
            {visibleCount} result{visibleCount !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </p>
        )}

        {/* Method legend */}
        <div className="flex flex-wrap gap-3">
          {(Object.entries(METHOD_STYLES) as [HttpMethod, typeof METHOD_STYLES[HttpMethod]][]).map(([m, s]) => (
            <span key={m} className="flex items-center gap-1.5 text-xs text-zinc-600">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {m}
            </span>
          ))}
        </div>

        {/* Endpoint groups */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">
            <div className="text-2xl mb-2">¬</div>
            <p className="text-sm">No endpoints match &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          filtered.map(cat => (
            <div key={cat.id} className="space-y-2">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pt-2">
                {cat.label}
                <span className="ml-2 text-zinc-700 font-mono">{cat.endpoints.length}</span>
              </h2>
              <div className="space-y-2">
                {cat.endpoints.map(ep => (
                  <EndpointCard key={ep.id} endpoint={ep} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1a1a1a] mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <span className="text-xs text-zinc-700 font-mono">TradeClaw API · v1</span>
          <a
            href="/dashboard"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
