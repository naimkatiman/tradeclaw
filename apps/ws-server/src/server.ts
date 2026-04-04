import 'dotenv/config';
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { healthRoutes } from './routes/health.js';
import { symbolsRoutes } from './routes/symbols.js';
import { relayPlugin } from './websocket/relay.js';
import { ProviderManager } from './websocket/manager.js';
import { RedisService } from './services/redis.js';

const PORT = parseInt(process.env.WS_SERVER_PORT || '4000', 10);
const HOST = process.env.WS_SERVER_HOST || '0.0.0.0';

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // Redis (optional — degrades gracefully)
  const redis = new RedisService(process.env.REDIS_URL);

  // Provider manager — connects to upstream market data
  const providerManager = new ProviderManager(app.log, redis);

  // Plugins
  await app.register(fastifyWebsocket);

  // Routes
  await app.register(healthRoutes, { prefix: '/', providerManager, redis });
  await app.register(symbolsRoutes, { prefix: '/' });
  await app.register(relayPlugin, { prefix: '/', providerManager, redis });

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info('Shutting down...');
    await providerManager.disconnectAll();
    redis.disconnect();
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`WebSocket relay listening on ${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
