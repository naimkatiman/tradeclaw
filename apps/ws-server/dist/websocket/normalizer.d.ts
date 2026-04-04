import { type NormalizedTick } from '@tradeclaw/signals';
export declare function toBinanceSymbol(tcSymbol: string): string | undefined;
export declare function fromBinanceSymbol(binanceSymbol: string): string | undefined;
export declare function getBinanceCryptoSymbols(): string[];
export interface BinanceMiniTicker {
    e: '24hrMiniTicker';
    s: string;
    c: string;
    o: string;
    h: string;
    l: string;
    E: number;
}
export interface BinanceTrade {
    e: 'trade';
    s: string;
    p: string;
    q: string;
    T: number;
}
export declare function normalizeBinanceMiniTicker(raw: BinanceMiniTicker): NormalizedTick | null;
export declare function normalizeBinanceTrade(raw: BinanceTrade): NormalizedTick | null;
export declare function isValidSymbol(symbol: string): boolean;
