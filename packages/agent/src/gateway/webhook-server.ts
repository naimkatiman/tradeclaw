import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import type { BaseChannel } from '../channels/base.js';
import type { TradingSignal, Direction, IndicatorSummary, Timeframe } from '@tradeclaw/signals';

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

export interface TradingViewAlert {
  symbol?: string;
  action?: string;
  price?: number;
  volume?: number;
  message?: string;
  timeframe?: string;
  exchange?: string;
  id?: string;
  stopLoss?: number;
  sl?: number;
  takeProfit1?: number;
  tp1?: number;
  takeProfit2?: number | null;
  tp2?: number | null;
  takeProfit3?: number | null;
  tp3?: number | null;
  confidence?: number;
  timestamp?: string;
  source?: string;
  dataQuality?: string;
  indicators?: unknown;
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

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isIndicatorSummary(value: unknown): value is IndicatorSummary {
  if (!value || typeof value !== 'object') return false;
  const indicators = value as Partial<IndicatorSummary>;
  return typeof indicators.rsi?.value === 'number'
    && ['oversold', 'neutral', 'overbought'].includes(indicators.rsi.signal)
    && typeof indicators.macd?.histogram === 'number'
    && ['bullish', 'bearish', 'neutral'].includes(indicators.macd.signal)
    && typeof indicators.ema?.ema20 === 'number'
    && typeof indicators.ema?.ema50 === 'number'
    && typeof indicators.ema?.ema200 === 'number'
    && ['up', 'down', 'sideways'].includes(indicators.ema.trend)
    && typeof indicators.bollingerBands?.bandwidth === 'number'
    && ['upper', 'middle', 'lower'].includes(indicators.bollingerBands.position)
    && typeof indicators.stochastic?.k === 'number'
    && typeof indicators.stochastic?.d === 'number'
    && ['oversold', 'neutral', 'overbought'].includes(indicators.stochastic.signal)
    && Array.isArray(indicators.support)
    && indicators.support.every(Number.isFinite)
    && Array.isArray(indicators.resistance)
    && indicators.resistance.every(Number.isFinite);
}

function nullablePositiveNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  return isPositiveNumber(value) ? value : undefined;
}

export function alertToSignal(alert: TradingViewAlert): TradingSignal | null {
  if (alert.source !== 'real' || alert.dataQuality !== 'real') return null;
  if (typeof alert.id !== 'string' || alert.id.length === 0) return null;
  if (typeof alert.symbol !== 'string' || !/^[A-Za-z0-9]+$/.test(alert.symbol)) return null;

  const rawDirection = (alert.action || '').toUpperCase();
  if (rawDirection !== 'BUY' && rawDirection !== 'SELL') return null;
  const direction: Direction = rawDirection;

  if (!isPositiveNumber(alert.price)) return null;
  const stopLoss = alert.stopLoss ?? alert.sl;
  const takeProfit1 = alert.takeProfit1 ?? alert.tp1;
  if (!isPositiveNumber(stopLoss) || !isPositiveNumber(takeProfit1)) return null;

  const takeProfit2 = nullablePositiveNumber(alert.takeProfit2 ?? alert.tp2);
  const takeProfit3 = nullablePositiveNumber(alert.takeProfit3 ?? alert.tp3);
  if (takeProfit2 === undefined || takeProfit3 === undefined) return null;

  if (typeof alert.confidence !== 'number' || !Number.isFinite(alert.confidence)) return null;
  if (alert.confidence < 0 || alert.confidence > 100) return null;

  const validTimeframes: Timeframe[] = ['M5', 'M15', 'H1', 'H4', 'D1'];
  if (!validTimeframes.includes(alert.timeframe as Timeframe)) return null;
  if (typeof alert.timestamp !== 'string' || !Number.isFinite(Date.parse(alert.timestamp))) return null;
  if (!isIndicatorSummary(alert.indicators)) return null;

  return {
    id: alert.id,
    symbol: alert.symbol.toUpperCase(),
    direction,
    confidence: alert.confidence,
    entry: alert.price,
    stopLoss,
    takeProfit1,
    takeProfit2,
    takeProfit3,
    indicators: alert.indicators,
    timeframe: alert.timeframe as Timeframe,
    timestamp: alert.timestamp,
    status: 'active',
    source: 'real',
    dataQuality: 'real',
    skill: 'external-tradingview-webhook',
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
          res.writeHead(422, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            available: false,
            dataQuality: 'unavailable',
            reason: 'complete-provider-observed-candidate-required',
          }));
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
        res.end(JSON.stringify({ ok: true, candidate_id: signal.id, dataQuality: 'real' }));
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
