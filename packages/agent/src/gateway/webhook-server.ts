import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { BaseChannel } from '../channels/base.js';
import type { TradingSignal, Direction } from '@tradeclaw/signals';

interface TradingViewAlert {
  symbol?: string;
  action?: string;
  price?: number;
  volume?: number;
  message?: string;
  timeframe?: string;
  exchange?: string;
  [key: string]: unknown;
}

function parseTradingViewAlert(body: string): TradingViewAlert | null {
  try {
    return JSON.parse(body) as TradingViewAlert;
  } catch {
    const result: TradingViewAlert = {};
    const lines = body.split('\n');
    for (const line of lines) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length > 0) {
        const val = rest.join('=').trim();
        result[key.trim()] = isNaN(Number(val)) ? val : Number(val);
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  }
}

function alertToSignal(alert: TradingViewAlert): TradingSignal | null {
  if (!alert.symbol && !alert.action) return null;

  const rawDirection = (alert.action || '').toLowerCase();
  const direction: Direction = rawDirection.includes('buy') ? 'BUY' : 'SELL';
  const price = Number(alert.price) || 0;

  const volatilityPct = 0.005;
  const slDist = price * volatilityPct;
  const tp1Dist = slDist * 1.5;
  const tp2Dist = slDist * 2.618;
  const tp3Dist = slDist * 4.236;

  return {
    id: `TV-${Date.now().toString(36).toUpperCase()}`,
    symbol: (alert.symbol || 'UNKNOWN').toUpperCase().replace(/[^A-Z0-9]/g, ''),
    direction,
    confidence: 85,
    entry: price,
    stopLoss: direction === 'BUY' ? price - slDist : price + slDist,
    takeProfit1: direction === 'BUY' ? price + tp1Dist : price - tp1Dist,
    takeProfit2: direction === 'BUY' ? price + tp2Dist : price - tp2Dist,
    takeProfit3: direction === 'BUY' ? price + tp3Dist : price - tp3Dist,
    indicators: {
      rsi: { value: 50, signal: 'neutral' },
      macd: { histogram: direction === 'BUY' ? 0.1 : -0.1, signal: direction === 'BUY' ? 'bullish' : 'bearish' },
      ema: { trend: direction === 'BUY' ? 'up' : 'down', ema20: price, ema50: price, ema200: price },
      bollingerBands: { position: 'middle', bandwidth: 2.0 },
      stochastic: { k: 50, d: 50, signal: 'neutral' },
      support: [price - slDist * 2],
      resistance: [price + tp1Dist * 2],
    },
    timeframe: (alert.timeframe || 'H1') as TradingSignal['timeframe'],
    timestamp: new Date().toISOString(),
    status: 'active',
    skill: 'tradingview-webhook',
  };
}

export class WebhookServer {
  private server: ReturnType<typeof createServer> | null = null;
  private channels: BaseChannel[];
  private port: number;
  private secret?: string;
  private receivedCount = 0;

  constructor(channels: BaseChannel[], port = 8080, secret?: string) {
    this.channels = channels;
    this.port = port;
    this.secret = secret;
  }

  async start(): Promise<void> {
    this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', received: this.receivedCount }));
        return;
      }

      if (req.method === 'POST' && (req.url === '/webhook' || req.url === '/tv' || req.url === '/alert')) {
        const authHeader = req.headers['x-webhook-secret'] || req.headers['authorization'];
        if (this.secret && authHeader !== this.secret && authHeader !== `Bearer ${this.secret}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        const body = await new Promise<string>((resolve, reject) => {
          let data = '';
          req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          req.on('end', () => resolve(data));
          req.on('error', reject);
        });

        const alert = parseTradingViewAlert(body);
        if (!alert) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Could not parse alert body' }));
          return;
        }

        const signal = alertToSignal(alert);
        if (!signal) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid alert format \u2014 missing symbol or action' }));
          return;
        }

        this.receivedCount++;
        console.log(`[webhook] Received TradingView alert #${this.receivedCount}: ${signal.direction} ${signal.symbol} @ ${signal.entry}`);

        await Promise.allSettled(
          this.channels.map(channel =>
            channel.sendSignal(signal).catch((err: Error) =>
              console.error(`[webhook] Channel delivery error: ${err.message}`)
            )
          )
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, signal_id: signal.id }));
        return;
      }

      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end([
          'tradeclaw-agent webhook server',
          '',
          'Endpoints:',
          '  GET  /health           \u2192 health check',
          '  POST /webhook          \u2192 TradingView alert receiver',
          '  POST /tv               \u2192 alias for /webhook',
          '  POST /alert            \u2192 alias for /webhook',
          '',
          `Received: ${this.receivedCount} alerts`,
        ].join('\n'));
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    await new Promise<void>((resolve) => {
      this.server!.listen(this.port, resolve);
    });

    console.log(`[webhook] TradingView webhook server listening on port ${this.port}`);
    if (this.secret) {
      console.log(`[webhook] Secret authentication enabled`);
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
      this.server = null;
    }
  }

  getPort(): number {
    return this.port;
  }
}
