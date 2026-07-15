/**
 * Observed candidate outcome tracker.
 * Persists only candidates explicitly marked as real to
 * ~/.tradeclaw/signal-history.jsonl and summarizes resolved outcomes.
 */
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
const HISTORY_DIR = join(homedir(), '.tradeclaw');
const HISTORY_FILE = join(HISTORY_DIR, 'signal-history.jsonl');
async function ensureDir() {
    if (!existsSync(HISTORY_DIR)) {
        await mkdir(HISTORY_DIR, { recursive: true });
    }
}
export function isObservedSignal(signal) {
    return signal.source === 'real'
        && signal.dataQuality === 'real'
        && Number.isFinite(signal.entry)
        && signal.entry > 0
        && Number.isFinite(signal.stopLoss)
        && Number.isFinite(signal.takeProfit1)
        && Number.isFinite(Date.parse(signal.timestamp));
}
function isObservedHistoryRow(value) {
    if (!value || typeof value !== 'object')
        return false;
    const row = value;
    return row.dataQuality === 'real'
        && typeof row.id === 'string'
        && typeof row.symbol === 'string'
        && (row.direction === 'BUY' || row.direction === 'SELL')
        && typeof row.entry === 'number'
        && Number.isFinite(row.entry)
        && row.entry > 0
        && typeof row.timestamp === 'string'
        && Number.isFinite(Date.parse(row.timestamp));
}
export async function trackSignal(signal) {
    if (!isObservedSignal(signal))
        return;
    await ensureDir();
    const entry = {
        id: signal.id,
        symbol: signal.symbol,
        direction: signal.direction,
        confidence: signal.confidence,
        entry: signal.entry,
        tp1: signal.takeProfit1,
        tp2: signal.takeProfit2,
        tp3: signal.takeProfit3,
        sl: signal.stopLoss,
        timestamp: signal.timestamp,
        skill: signal.skill ?? 'engine',
        dataQuality: 'real',
    };
    await appendFile(HISTORY_FILE, JSON.stringify(entry) + '\n', 'utf-8');
}
export async function trackSignals(signals) {
    const observedSignals = signals.filter(isObservedSignal);
    if (observedSignals.length === 0)
        return;
    await ensureDir();
    const lines = observedSignals.map(signal => {
        const entry = {
            id: signal.id,
            symbol: signal.symbol,
            direction: signal.direction,
            confidence: signal.confidence,
            entry: signal.entry,
            tp1: signal.takeProfit1,
            tp2: signal.takeProfit2,
            tp3: signal.takeProfit3,
            sl: signal.stopLoss,
            timestamp: signal.timestamp,
            skill: signal.skill ?? 'engine',
            dataQuality: 'real',
        };
        return JSON.stringify(entry);
    });
    await appendFile(HISTORY_FILE, lines.join('\n') + '\n', 'utf-8');
}
export async function loadHistory() {
    if (!existsSync(HISTORY_FILE))
        return [];
    const raw = await readFile(HISTORY_FILE, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const signals = [];
    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            if (isObservedHistoryRow(parsed))
                signals.push(parsed);
        }
        catch {
            // skip malformed lines
        }
    }
    return signals;
}
export async function getHistory() {
    const signals = await loadHistory();
    const symbolMap = {};
    const skillMap = {};
    let closedCount = 0;
    let winCount = 0;
    for (const sig of signals) {
        if (!symbolMap[sig.symbol])
            symbolMap[sig.symbol] = { total: 0, wins: 0 };
        symbolMap[sig.symbol].total++;
        const sk = sig.skill || 'engine';
        if (!skillMap[sk])
            skillMap[sk] = { total: 0, wins: 0 };
        skillMap[sk].total++;
        if (sig.result) {
            closedCount++;
            const isWin = sig.result === 'tp1' || sig.result === 'tp2' || sig.result === 'tp3';
            if (isWin) {
                winCount++;
                symbolMap[sig.symbol].wins++;
                skillMap[sk].wins++;
            }
        }
    }
    const symbolBreakdown = {};
    for (const [sym, data] of Object.entries(symbolMap)) {
        symbolBreakdown[sym] = {
            total: data.total,
            wins: data.wins,
            rate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0,
        };
    }
    const skillBreakdown = {};
    for (const [sk, data] of Object.entries(skillMap)) {
        skillBreakdown[sk] = {
            total: data.total,
            wins: data.wins,
            rate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0,
        };
    }
    let bestSymbol = null;
    let maxSymbolTotal = 0;
    for (const [sym, data] of Object.entries(symbolMap)) {
        if (data.total > maxSymbolTotal) {
            maxSymbolTotal = data.total;
            bestSymbol = sym;
        }
    }
    let bestSkill = null;
    let maxSkillTotal = 0;
    for (const [sk, data] of Object.entries(skillMap)) {
        if (data.total > maxSkillTotal) {
            maxSkillTotal = data.total;
            bestSkill = sk;
        }
    }
    return {
        totalSignals: signals.length,
        closedSignals: closedCount,
        winRate: closedCount > 0 ? Math.round((winCount / closedCount) * 100) : 0,
        bestSymbol,
        bestSkill,
        symbolBreakdown,
        skillBreakdown,
        recentSignals: signals.slice(-20).reverse(),
    };
}
//# sourceMappingURL=tracker.js.map