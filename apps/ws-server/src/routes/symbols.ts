import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { SYMBOLS, getSymbolCategory, type SymbolCategory } from '@tradeclaw/signals';

export async function symbolsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/symbols', async (request) => {
    const query = request.query as { category?: string };
    const filter = query.category as SymbolCategory | undefined;

    const symbols = Object.values(SYMBOLS)
      .map(s => ({
        ...s,
        category: getSymbolCategory(s.symbol),
      }))
      .filter(s => !filter || s.category === filter);

    return {
      count: symbols.length,
      symbols,
    };
  });
}
