import type { SymbolConfig } from './types.js';
export declare const SYMBOLS: Record<string, SymbolConfig>;
export declare function getSymbolConfig(symbol: string): SymbolConfig | undefined;
export declare function getAllSymbols(): string[];
/**
 * Update a symbol's base price at runtime (e.g. after fetching live prices).
 */
export declare function updateBasePrice(symbol: string, price: number): void;
//# sourceMappingURL=symbols.d.ts.map