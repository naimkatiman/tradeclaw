/**
 * TradeClaw Plugin System
 * 
 * Custom indicators via user-defined JS modules.
 * Plugins are stored as JSON configs pointing to indicator functions.
 * Built-in sandboxed evaluation using Function constructor.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import vm from 'vm';

/* ── Types ── */
export interface PluginIndicator {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'custom';
  /** JS function body: receives (candles: OHLCV[]) => IndicatorResult */
  code: string;
  /** Input parameters with defaults */
  params: PluginParam[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PluginParam {
  name: string;
  type: 'number' | 'string' | 'boolean';
  default: number | string | boolean;
  min?: number;
  max?: number;
  description: string;
}

export interface IndicatorResult {
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  label: string;
  details?: Record<string, number | string>;
}

export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

/* ── Storage ── */
const DATA_DIR = path.join(process.cwd(), 'data');
const PLUGINS_FILE = path.join(DATA_DIR, 'plugins.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readPlugins(): PluginIndicator[] {
  ensureDataDir();
  if (!fs.existsSync(PLUGINS_FILE)) {
    const seed = generateSeedPlugins();
    fs.writeFileSync(PLUGINS_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
  try {
    return JSON.parse(fs.readFileSync(PLUGINS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writePlugins(plugins: PluginIndicator[]): void {
  ensureDataDir();
  fs.writeFileSync(PLUGINS_FILE, JSON.stringify(plugins, null, 2));
}

/* ── CRUD ── */
export function listPlugins(): PluginIndicator[] {
  return readPlugins();
}

export function getPlugin(id: string): PluginIndicator | null {
  return readPlugins().find(p => p.id === id) ?? null;
}

export function createPlugin(input: Omit<PluginIndicator, 'id' | 'createdAt' | 'updatedAt'>): PluginIndicator {
  const plugins = readPlugins();
  const plugin: PluginIndicator = {
    ...input,
    id: `plugin-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  plugins.push(plugin);
  writePlugins(plugins);
  return plugin;
}

export function updatePlugin(id: string, patch: Partial<PluginIndicator>): PluginIndicator | null {
  const plugins = readPlugins();
  const idx = plugins.findIndex(p => p.id === id);
  if (idx === -1) return null;
  plugins[idx] = { ...plugins[idx], ...patch, id, updatedAt: Date.now() };
  writePlugins(plugins);
  return plugins[idx];
}

export function deletePlugin(id: string): boolean {
  const plugins = readPlugins();
  const filtered = plugins.filter(p => p.id !== id);
  if (filtered.length === plugins.length) return false;
  writePlugins(filtered);
  return true;
}

export function togglePlugin(id: string): PluginIndicator | null {
  const plugins = readPlugins();
  const plugin = plugins.find(p => p.id === id);
  if (!plugin) return null;
  plugin.enabled = !plugin.enabled;
  plugin.updatedAt = Date.now();
  writePlugins(plugins);
  return plugin;
}

/* ── Sandboxed Execution ── */
export function executePlugin(
  plugin: PluginIndicator,
  candles: OHLCV[],
  paramOverrides?: Record<string, number | string | boolean>
): IndicatorResult {
  // Merge params with defaults
  const params: Record<string, number | string | boolean> = {};
  for (const p of plugin.params) {
    params[p.name] = paramOverrides?.[p.name] ?? p.default;
  }

  try {
    // Create sandboxed context with only safe globals
    const sandbox = vm.createContext({
      candles,
      params,
      Math,
      JSON,
      Number,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      Array,
      Object,
      String,
      Date,
    });

    const result = vm.runInNewContext(`"use strict";\n${plugin.code}`, sandbox, { timeout: 1000 });

    // Validate result shape
    if (
      typeof result !== 'object' || result === null ||
      typeof result.value !== 'number' ||
      !['bullish', 'bearish', 'neutral'].includes(result.signal) ||
      typeof result.strength !== 'number' ||
      typeof result.label !== 'string'
    ) {
      return {
        value: 0,
        signal: 'neutral',
        strength: 0,
        label: 'Invalid plugin output',
        details: { error: 'Plugin must return { value, signal, strength, label }' },
      };
    }

    return {
      value: result.value,
      signal: result.signal,
      strength: Math.max(0, Math.min(100, result.strength)),
      label: String(result.label).slice(0, 200),
      details: result.details ?? {},
    };
  } catch (err) {
    return {
      value: 0,
      signal: 'neutral',
      strength: 0,
      label: 'Plugin execution error',
      details: { error: err instanceof Error ? err.message : 'Unknown error' },
    };
  }
}

/* ── Validate plugin code (dry run) ── */
export function validatePluginCode(code: string): { valid: boolean; error?: string } {
  try {
    // Run with dummy data in a sandboxed context
    const dummyCandles: OHLCV[] = Array.from({ length: 20 }, (_, i) => ({
      open: 100 + i,
      high: 102 + i,
      low: 99 + i,
      close: 101 + i,
      volume: 1000,
      timestamp: Date.now() - (20 - i) * 3600000,
    }));

    const sandbox = vm.createContext({
      candles: dummyCandles,
      params: {},
      Math,
      JSON,
      Number,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      Array,
      Object,
      String,
      Date,
    });

    const result = vm.runInNewContext(`"use strict";\n${code}`, sandbox, { timeout: 1000 });

    if (typeof result !== 'object' || result === null) {
      return { valid: false, error: 'Must return an object' };
    }
    if (typeof result.value !== 'number') {
      return { valid: false, error: 'result.value must be a number' };
    }
    if (!['bullish', 'bearish', 'neutral'].includes(result.signal)) {
      return { valid: false, error: 'result.signal must be bullish/bearish/neutral' };
    }
    if (typeof result.strength !== 'number') {
      return { valid: false, error: 'result.strength must be a number (0-100)' };
    }
    if (typeof result.label !== 'string') {
      return { valid: false, error: 'result.label must be a string' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Syntax error' };
  }
}

/* ── Seed data: example plugins ── */
function generateSeedPlugins(): PluginIndicator[] {
  const now = Date.now();
  return [
    {
      id: 'plugin-vwap-001',
      name: 'VWAP',
      description: 'Volume Weighted Average Price — institutional benchmark for fair value',
      version: '1.0.0',
      author: 'TradeClaw',
      category: 'trend',
      code: `
const typicalPrices = candles.map(c => (c.high + c.low + c.close) / 3);
const volumes = candles.map(c => c.volume);
let cumTPV = 0, cumVol = 0;
for (let i = 0; i < candles.length; i++) {
  cumTPV += typicalPrices[i] * volumes[i];
  cumVol += volumes[i];
}
const vwap = cumTPV / cumVol;
const lastClose = candles[candles.length - 1].close;
const deviation = ((lastClose - vwap) / vwap) * 100;
return {
  value: Math.round(vwap * 100) / 100,
  signal: lastClose > vwap ? 'bullish' : lastClose < vwap ? 'bearish' : 'neutral',
  strength: Math.min(100, Math.abs(deviation) * 20),
  label: lastClose > vwap ? 'Price above VWAP — bullish bias' : 'Price below VWAP — bearish bias',
  details: { vwap: Math.round(vwap * 100) / 100, deviation: Math.round(deviation * 100) / 100 }
};`.trim(),
      params: [],
      enabled: true,
      createdAt: now - 86400000 * 7,
      updatedAt: now - 86400000 * 7,
    },
    {
      id: 'plugin-atr-002',
      name: 'ATR Volatility',
      description: 'Average True Range — measures market volatility for position sizing',
      version: '1.0.0',
      author: 'TradeClaw',
      category: 'volatility',
      code: `
const period = params.period || 14;
const trs = [];
for (let i = 1; i < candles.length; i++) {
  const c = candles[i], p = candles[i - 1];
  trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
}
const atr = trs.slice(-period).reduce((s, v) => s + v, 0) / Math.min(period, trs.length);
const atrPct = (atr / candles[candles.length - 1].close) * 100;
return {
  value: Math.round(atr * 100) / 100,
  signal: atrPct > 3 ? 'bearish' : atrPct < 1 ? 'bullish' : 'neutral',
  strength: Math.min(100, atrPct * 25),
  label: atrPct > 3 ? 'High volatility — caution' : atrPct < 1 ? 'Low volatility — breakout likely' : 'Normal volatility',
  details: { atr: Math.round(atr * 100) / 100, atrPct: Math.round(atrPct * 100) / 100 }
};`.trim(),
      params: [
        { name: 'period', type: 'number', default: 14, min: 5, max: 50, description: 'ATR period' },
      ],
      enabled: true,
      createdAt: now - 86400000 * 5,
      updatedAt: now - 86400000 * 5,
    },
    {
      id: 'plugin-obv-003',
      name: 'OBV Trend',
      description: 'On-Balance Volume — confirms trends with volume flow analysis',
      version: '1.0.0',
      author: 'TradeClaw',
      category: 'volume',
      code: `
let obv = 0;
const obvSeries = [0];
for (let i = 1; i < candles.length; i++) {
  if (candles[i].close > candles[i-1].close) obv += candles[i].volume;
  else if (candles[i].close < candles[i-1].close) obv -= candles[i].volume;
  obvSeries.push(obv);
}
const recent = obvSeries.slice(-5);
const trend = recent[recent.length - 1] - recent[0];
const avgVol = candles.reduce((s, c) => s + c.volume, 0) / candles.length;
const strength = Math.min(100, Math.abs(trend) / avgVol * 20);
return {
  value: obv,
  signal: trend > 0 ? 'bullish' : trend < 0 ? 'bearish' : 'neutral',
  strength: Math.round(strength),
  label: trend > 0 ? 'Volume confirms uptrend' : trend < 0 ? 'Volume confirms downtrend' : 'Volume indecisive',
  details: { obv, trend: Math.round(trend) }
};`.trim(),
      params: [],
      enabled: true,
      createdAt: now - 86400000 * 3,
      updatedAt: now - 86400000 * 3,
    },
    {
      id: 'plugin-ichimoku-004',
      name: 'Ichimoku Cloud',
      description: 'Simplified Ichimoku — conversion/base line cross with cloud position',
      version: '1.0.0',
      author: 'TradeClaw',
      category: 'trend',
      code: `
function highest(arr, period) {
  return Math.max(...arr.slice(-period).map(c => c.high));
}
function lowest(arr, period) {
  return Math.min(...arr.slice(-period).map(c => c.low));
}
const convPeriod = params.convPeriod || 9;
const basePeriod = params.basePeriod || 26;
const conv = (highest(candles, convPeriod) + lowest(candles, convPeriod)) / 2;
const base = (highest(candles, basePeriod) + lowest(candles, basePeriod)) / 2;
const lastClose = candles[candles.length - 1].close;
const spanA = (conv + base) / 2;
const spanB = (highest(candles, 52) + lowest(candles, 52)) / 2;
const aboveCloud = lastClose > Math.max(spanA, spanB);
const belowCloud = lastClose < Math.min(spanA, spanB);
const crossBull = conv > base;
let signal = 'neutral';
let strength = 50;
if (aboveCloud && crossBull) { signal = 'bullish'; strength = 85; }
else if (belowCloud && !crossBull) { signal = 'bearish'; strength = 85; }
else if (aboveCloud) { signal = 'bullish'; strength = 65; }
else if (belowCloud) { signal = 'bearish'; strength = 65; }
return {
  value: Math.round(conv * 100) / 100,
  signal,
  strength,
  label: aboveCloud ? 'Above cloud — bullish structure' : belowCloud ? 'Below cloud — bearish structure' : 'Inside cloud — consolidation',
  details: { conv: Math.round(conv * 100) / 100, base: Math.round(base * 100) / 100, spanA: Math.round(spanA * 100) / 100, spanB: Math.round(spanB * 100) / 100 }
};`.trim(),
      params: [
        { name: 'convPeriod', type: 'number', default: 9, min: 5, max: 30, description: 'Conversion line period' },
        { name: 'basePeriod', type: 'number', default: 26, min: 10, max: 60, description: 'Base line period' },
      ],
      enabled: false,
      createdAt: now - 86400000,
      updatedAt: now - 86400000,
    },
  ];
}
