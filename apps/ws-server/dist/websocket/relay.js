import { getAllSymbols } from '@tradeclaw/signals';
import { SubscriptionManager } from './subscriptions.js';
const MAX_BUFFERED_AMOUNT = 64 * 1024; // 64KB backpressure threshold
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const validSymbols = new Set(getAllSymbols());
let clientCounter = 0;
export async function relayPlugin(app, opts) {
    const { providerManager } = opts;
    const subs = new SubscriptionManager();
    const clients = new Map();
    const idleTimers = new Map();
    // Connect to all symbols on startup
    const allSymbols = getAllSymbols();
    await providerManager.connectForSymbols(allSymbols);
    // Handle incoming ticks — fan out to subscribed clients
    providerManager.onTick((tick) => {
        const subscribers = subs.getSubscribers(tick.symbol);
        if (subscribers.size === 0)
            return;
        const message = { type: 'tick', data: tick };
        const payload = JSON.stringify(message);
        for (const clientId of subscribers) {
            const ws = clients.get(clientId);
            if (!ws || ws.readyState !== ws.OPEN)
                continue;
            // Backpressure: skip slow clients
            if (ws.bufferedAmount > MAX_BUFFERED_AMOUNT)
                continue;
            ws.send(payload);
        }
    });
    // WebSocket route
    app.get('/ws', { websocket: true }, (socket, request) => {
        const clientId = `c_${++clientCounter}_${Date.now().toString(36)}`;
        clients.set(clientId, socket);
        resetIdleTimer(clientId);
        app.log.info({ clientId, ip: request.ip }, 'Client connected');
        socket.on('message', (data) => {
            resetIdleTimer(clientId);
            let msg;
            try {
                msg = JSON.parse(data.toString());
            }
            catch {
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
                const subscribed = subs.subscribe(clientId, validRequested);
                const response = { type: 'subscribed', symbols: subscribed };
                socket.send(JSON.stringify(response));
                app.log.info({ clientId, symbols: subscribed }, 'Client subscribed');
            }
            else if (msg.action === 'unsubscribe') {
                const unsubscribed = subs.unsubscribe(clientId, validRequested);
                const response = { type: 'unsubscribed', symbols: unsubscribed };
                socket.send(JSON.stringify(response));
                app.log.info({ clientId, symbols: unsubscribed }, 'Client unsubscribed');
            }
            else {
                sendError(socket, `Unknown action: ${msg.action}`);
            }
        });
        socket.on('close', () => {
            subs.removeClient(clientId);
            clients.delete(clientId);
            clearIdleTimer(clientId);
            app.log.info({ clientId }, 'Client disconnected');
        });
        socket.on('error', (err) => {
            app.log.error({ clientId, err }, 'Client socket error');
            subs.removeClient(clientId);
            clients.delete(clientId);
            clearIdleTimer(clientId);
        });
    });
    // Expose stats for health endpoint
    app.decorate('wsStats', () => subs.getStats());
    function sendError(ws, message) {
        const response = { type: 'error', message };
        ws.send(JSON.stringify(response));
    }
    function resetIdleTimer(clientId) {
        clearIdleTimer(clientId);
        idleTimers.set(clientId, setTimeout(() => {
            const ws = clients.get(clientId);
            if (ws && ws.readyState === ws.OPEN) {
                ws.close(4000, 'Idle timeout');
            }
        }, IDLE_TIMEOUT_MS));
    }
    function clearIdleTimer(clientId) {
        const timer = idleTimers.get(clientId);
        if (timer) {
            clearTimeout(timer);
            idleTimers.delete(clientId);
        }
    }
}
//# sourceMappingURL=relay.js.map