import type { TradingSignal, Timeframe } from '@tradeclaw/signals';
export interface BaseSkill {
    readonly name: string;
    readonly description: string;
    readonly version: string;
    analyze(symbol: string, timeframes: Timeframe[]): TradingSignal[];
}
export interface SkillMeta {
    name: string;
    description: string;
    version: string;
    path: string;
}
//# sourceMappingURL=base.d.ts.map