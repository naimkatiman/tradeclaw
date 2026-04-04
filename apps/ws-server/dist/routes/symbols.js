import { SYMBOLS, getSymbolCategory } from '@tradeclaw/signals';
export async function symbolsRoutes(app, _opts) {
    app.get('/symbols', async (request) => {
        const query = request.query;
        const filter = query.category;
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
//# sourceMappingURL=symbols.js.map