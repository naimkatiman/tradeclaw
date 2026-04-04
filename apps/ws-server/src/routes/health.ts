import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { ProviderManager } from '../websocket/manager.js';
import type { RedisService } from '../services/redis.js';

interface HealthOptions extends FastifyPluginOptions {
  providerManager: ProviderManager;
  redis: RedisService;
}

export async function healthRoutes(app: FastifyInstance, opts: HealthOptions) {
  const { providerManager, redis } = opts;

  app.get('/health', async () => {
    const providers = providerManager.getProviderStatus();
    const allConnected = providers.every(p => p.connected);
    const redisOk = redis.isConnected();

    const wsStats = (app as any).wsStats?.() ?? { clients: 0, activeSymbols: 0, totalSubscriptions: 0 };

    return {
      status: allConnected ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      connectedClients: wsStats.clients,
      activeSymbols: wsStats.activeSymbols,
      totalSubscriptions: wsStats.totalSubscriptions,
      providers,
      redis: redisOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  });
}
