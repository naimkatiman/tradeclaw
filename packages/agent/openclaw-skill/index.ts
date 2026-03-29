/**
 * OpenClaw skill wrapper for tradeclaw-agent.
 *
 * Wraps the core tradeclaw-agent API so OpenClaw can invoke
 * scan, signals, prices, and history commands and return
 * formatted results for any channel.
 */

import {
  runScanAsync,
  fetchLivePrices,
  getHistory,
  getAvailableSymbols,
  getSymbolConfig,
  loadConfig,
} from 'tradeclaw-agent';

import type { TradingSignal, HistorySummary } from 'tradeclaw-agent';

// ── Helpers ─────────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return value.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
}

function formatSignal(s: TradingSignal): string {
  const dir = s.direction === 'BUY' ? '🟢 BUY' : '🔴 SELL';
  return [
    `${dir} ${s.symbol}  [${s.confidence}%]`,
    `───────────────────`,
    `Entry:  ${formatPrice(s.entry)}`,
    `SL:     ${formatPrice(s.stopLoss)}`,
    `TP1:    ${formatPrice(s.takeProfit1)}`,
    `TP2:    ${formatPrice(s.takeProfit2)}`,
    `TP3:    ${formatPrice(s.takeProfit3)}`,
    ``,
    `📊 RSI: ${s.indicators.rsi.value.toFixed(1)} (${capitalize(s.indicators.rsi.signal)})`,
    `📈 MACD: ${capitalize(s.indicators.macd.signal)}`,
    `〰️ EMA: ${capitalize(s.indicators.ema.trend)}trend`,
    `⏱ Timeframe: ${s.timeframe}`,
    s.skill ? `🎯 Skill: ${s.skill}` : '',
  ].filter(Boolean).join('\n');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Public skill commands ───────────────────────────────────────────────

/**
 * Run a market scan and return formatted signal output.
 * Optionally filter to a specific symbol.
 */
export async function scan(options?: { symbol?: string; minConfidence?: number }): Promise<string> {
  const config = await loadConfig();
  const symbols = options?.symbol
    ? [options.symbol.toUpperCase()]
    : config.symbols;
  const minConf = options?.minConfidence ?? config.minConfidence;

  const signals = await runScanAsync(symbols, config.timeframes, minConf);

  if (signals.length === 0) {
    return 'No signals met the confidence threshold.';
  }

  const header = `📊 ${signals.length} signal(s) found\n`;
  const body = signals.map(formatSignal).join('\n\n');
  return header + '\n' + body;
}

/**
 * Show current live prices from all API sources.
 */
export async function prices(): Promise<string> {
  const livePrices = await fetchLivePrices();

  const lines: string[] = ['💰 Live Prices', ''];
  const categories: Record<string, string[]> = {
    '🪙 Metals': ['XAUUSD', 'XAGUSD'],
    '₿ Crypto': ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'],
    '💱 Forex': ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'],
  };

  for (const [cat, syms] of Object.entries(categories)) {
    lines.push(cat);
    for (const sym of syms) {
      const price = livePrices.get(sym);
      if (price !== undefined) {
        const name = getSymbolConfig(sym)?.name ?? sym;
        lines.push(`  ${sym}  ${formatPrice(price)}  (${name})`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Show historical signal accuracy stats.
 */
export async function history(): Promise<string> {
  const h: HistorySummary = await getHistory();

  if (h.totalSignals === 0) {
    return 'No signals tracked yet. Run a scan first.';
  }

  const lines: string[] = [
    '📈 Signal History',
    '',
    `Total signals:  ${h.totalSignals}`,
    `Closed signals: ${h.closedSignals}`,
    `Win rate:       ${h.closedSignals > 0 ? h.winRate + '%' : 'N/A'}`,
    `Best symbol:    ${h.bestSymbol ?? 'N/A'}`,
    `Best skill:     ${h.bestSkill ?? 'N/A'}`,
    '',
    '📊 Per Symbol',
  ];

  for (const [sym, data] of Object.entries(h.symbolBreakdown)) {
    lines.push(`  ${sym}: ${data.total} signals`);
  }

  lines.push('', '🧠 Per Skill');
  for (const [sk, data] of Object.entries(h.skillBreakdown)) {
    lines.push(`  ${sk}: ${data.total} signals`);
  }

  return lines.join('\n');
}

/**
 * List all available symbols.
 */
export async function symbols(): Promise<string> {
  const syms = getAvailableSymbols();
  const lines = ['📋 Available Symbols', ''];
  for (const sym of syms) {
    const cfg = getSymbolConfig(sym);
    lines.push(`  ${sym}  —  ${cfg?.name ?? sym}`);
  }
  return lines.join('\n');
}
