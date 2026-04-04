export async function healthRoutes(app, opts) {
    const { providerManager, redis } = opts;
    app.get('/health', async () => {
        const providers = providerManager.getProviderStatus();
        const allConnected = providers.every(p => p.connected);
        const redisOk = redis.isConnected();
        const wsStats = app.wsStats?.() ?? { clients: 0, activeSymbols: 0, totalSubscriptions: 0 };
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
//# sourceMappingURL=health.js.map