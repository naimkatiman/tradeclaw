import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { ProviderManager } from '../websocket/manager.js';
import type { RedisService } from '../services/redis.js';
interface HealthOptions extends FastifyPluginOptions {
    providerManager: ProviderManager;
    redis: RedisService;
}
export declare function healthRoutes(app: FastifyInstance, opts: HealthOptions): Promise<void>;
export {};
