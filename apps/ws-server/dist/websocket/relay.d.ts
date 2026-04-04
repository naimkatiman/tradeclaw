import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { ProviderManager } from './manager.js';
import type { RedisService } from '../services/redis.js';
interface RelayOptions extends FastifyPluginOptions {
    providerManager: ProviderManager;
    redis: RedisService;
}
export declare function relayPlugin(app: FastifyInstance, opts: RelayOptions): Promise<void>;
export {};
