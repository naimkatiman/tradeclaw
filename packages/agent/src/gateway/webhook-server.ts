import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import type { BaseChannel } from '../channels/base.js';
import type { TradingSignal, Direction } from '@tradeclaw/signals';

const MAX_BODY_BYTES = 64 * 1024;

/**
 * Constant-time comparison of a provided auth header against the configured
 * secret. Accepts both the raw secret and a `Bearer <secret>` form. Length is
 * checked first so timingSafeEqual never throws on unequal-length buffers.
 */
function isAuthorized(authHeader: string, secret: string): boolean {
  const candidate = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : authHeader;
  const a = Buffer.from(candidate);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

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
  // A missing/unparseable price would build a signal with entry=0 and SL/TP off
  // 0, causing divide-by-zero downstream. Drop the alert instead.
  const price = Number(alert.price);
  if (!Number.isFinite(price) || price <= 0) return null;

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
        const rawHeader = req.headers['x-webhook-secret'] || req.headers['authorization'];
        const authHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
        if (this.secret && (!authHeader || !isAuthorized(authHeader, this.secret))) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        let body: string;
        try {
          body = await new Promise<string>((resolve, reject) => {
            let data = '';
            let bytes = 0;
            req.on('data', (chunk: Buffer) => {
              bytes += chunk.length;
              if (bytes > MAX_BODY_BYTES) {
                reject(new Error('PAYLOAD_TOO_LARGE'));
                req.destroy();
                return;
              }
              data += chunk.toString();
            });
            req.on('end', () => resolve(data));
            req.on('error', reject);
          });
        } catch (err) {
          if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Payload too large' }));
            return;
          }
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Could not read request body' }));
          return;
        }

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
