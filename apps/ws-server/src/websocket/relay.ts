import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { WebSocket } from 'ws';
import type { NormalizedTick, WsClientMessage, WsServerMessage } from '@tradeclaw/signals';
import { getAllSymbols } from '@tradeclaw/signals';
import { SubscriptionManager } from './subscriptions.js';
import type { ProviderManager } from './manager.js';
import type { RedisService } from '../services/redis.js';
import { wsAuth } from '../middleware/auth.js';
import { checkConnectionRate, MessageRateLimiter, startCleanup } from '../middleware/rate-limit.js';

interface RelayOptions extends FastifyPluginOptions {
  providerManager: ProviderManager;
  redis: RedisService;
}

const MAX_BUFFERED_AMOUNT = 64 * 1024; // 64KB backpressure threshold
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SUBSCRIPTIONS_PER_CLIENT = 20;
const validSymbols = new Set(getAllSymbols());

let clientCounter = 0;

export async function relayPlugin(app: FastifyInstance, opts: RelayOptions) {
  const { providerManager } = opts;
  const subs = new SubscriptionManager();
  const clients: Map<string, WebSocket> = new Map();
  const idleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  const rateLimiter = new MessageRateLimiter();

  // Start rate-limit cleanup timer
  startCleanup();

  // Connect to all symbols on startup
  const allSymbols = getAllSymbols();
  await providerManager.connectForSymbols(allSymbols);

  // Handle incoming ticks — fan out to subscribed clients
  providerManager.onTick((tick: NormalizedTick) => {
    const subscribers = subs.getSubscribers(tick.symbol);
    if (subscribers.size === 0) return;

    const message: WsServerMessage = { type: 'tick', data: tick };
    const payload = JSON.stringify(message);

    for (const clientId of subscribers) {
      const ws = clients.get(clientId);
      if (!ws || ws.readyState !== ws.OPEN) continue;

      // Backpressure: skip slow clients
      if (ws.bufferedAmount > MAX_BUFFERED_AMOUNT) continue;

      ws.send(payload);
    }
  });

  // WebSocket route — auth preHandler + connection rate limiting
  app.get('/ws', { websocket: true, preHandler: [wsAuth] }, (socket, request) => {
    // Connection rate limiting (per IP)
    if (!checkConnectionRate(request.ip)) {
      socket.close(4029, 'Too many connections');
      return;
    }

    const clientId = `c_${++clientCounter}_${Date.now().toString(36)}`;
    clients.set(clientId, socket);
    resetIdleTimer(clientId);

    app.log.info({ clientId, ip: request.ip }, 'Client connected');

    socket.on('message', (data) => {
      // Message rate limiting (per client)
      if (!rateLimiter.check(clientId)) {
        sendError(socket, 'Rate limited — too many messages');
        return;
      }

      resetIdleTimer(clientId);

      let msg: WsClientMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        sendError(socket, 'Invalid JSON');
        return;
      }

      if (!msg.action || !Array.isArray(msg.symbols)) {
        sendError(socket, 'Invalid message format. Expected: { action: "subscribe"|"unsubscribe", symbols: string[] }');
        return;
      }

      // Validate symbols
      const validRequested = msg.symbols.filter(s => validSymbols.has(s.toUpperCase()));
      if (validRequested.length === 0) {
        sendError(socket, `No valid symbols. Available: ${allSymbols.slice(0, 5).join(', ')}...`);
        return;
      }

      if (msg.action === 'subscribe') {
        // Enforce per-client subscription cap
        const currentCount = subs.getClientSymbols(clientId).length;
        const allowed = validRequested.slice(0, MAX_SUBSCRIPTIONS_PER_CLIENT - currentCount);
        if (allowed.length === 0) {
          sendError(socket, `Subscription limit reached (max ${MAX_SUBSCRIPTIONS_PER_CLIENT} symbols)`);
          return;
        }
        const subscribed = subs.subscribe(clientId, allowed);
        const response: WsServerMessage = { type: 'subscribed', symbols: subscribed };
        socket.send(JSON.stringify(response));
        app.log.info({ clientId, symbols: subscribed }, 'Client subscribed');
      } else if (msg.action === 'unsubscribe') {
        const unsubscribed = subs.unsubscribe(clientId, validRequested);
        const response: WsServerMessage = { type: 'unsubscribed', symbols: unsubscribed };
        socket.send(JSON.stringify(response));
        app.log.info({ clientId, symbols: unsubscribed }, 'Client unsubscribed');
      } else {
        sendError(socket, `Unknown action: ${msg.action}`);
      }
    });

    socket.on('close', () => {
      subs.removeClient(clientId);
      clients.delete(clientId);
      rateLimiter.remove(clientId);
      clearIdleTimer(clientId);
      app.log.info({ clientId }, 'Client disconnected');
    });

    socket.on('error', (err) => {
      app.log.error({ clientId, err }, 'Client socket error');
      subs.removeClient(clientId);
      clients.delete(clientId);
      rateLimiter.remove(clientId);
      clearIdleTimer(clientId);
    });
  });

  // Expose stats for health endpoint
  app.decorate('wsStats', () => subs.getStats());

  function sendError(ws: WebSocket, message: string): void {
    const response: WsServerMessage = { type: 'error', message };
    ws.send(JSON.stringify(response));
  }

  function resetIdleTimer(clientId: string): void {
    clearIdleTimer(clientId);
    idleTimers.set(clientId, setTimeout(() => {
      const ws = clients.get(clientId);
      if (ws && ws.readyState === ws.OPEN) {
        ws.close(4000, 'Idle timeout');
      }
    }, IDLE_TIMEOUT_MS));
  }

  function clearIdleTimer(clientId: string): void {
    const timer = idleTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      idleTimers.delete(clientId);
    }
  }
}
