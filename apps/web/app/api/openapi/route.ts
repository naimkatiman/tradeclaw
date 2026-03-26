import { NextResponse } from 'next/server';

// GET /api/openapi — serve OpenAPI 3.0 spec as JSON
export async function GET() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'TradeClaw API',
      version: '1.0.0',
      description:
        'Programmatic access to TradeClaw signals, paper trading, webhooks, Telegram, and more. All endpoints return JSON. No authentication required for public endpoints.',
      contact: {
        name: 'TradeClaw',
        url: 'https://github.com/tradeclaw/tradeclaw',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
    tags: [
      { name: 'Signals', description: 'Trading signal generation and multi-timeframe analysis' },
      { name: 'Leaderboard', description: 'Asset performance rankings' },
      { name: 'Strategies', description: 'Strategy presets and custom configurations' },
      { name: 'Explain', description: 'AI-powered signal explanations' },
      { name: 'TP/SL', description: 'Take Profit and Stop Loss calculator' },
      { name: 'Paper Trading', description: 'Virtual portfolio simulation' },
      { name: 'Webhooks', description: 'Webhook registration and delivery management' },
      { name: 'Telegram', description: 'Telegram bot notifications and webhook' },
      { name: 'Embed', description: 'Embeddable signal widget' },
      { name: 'Health', description: 'Server health check' },
    ],
    paths: {
      '/api/signals': {
        get: {
          tags: ['Signals'],
          summary: 'List trading signals',
          description:
            'Returns BUY/SELL signals from multi-indicator TA (RSI, MACD, EMA, Stochastic, Bollinger Bands) with optional filters.',
          operationId: 'getSignals',
          parameters: [
            { name: 'symbol', in: 'query', schema: { type: 'string' }, description: 'Filter by trading pair', example: 'XAUUSD' },
            { name: 'timeframe', in: 'query', schema: { type: 'string', enum: ['M5', 'M15', 'H1', 'H4', 'D1'] }, description: 'Filter by timeframe' },
            { name: 'direction', in: 'query', schema: { type: 'string', enum: ['BUY', 'SELL'] }, description: 'Filter by signal direction' },
            { name: 'minConfidence', in: 'query', schema: { type: 'number', minimum: 0, maximum: 100 }, description: 'Minimum confidence score' },
          ],
          responses: {
            '200': {
              description: 'Signal list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer' },
                      timestamp: { type: 'string', format: 'date-time' },
                      engine: { type: 'object', properties: { real: { type: 'integer' }, fallback: { type: 'integer' }, version: { type: 'string' } } },
                      signals: { type: 'array', items: { $ref: '#/components/schemas/Signal' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/signals/multi-tf': {
        get: {
          tags: ['Signals'],
          summary: 'Multi-timeframe confluence analysis',
          description: 'Evaluates H1, H4, D1 signals per symbol and returns agreement scores. 3/3 alignment yields +15 confluence bonus.',
          operationId: 'getMultiTfSignals',
          parameters: [
            { name: 'pair', in: 'query', schema: { type: 'string' }, description: 'Filter to a single symbol', example: 'BTCUSD' },
          ],
          responses: {
            '200': {
              description: 'Multi-timeframe confluence results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                      count: { type: 'integer' },
                      summary: {
                        type: 'object',
                        properties: {
                          bullish: { type: 'integer' },
                          bearish: { type: 'integer' },
                          conflicted: { type: 'integer' },
                          allAligned: { type: 'integer' },
                        },
                      },
                      results: { type: 'array', items: { $ref: '#/components/schemas/MultitfResult' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/prices': {
        get: {
          tags: ['Signals'],
          summary: 'Current market prices',
          description: 'Live prices for all 12 supported symbols. Sources: CoinGecko (crypto), Stooq (forex/metals).',
          operationId: 'getPrices',
          responses: {
            '200': {
              description: 'Price map',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                      count: { type: 'integer' },
                      prices: { type: 'object', additionalProperties: { $ref: '#/components/schemas/PriceEntry' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/leaderboard': {
        get: {
          tags: ['Leaderboard'],
          summary: 'Asset performance leaderboard',
          description: 'Ranked by hit rate, total signals, or average confidence. Pass pair to get its full signal history instead.',
          operationId: 'getLeaderboard',
          parameters: [
            { name: 'period', in: 'query', schema: { type: 'string', enum: ['7d', '30d', 'all'], default: '30d' }, description: 'Lookback window' },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['hitRate', 'totalSignals', 'avgConfidence'], default: 'hitRate' }, description: 'Sort field' },
            { name: 'pair', in: 'query', schema: { type: 'string' }, description: 'Filter to a single pair (returns signal history, max 50)' },
          ],
          responses: {
            '200': {
              description: 'Leaderboard data',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      period: { type: 'string' },
                      sort: { type: 'string' },
                      count: { type: 'integer' },
                      leaderboard: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            rank: { type: 'integer' },
                            symbol: { type: 'string' },
                            hitRate: { type: 'number' },
                            totalSignals: { type: 'integer' },
                            avgConfidence: { type: 'number' },
                            pnl: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/strategies': {
        get: {
          tags: ['Strategies'],
          summary: 'List strategy presets',
          description: 'Returns built-in and custom strategies with indicators, timeframes, risk settings, and simulated performance.',
          operationId: 'listStrategies',
          responses: {
            '200': {
              description: 'Strategy list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { strategies: { type: 'array', items: { $ref: '#/components/schemas/Strategy' } } },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Strategies'],
          summary: 'Create custom strategy',
          description: 'Save a custom strategy configuration.',
          operationId: 'createStrategy',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateStrategyBody' },
                example: {
                  name: 'My Strategy',
                  description: 'RSI reversal on H4',
                  indicators: [{ name: 'RSI', period: 14 }],
                  timeframes: ['H1', 'H4'],
                  risk: { stopLossPct: 1.0, takeProfitPct: 2.0, riskRewardRatio: 2 },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Created strategy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { strategy: { $ref: '#/components/schemas/Strategy' } },
                  },
                },
              },
            },
          },
        },
      },
      '/api/explain': {
        post: {
          tags: ['Explain'],
          summary: 'Explain a trading signal',
          description: 'Two-sentence explanation: technical reason + key risk. Uses Claude AI when ANTHROPIC_API_KEY is set; falls back to deterministic explanations.',
          operationId: 'explainSignal',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExplainBody' },
                example: { symbol: 'XAUUSD', direction: 'BUY', confidence: 82, entry: 2315.5, timeframe: 'H1' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Signal explanation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      explanation: { type: 'string' },
                      source: { type: 'string', enum: ['ai', 'fallback'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/tpsl': {
        post: {
          tags: ['TP/SL'],
          summary: 'Calculate TP/SL levels',
          description: 'ATR-based stop + Fibonacci TP targets with position sizing.',
          operationId: 'calculateTpsl',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TpslBody' },
                example: { symbol: 'XAUUSD', direction: 'BUY', entry: 2315.5, accountSize: 10000, riskPct: 1 },
              },
            },
          },
          responses: {
            '200': {
              description: 'TP/SL calculation result',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TpslResult' },
                },
              },
            },
          },
        },
      },
      '/api/paper-trading': {
        get: {
          tags: ['Paper Trading'],
          summary: 'Get virtual portfolio',
          operationId: 'getPortfolio',
          responses: {
            '200': {
              description: 'Portfolio state',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Portfolio' } } },
            },
          },
        },
      },
      '/api/paper-trading/open': {
        post: {
          tags: ['Paper Trading'],
          summary: 'Open virtual position',
          operationId: 'openPosition',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['symbol', 'direction'],
                  properties: {
                    symbol: { type: 'string', example: 'XAUUSD' },
                    direction: { type: 'string', enum: ['BUY', 'SELL'] },
                    quantity: { type: 'number', default: 0.1 },
                    signalId: { type: 'string' },
                    stopLoss: { type: 'number' },
                    takeProfit: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Opened position',
              content: { 'application/json': { schema: { type: 'object', properties: { position: { $ref: '#/components/schemas/Position' }, balance: { type: 'number' } } } } },
            },
          },
        },
      },
      '/api/paper-trading/close': {
        post: {
          tags: ['Paper Trading'],
          summary: 'Close virtual position',
          operationId: 'closePosition',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['positionId'],
                  properties: {
                    positionId: { type: 'string', example: 'pos-1711530000000' },
                    exitPrice: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Closed trade', content: { 'application/json': { schema: { type: 'object' } } } } },
        },
      },
      '/api/paper-trading/close-all': {
        post: {
          tags: ['Paper Trading'],
          summary: 'Close all virtual positions',
          operationId: 'closeAllPositions',
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { '200': { description: 'Closed count and balance', content: { 'application/json': { schema: { type: 'object', properties: { closed: { type: 'integer' }, balance: { type: 'number' } } } } } } },
        },
      },
      '/api/paper-trading/follow-signal': {
        post: {
          tags: ['Paper Trading'],
          summary: 'Auto-follow a signal',
          operationId: 'followSignal',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['symbol', 'direction', 'entry', 'stopLoss', 'takeProfit'],
                  properties: {
                    symbol: { type: 'string' },
                    direction: { type: 'string', enum: ['BUY', 'SELL'] },
                    entry: { type: 'number' },
                    stopLoss: { type: 'number' },
                    takeProfit: { type: 'number' },
                    id: { type: 'string' },
                    positionSizePct: { type: 'number', default: 1 },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Opened position', content: { 'application/json': { schema: { type: 'object' } } } } },
        },
      },
      '/api/paper-trading/reset': {
        post: {
          tags: ['Paper Trading'],
          summary: 'Reset virtual portfolio',
          operationId: 'resetPortfolio',
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { '200': { description: 'Reset confirmation', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, balance: { type: 'number' } } } } } } },
        },
      },
      '/api/paper-trading/stats': {
        get: {
          tags: ['Paper Trading'],
          summary: 'Portfolio performance stats',
          operationId: 'getPortfolioStats',
          responses: { '200': { description: 'Stats and equity curve', content: { 'application/json': { schema: { type: 'object' } } } } },
        },
      },
      '/api/webhooks': {
        get: {
          tags: ['Webhooks'],
          summary: 'List webhooks',
          operationId: 'listWebhooks',
          responses: { '200': { description: 'Webhook list', content: { 'application/json': { schema: { type: 'object', properties: { webhooks: { type: 'array', items: { $ref: '#/components/schemas/Webhook' } } } } } } } },
        },
        post: {
          tags: ['Webhooks'],
          summary: 'Create webhook',
          operationId: 'createWebhook',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    name: { type: 'string' },
                    secret: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Created webhook', content: { 'application/json': { schema: { type: 'object', properties: { webhook: { $ref: '#/components/schemas/Webhook' } } } } } } },
        },
        patch: {
          tags: ['Webhooks'],
          summary: 'Update webhook',
          operationId: 'updateWebhook',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    url: { type: 'string', format: 'uri' },
                    enabled: { type: 'boolean' },
                    secret: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Updated webhook', content: { 'application/json': { schema: { type: 'object' } } } } },
        },
        delete: {
          tags: ['Webhooks'],
          summary: 'Delete webhook',
          operationId: 'deleteWebhook',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
              },
            },
          },
          responses: { '200': { description: 'Deletion confirmation', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } } },
        },
      },
      '/api/webhooks/test': {
        post: {
          tags: ['Webhooks'],
          summary: 'Test a webhook URL',
          operationId: 'testWebhookUrl',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['url'], properties: { url: { type: 'string', format: 'uri' } } },
              },
            },
          },
          responses: { '200': { description: 'Test result', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, status: { type: 'integer' }, latencyMs: { type: 'integer' } } } } } } },
        },
      },
      '/api/webhooks/{id}/deliveries': {
        get: {
          tags: ['Webhooks'],
          summary: 'Get webhook delivery log',
          operationId: 'getWebhookDeliveries',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Webhook ID', example: 'wh-abc123' },
          ],
          responses: {
            '200': {
              description: 'Delivery records',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      deliveries: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            webhookId: { type: 'string' },
                            status: { type: 'string', enum: ['success', 'failed'] },
                            statusCode: { type: 'integer' },
                            timestamp: { type: 'string', format: 'date-time' },
                            latencyMs: { type: 'integer' },
                            error: { type: 'string', nullable: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '404': { description: 'Webhook not found' },
          },
        },
      },
      '/api/webhooks/{id}/test': {
        post: {
          tags: ['Webhooks'],
          summary: 'Test a registered webhook',
          operationId: 'testRegisteredWebhook',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Webhook ID', example: 'wh-abc123' },
          ],
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: {
            '200': {
              description: 'Test delivery result',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { ok: { type: 'boolean' }, statusCode: { type: 'integer', nullable: true }, error: { type: 'string', nullable: true } } },
                },
              },
            },
            '404': { description: 'Webhook not found' },
          },
        },
      },
      '/api/webhooks/dispatch': {
        post: {
          tags: ['Webhooks'],
          summary: 'Dispatch signal to all webhooks',
          description: 'Routes a signal event to all active registered webhooks asynchronously.',
          operationId: 'dispatchWebhooks',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['event', 'signal'],
                  properties: {
                    event: { type: 'string', example: 'signal.new' },
                    signal: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Dispatch result', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, dispatched: { type: 'integer' } } } } } } },
        },
      },
      '/api/telegram': {
        post: {
          tags: ['Telegram'],
          summary: 'Send Telegram notification',
          operationId: 'sendTelegram',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['botToken', 'chatId'],
                  properties: {
                    botToken: { type: 'string' },
                    chatId: { type: 'string' },
                    test: { type: 'boolean' },
                    signal: { $ref: '#/components/schemas/SignalInput' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Send result', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, message: { type: 'string' } } } } } } },
        },
      },
      '/api/telegram/status': {
        get: {
          tags: ['Telegram'],
          summary: 'Telegram bot status',
          operationId: 'telegramStatus',
          responses: { '200': { description: 'Connection status', content: { 'application/json': { schema: { type: 'object', properties: { connected: { type: 'boolean' }, botToken: { type: 'string' }, chatId: { type: 'string' } } } } } } },
        },
      },
      '/api/telegram/send': {
        post: {
          tags: ['Telegram'],
          summary: 'Broadcast signal to subscribers',
          description: 'Send a formatted signal to all active Telegram subscribers with optional filters.',
          operationId: 'broadcastTelegram',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['signal'],
                  properties: {
                    signal: { $ref: '#/components/schemas/SignalInput' },
                    broadcast: { type: 'boolean', default: false },
                    chatId: { type: 'string' },
                    test: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Broadcast result', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, sent: { type: 'integer' }, failed: { type: 'integer' } } } } } } },
        },
      },
      '/api/telegram/webhook': {
        post: {
          tags: ['Telegram'],
          summary: 'Telegram bot webhook receiver',
          description: 'Receives Telegram Bot API updates. Registered with Telegram — not intended for direct calls.',
          operationId: 'telegramWebhook',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['update_id'],
                  properties: {
                    update_id: { type: 'integer' },
                    message: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Acknowledged', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } } },
        },
      },
      '/api/embed': {
        get: {
          tags: ['Embed'],
          summary: 'Embed loader script',
          description: 'Returns a JS loader that injects a signal card iframe into any webpage.',
          operationId: 'getEmbedScript',
          parameters: [
            { name: 'pair', in: 'query', schema: { type: 'string' }, description: 'Symbol to display (default: BTCUSD)', example: 'XAUUSD' },
          ],
          responses: { '200': { description: 'JavaScript embed script', content: { 'application/javascript': { schema: { type: 'string' } } } } },
        },
      },
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          operationId: 'healthCheck',
          responses: {
            '200': {
              description: 'Server health',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      version: { type: 'string' },
                      uptime: { type: 'number' },
                      timestamp: { type: 'string', format: 'date-time' },
                      node: { type: 'string' },
                      build: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Signal: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            symbol: { type: 'string' },
            direction: { type: 'string', enum: ['BUY', 'SELL'] },
            confidence: { type: 'number' },
            entry: { type: 'number' },
            stopLoss: { type: 'number' },
            takeProfit1: { type: 'number' },
            takeProfit2: { type: 'number' },
            takeProfit3: { type: 'number' },
            timeframe: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['active', 'closed', 'expired'] },
            source: { type: 'string' },
          },
        },
        SignalInput: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            direction: { type: 'string', enum: ['BUY', 'SELL'] },
            confidence: { type: 'number' },
            entry: { type: 'number' },
            stopLoss: { type: 'number' },
            takeProfit: { type: 'number' },
          },
        },
        MultitfResult: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            dominantDirection: { type: 'string', enum: ['BUY', 'SELL'] },
            agreementCount: { type: 'integer' },
            confluenceBonus: { type: 'integer' },
            isConflicted: { type: 'boolean' },
            entry: { type: 'number' },
            timeframes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timeframe: { type: 'string' },
                  direction: { type: 'string' },
                  confidence: { type: 'number' },
                },
              },
            },
          },
        },
        PriceEntry: {
          type: 'object',
          properties: {
            price: { type: 'number' },
            change24h: { type: 'number' },
            source: { type: 'string' },
          },
        },
        Strategy: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            indicators: { type: 'array', items: { type: 'object' } },
            timeframes: { type: 'array', items: { type: 'string' } },
            risk: {
              type: 'object',
              properties: {
                stopLossPct: { type: 'number' },
                takeProfitPct: { type: 'number' },
                riskRewardRatio: { type: 'number' },
              },
            },
            performance: {
              type: 'object',
              properties: {
                winRate: { type: 'number' },
                avgRR: { type: 'number' },
                totalTrades: { type: 'integer' },
              },
            },
            isPreset: { type: 'boolean' },
          },
        },
        CreateStrategyBody: {
          type: 'object',
          required: ['name', 'indicators', 'timeframes'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            indicators: { type: 'array', items: { type: 'object' } },
            timeframes: { type: 'array', items: { type: 'string' } },
            risk: {
              type: 'object',
              properties: {
                stopLossPct: { type: 'number' },
                takeProfitPct: { type: 'number' },
                riskRewardRatio: { type: 'number' },
              },
            },
          },
        },
        ExplainBody: {
          type: 'object',
          required: ['symbol', 'direction', 'confidence', 'entry', 'timeframe'],
          properties: {
            symbol: { type: 'string' },
            direction: { type: 'string', enum: ['BUY', 'SELL'] },
            confidence: { type: 'number', minimum: 0, maximum: 100 },
            entry: { type: 'number' },
            timeframe: { type: 'string' },
            indicators: { type: 'object' },
          },
        },
        TpslBody: {
          type: 'object',
          required: ['symbol', 'direction', 'entry'],
          properties: {
            symbol: { type: 'string' },
            direction: { type: 'string', enum: ['BUY', 'SELL'] },
            entry: { type: 'number' },
            accountSize: { type: 'number', default: 10000 },
            riskPct: { type: 'number', default: 1 },
            atrMultiplier: { type: 'number', default: 1.5 },
          },
        },
        TpslResult: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            direction: { type: 'string' },
            entry: { type: 'number' },
            stopLoss: { type: 'number' },
            takeProfit1: { type: 'number' },
            takeProfit2: { type: 'number' },
            takeProfit3: { type: 'number' },
            riskRewardRatios: { type: 'array', items: { type: 'number' } },
            positionSize: { type: 'number' },
            riskAmount: { type: 'number' },
            supportResistance: {
              type: 'object',
              properties: {
                nearestSupport: { type: 'number' },
                nearestResistance: { type: 'number' },
              },
            },
          },
        },
        Portfolio: {
          type: 'object',
          properties: {
            balance: { type: 'number' },
            startingBalance: { type: 'number' },
            positions: { type: 'array', items: { $ref: '#/components/schemas/Position' } },
            trades: { type: 'array', items: { type: 'object' } },
            stats: { type: 'object' },
            equityCurve: { type: 'array', items: { type: 'number' } },
          },
        },
        Position: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            symbol: { type: 'string' },
            direction: { type: 'string', enum: ['BUY', 'SELL'] },
            entryPrice: { type: 'number' },
            quantity: { type: 'number' },
            openTime: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['open', 'closed'] },
          },
        },
        Webhook: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            enabled: { type: 'boolean' },
            hasSecret: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      'Content-Disposition': 'attachment; filename="tradeclaw-openapi.json"',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
