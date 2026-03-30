'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  Play,
  Save,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from 'lucide-react';

/* ──────────────────────────────────────────
   Types
─────────────────────────────────────────── */
interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

interface FormulaStep {
  id: string;
  indicator: string;   // 'RSI' | 'MACD' | 'EMA' | 'SMA' | 'BB_UPPER' | 'BB_LOWER' | 'STOCH' | 'VALUE'
  period?: number;
  operation?: string;  // '+' | '-' | '*' | '/' | 'crossover' | 'crossunder' | 'gt' | 'lt'
  operand?: string;    // another indicator key or literal number
  operandValue?: number;
}

interface TestResult {
  values: number[];
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  label: string;
  latestValue: number;
}

interface Preset {
  name: string;
  description: string;
  steps: FormulaStep[];
  expectedOutput: string;
}

/* ──────────────────────────────────────────
   Constants
─────────────────────────────────────────── */
const INDICATORS = [
  { key: 'RSI', label: 'RSI', defaultPeriod: 14, description: 'Relative Strength Index (0-100)' },
  { key: 'MACD_HIST', label: 'MACD Histogram', defaultPeriod: 12, description: 'MACD histogram (fast-slow EMA diff minus signal)' },
  { key: 'MACD_LINE', label: 'MACD Line', defaultPeriod: 12, description: 'MACD fast-slow EMA difference' },
  { key: 'EMA', label: 'EMA', defaultPeriod: 20, description: 'Exponential Moving Average of close' },
  { key: 'SMA', label: 'SMA', defaultPeriod: 20, description: 'Simple Moving Average of close' },
  { key: 'BB_WIDTH', label: 'BB Width', defaultPeriod: 20, description: 'Bollinger Band width (upper-lower)/middle' },
  { key: 'STOCH_K', label: 'Stoch %K', defaultPeriod: 14, description: 'Stochastic %K (0-100)' },
  { key: 'ATR', label: 'ATR', defaultPeriod: 14, description: 'Average True Range — volatility measure' },
  { key: 'CLOSE', label: 'Close Price', defaultPeriod: 1, description: 'Raw close price' },
  { key: 'VOLUME', label: 'Volume', defaultPeriod: 1, description: 'Candle volume' },
];

const OPERATIONS = [
  { key: '+', label: 'Add (+)', desc: 'A + B' },
  { key: '-', label: 'Subtract (−)', desc: 'A − B' },
  { key: '*', label: 'Multiply (×)', desc: 'A × B' },
  { key: '/', label: 'Divide (÷)', desc: 'A ÷ B' },
  { key: 'normalize', label: 'Normalize (0-100)', desc: 'Scale result to 0-100 range' },
  { key: 'abs', label: 'Absolute value', desc: '|A|' },
];

const PRESETS: Preset[] = [
  {
    name: 'RSI Divergence Score',
    description: 'Combines RSI with Stoch for momentum confluence (0-100)',
    expectedOutput: 'High values = strong momentum, low = oversold/reversal zone',
    steps: [
      { id: 'a', indicator: 'RSI', period: 14 },
      { id: 'b', indicator: 'STOCH_K', period: 14, operation: '+', operand: 'prev' },
      { id: 'c', indicator: 'MACD_HIST', period: 12, operation: 'normalize' },
    ],
  },
  {
    name: 'MACD + EMA Strength',
    description: 'Multiplies MACD histogram by EMA slope for trend strength',
    expectedOutput: 'Positive = bullish trend in force, negative = bearish',
    steps: [
      { id: 'a', indicator: 'MACD_HIST', period: 12 },
      { id: 'b', indicator: 'EMA', period: 20, operation: '-', operand: 'prev' },
      { id: 'c', indicator: 'RSI', period: 14, operation: 'normalize' },
    ],
  },
  {
    name: 'Volatility Squeeze',
    description: 'BB Width below ATR threshold signals a squeeze (breakout imminent)',
    expectedOutput: 'Values near 0 = tight squeeze, high = expansion',
    steps: [
      { id: 'a', indicator: 'BB_WIDTH', period: 20 },
      { id: 'b', indicator: 'ATR', period: 14, operation: '/', operand: 'prev' },
      { id: 'c', indicator: 'RSI', period: 14, operation: 'normalize' },
    ],
  },
];

/* ──────────────────────────────────────────
   TA math helpers (client-side)
─────────────────────────────────────────── */
function genCandles(n = 60): OHLCV[] {
  let price = 50000 + Math.random() * 1000;
  const candles: OHLCV[] = [];
  for (let i = 0; i < n; i++) {
    const change = (Math.random() - 0.49) * price * 0.02;
    const open = price;
    price = Math.max(1, price + change);
    const high = Math.max(open, price) * (1 + Math.random() * 0.005);
    const low = Math.min(open, price) * (1 - Math.random() * 0.005);
    candles.push({ open, high, low, close: price, volume: 100 + Math.random() * 900, timestamp: Date.now() - (n - i) * 3600000 });
  }
  return candles;
}

function calcSMA(closes: number[], period: number): number[] {
  return closes.map((_, i) => {
    if (i < period - 1) return NaN;
    return closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

function calcEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let ema = closes[0];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { out.push(NaN); continue; }
    if (i === period - 1) { ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period; }
    else ema = closes[i] * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
}

function calcRSI(closes: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { out.push(NaN); continue; }
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j] - closes[j - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    const rs = losses === 0 ? 100 : gains / losses;
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}

function calcMACD(closes: number[], fast = 12, slow = 26, signal = 9): { line: number[]; hist: number[] } {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  const line = emaFast.map((v, i) => isNaN(v) || isNaN(emaSlow[i]) ? NaN : v - emaSlow[i]);
  const validLine = line.filter(v => !isNaN(v));
  const sigLine = calcEMA(validLine, signal);
  const hist = line.map((v, i) => {
    if (isNaN(v)) return NaN;
    const validIdx = line.slice(0, i + 1).filter(x => !isNaN(x)).length - 1;
    return isNaN(sigLine[validIdx]) ? NaN : v - sigLine[validIdx];
  });
  return { line, hist };
}

function calcBBWidth(closes: number[], period: number): number[] {
  const sma = calcSMA(closes, period);
  return closes.map((_, i) => {
    if (i < period - 1) return NaN;
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return mean === 0 ? NaN : (2 * 2 * std) / mean;
  });
}

function calcStochK(candles: OHLCV[], period: number): number[] {
  return candles.map((_, i) => {
    if (i < period - 1) return NaN;
    const sl = candles.slice(i - period + 1, i + 1);
    const hi = Math.max(...sl.map(c => c.high));
    const lo = Math.min(...sl.map(c => c.low));
    return hi === lo ? 50 : ((candles[i].close - lo) / (hi - lo)) * 100;
  });
}

function calcATR(candles: OHLCV[], period: number): number[] {
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });
  return calcSMA(tr, period);
}

function getIndicatorSeries(candles: OHLCV[], key: string, period: number): number[] {
  const closes = candles.map(c => c.close);
  switch (key) {
    case 'RSI': return calcRSI(closes, period);
    case 'MACD_HIST': return calcMACD(closes).hist;
    case 'MACD_LINE': return calcMACD(closes).line;
    case 'EMA': return calcEMA(closes, period);
    case 'SMA': return calcSMA(closes, period);
    case 'BB_WIDTH': return calcBBWidth(closes, period);
    case 'STOCH_K': return calcStochK(candles, period);
    case 'ATR': return calcATR(candles, period);
    case 'CLOSE': return closes;
    case 'VOLUME': return candles.map(c => c.volume);
    default: return closes.map(() => NaN);
  }
}

function applyOperation(a: number[], b: number[], op: string): number[] {
  const len = Math.min(a.length, b.length);
  return Array.from({ length: len }, (_, i) => {
    if (isNaN(a[i]) || isNaN(b[i])) return NaN;
    switch (op) {
      case '+': return a[i] + b[i];
      case '-': return a[i] - b[i];
      case '*': return a[i] * b[i];
      case '/': return b[i] === 0 ? NaN : a[i] / b[i];
      default: return a[i];
    }
  });
}

function normalizeToRange(arr: number[]): number[] {
  const valid = arr.filter(v => !isNaN(v));
  if (valid.length === 0) return arr;
  const mn = Math.min(...valid), mx = Math.max(...valid);
  if (mx === mn) return arr.map(v => isNaN(v) ? NaN : 50);
  return arr.map(v => isNaN(v) ? NaN : ((v - mn) / (mx - mn)) * 100);
}

function runFormula(steps: FormulaStep[], candles: OHLCV[]): number[] {
  if (steps.length === 0) return candles.map(() => NaN);

  let result = getIndicatorSeries(candles, steps[0].indicator, steps[0].period ?? 14);

  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    if (step.operation === 'normalize') {
      result = normalizeToRange(result);
      continue;
    }
    if (step.operation === 'abs') {
      result = result.map(v => isNaN(v) ? NaN : Math.abs(v));
      continue;
    }
    if (step.operation && step.operand) {
      const nextSeries = step.operand === 'prev'
        ? getIndicatorSeries(candles, step.indicator, step.period ?? 14)
        : getIndicatorSeries(candles, step.operand, step.period ?? 14);
      result = applyOperation(result, nextSeries, step.operation);
    }
  }

  return result;
}

function deriveSignal(values: number[]): { signal: 'bullish' | 'bearish' | 'neutral'; strength: number; label: string; latestValue: number } {
  const valid = values.filter(v => !isNaN(v));
  if (valid.length === 0) return { signal: 'neutral', strength: 50, label: 'No data', latestValue: 0 };

  const latest = valid[valid.length - 1];
  const prev = valid.length > 1 ? valid[valid.length - 2] : latest;
  const mn = Math.min(...valid), mx = Math.max(...valid);
  const normalized = mx === mn ? 50 : ((latest - mn) / (mx - mn)) * 100;

  const signal: 'bullish' | 'bearish' | 'neutral' = normalized > 60 ? 'bullish' : normalized < 40 ? 'bearish' : 'neutral';
  const trend = latest > prev ? '↑' : latest < prev ? '↓' : '→';
  const label = `${latest.toFixed(3)} ${trend} (${normalized.toFixed(0)}/100)`;

  return { signal, strength: Math.round(normalized), label, latestValue: latest };
}

/* ──────────────────────────────────────────
   Sub-components
─────────────────────────────────────────── */
function MiniChart({ values }: { values: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const valid = values.filter(v => !isNaN(v));
    if (valid.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const mn = Math.min(...valid), mx = Math.max(...valid);
    const range = mx === mn ? 1 : mx - mn;

    const xStep = w / (valid.length - 1);
    const toY = (v: number) => h - ((v - mn) / range) * (h - 8) - 4;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach(f => {
      const y = toY(mn + range * f);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    });

    // Fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(16,185,129,0.3)');
    grad.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.beginPath();
    valid.forEach((v, i) => {
      const x = i * xStep, y = toY(v);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo((valid.length - 1) * xStep, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    valid.forEach((v, i) => {
      const x = i * xStep, y = toY(v);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [values]);

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height: '100%' }}
      className="rounded"
    />
  );
}

/* ──────────────────────────────────────────
   Main component
─────────────────────────────────────────── */
export default function BuilderClient() {
  const [steps, setSteps] = useState<FormulaStep[]>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const formula = params.get('formula');
      if (formula) {
        try {
          const parsed = JSON.parse(atob(formula));
          if (Array.isArray(parsed)) return parsed as FormulaStep[];
        } catch { /* ignore */ }
      }
    }
    return [{ id: 'step-1', indicator: 'RSI', period: 14 }];
  });
  const [candles] = useState<OHLCV[]>(() => genCandles(60));
  const [manualRun, setManualRun] = useState(0);
  const [shareMsg, setShareMsg] = useState('');
  const [pluginExported, setPluginExported] = useState(false);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(true);

  // Derive result from steps without storing in state (avoids setState-in-effect)
  const result = React.useMemo<TestResult | null>(() => {
    if (steps.length === 0) return null;
    const values = runFormula(steps, candles);
    const derived = deriveSignal(values);
    return { values, ...derived };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, candles, manualRun]);

  const runTest = useCallback(() => {
    setManualRun(n => n + 1);
  }, []);

  function addStep() {
    setSteps(prev => [...prev, {
      id: `step-${Date.now()}`,
      indicator: 'EMA',
      period: 20,
      operation: '+',
      operand: 'prev',
    }]);
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id));
  }

  function updateStep(id: string, patch: Partial<FormulaStep>) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  function loadPreset(idx: number) {
    const preset = PRESETS[idx];
    setSteps(preset.steps.map(s => ({ ...s, id: `p-${Math.random().toString(36).slice(2)}` })));
    setActivePreset(idx);
  }

  function shareURL() {
    const encoded = btoa(JSON.stringify(steps));
    const url = `${window.location.origin}/indicators/builder?formula=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg('URL copied!');
      setTimeout(() => setShareMsg(''), 2000);
    });
  }

  function copyPluginJSON() {
    const plugin = {
      name: 'Custom Indicator',
      description: 'Built with TradeClaw Indicator Builder',
      version: '1.0.0',
      author: 'anonymous',
      category: 'custom',
      params: steps.flatMap(s => s.period !== undefined ? [{ name: `${s.indicator.toLowerCase()}_period`, type: 'number', default: s.period, min: 2, max: 200, description: `Period for ${s.indicator}` }] : []),
      code: `// Auto-generated by TradeClaw Indicator Builder\n// Steps: ${steps.map(s => `${s.indicator}(${s.period ?? ''})${s.operation ? ' ' + s.operation : ''}`).join(' → ')}\n// Paste this into /plugins to use\nconst closes = candles.map(c => c.close);\nconst latest = closes[closes.length - 1];\nreturn { value: latest, signal: 'neutral', strength: 50, label: 'Custom' };`,
    };
    navigator.clipboard.writeText(JSON.stringify(plugin, null, 2)).then(() => {
      setPluginExported(true);
      setTimeout(() => setPluginExported(false), 2000);
    });
  }



  const signalColor = result?.signal === 'bullish' ? 'text-emerald-400' : result?.signal === 'bearish' ? 'text-rose-400' : 'text-zinc-400';
  const signalBg = result?.signal === 'bullish' ? 'bg-emerald-900/30 border-emerald-700/40' : result?.signal === 'bearish' ? 'bg-rose-900/30 border-rose-700/40' : 'bg-zinc-800/50 border-zinc-700/40';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      {/* Hero */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-900/30 border border-emerald-700/40">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Custom Indicator Builder</h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Combine RSI, MACD, EMA and more — test live, save as plugin, share with a URL
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={runTest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Run Test
            </button>
            <button
              onClick={copyPluginJSON}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium transition-colors"
            >
              {pluginExported ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
              {pluginExported ? 'Copied!' : 'Save as Plugin'}
            </button>
            <button
              onClick={shareURL}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {shareMsg || 'Share URL'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Presets */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <button
            onClick={() => setShowPresets(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors"
          >
            <span className="font-semibold text-sm text-zinc-200">Presets</span>
            {showPresets ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
          </button>
          {showPresets && (
            <div className="px-5 pb-5 grid sm:grid-cols-3 gap-3">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => loadPreset(idx)}
                  className={`text-left rounded-lg p-3 border transition-all ${activePreset === idx ? 'border-emerald-600 bg-emerald-900/20' : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600'}`}
                >
                  <div className="font-medium text-sm text-zinc-100 mb-1">{preset.name}</div>
                  <div className="text-xs text-zinc-400">{preset.description}</div>
                  <div className="text-xs text-emerald-400 mt-1.5">{preset.expectedOutput}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Formula Steps */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-200">Formula Steps</h2>
              <button
                onClick={addStep}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Step
              </button>
            </div>

            {steps.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-500 text-sm">
                No steps yet. Add a step to begin.
              </div>
            )}

            {steps.map((step, idx) => (
              <div key={step.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                    Step {idx + 1}
                  </span>
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(step.id)} className="text-zinc-500 hover:text-rose-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Indicator</label>
                    <select
                      value={step.indicator}
                      onChange={e => updateStep(step.id, { indicator: e.target.value })}
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-sm px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-600"
                    >
                      {INDICATORS.map(ind => (
                        <option key={ind.key} value={ind.key}>{ind.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-zinc-500 mt-1">
                      {INDICATORS.find(i => i.key === step.indicator)?.description}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Period</label>
                    <input
                      type="number"
                      min={2}
                      max={200}
                      value={step.period ?? 14}
                      onChange={e => updateStep(step.id, { period: parseInt(e.target.value) || 14 })}
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-sm px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {idx > 0 && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Operation</label>
                      <select
                        value={step.operation ?? '+'}
                        onChange={e => updateStep(step.id, { operation: e.target.value })}
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-sm px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-600"
                      >
                        {OPERATIONS.map(op => (
                          <option key={op.key} value={op.key}>{op.label}</option>
                        ))}
                      </select>
                    </div>

                    {!['normalize', 'abs'].includes(step.operation ?? '') && (
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Operand (B)</label>
                        <select
                          value={step.operand ?? 'prev'}
                          onChange={e => updateStep(step.id, { operand: e.target.value })}
                          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-sm px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-600"
                        >
                          <option value="prev">Previous step result (A)</option>
                          {INDICATORS.map(ind => (
                            <option key={ind.key} value={ind.key}>{ind.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Formula summary */}
            {steps.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-400 font-medium">Formula</span>
                </div>
                <code className="text-xs text-emerald-300 font-mono break-all">
                  {steps.map((s, i) => {
                    const label = INDICATORS.find(ind => ind.key === s.indicator)?.label ?? s.indicator;
                    const op = i > 0 ? ` ${s.operation ?? '+'} ` : '';
                    const operand = i > 0 && s.operand && !['normalize', 'abs'].includes(s.operation ?? '')
                      ? (INDICATORS.find(ind => ind.key === s.operand)?.label ?? 'prev')
                      : '';
                    return `${op}${label}(${s.period ?? ''})${operand ? ` [${operand}]` : ''}`;
                  }).join('')}
                </code>
              </div>
            )}
          </div>

          {/* Live Result Panel */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold text-zinc-200">Live Test Result</h2>

            {result ? (
              <>
                {/* Signal badge */}
                <div className={`rounded-xl border p-4 ${signalBg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {result.signal === 'bullish' && <TrendingUp className="w-5 h-5 text-emerald-400" />}
                    {result.signal === 'bearish' && <TrendingDown className="w-5 h-5 text-rose-400" />}
                    {result.signal === 'neutral' && <Minus className="w-5 h-5 text-zinc-400" />}
                    <span className={`font-bold text-lg uppercase ${signalColor}`}>{result.signal}</span>
                  </div>
                  <div className="text-sm text-zinc-300 font-mono">{result.label}</div>
                  {/* Strength bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>Strength</span>
                      <span>{result.strength}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${result.signal === 'bullish' ? 'bg-emerald-500' : result.signal === 'bearish' ? 'bg-rose-500' : 'bg-zinc-500'}`}
                        style={{ width: `${result.strength}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Mini chart */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-400">Output series (60 candles)</span>
                    <button onClick={runTest} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div style={{ height: 120 }}>
                    <MiniChart values={result.values} />
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500 mt-2">
                    <span>{result.values.filter(v => !isNaN(v)).length} data points</span>
                    <span>Latest: {result.latestValue.toFixed(4)}</span>
                  </div>
                </div>

                {/* Sample values */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="text-xs text-zinc-400 mb-2 font-medium">Last 5 values</div>
                  <div className="space-y-1">
                    {result.values.filter(v => !isNaN(v)).slice(-5).map((v, i, arr) => {
                      const prev = arr[i - 1];
                      const isUp = prev !== undefined && v > prev;
                      const isDown = prev !== undefined && v < prev;
                      return (
                        <div key={i} className="flex items-center justify-between text-sm font-mono">
                          <span className="text-zinc-500">T-{4 - i}</span>
                          <span className={isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-zinc-300'}>
                            {v.toFixed(4)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-500 text-sm">
                Add steps and run test
              </div>
            )}

            {/* Save as Plugin CTA */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
              <div className="text-xs font-medium text-zinc-300">Use in TradeClaw</div>
              <p className="text-xs text-zinc-400">
                Copy the plugin JSON, then paste it in the code editor on the{' '}
                <Link href="/plugins" className="text-emerald-400 hover:underline">
                  Plugins page
                </Link>{' '}
                to use this indicator in live signal generation.
              </p>
              <button
                onClick={copyPluginJSON}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm transition-colors"
              >
                {pluginExported ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {pluginExported ? 'Plugin JSON copied!' : 'Copy Plugin JSON'}
              </button>
              <button
                onClick={shareURL}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm transition-colors"
              >
                <Share2 className="w-4 h-4" />
                {shareMsg || 'Share this formula'}
              </button>
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h3 className="font-semibold text-zinc-200 mb-3">How the Builder Works</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-emerald-400 font-medium mb-1">1. Add Steps</div>
              <div className="text-zinc-400">Each step picks an indicator and optional math operation. Steps chain together sequentially.</div>
            </div>
            <div>
              <div className="text-emerald-400 font-medium mb-1">2. Live Test</div>
              <div className="text-zinc-400">Your formula runs against 60 synthetic OHLCV candles instantly. The output chart and signal update automatically.</div>
            </div>
            <div>
              <div className="text-emerald-400 font-medium mb-1">3. Share & Save</div>
              <div className="text-zinc-400">Copy the plugin JSON to use it in TradeClaw&apos;s plugin system, or share the URL with your formula pre-loaded.</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-4">
          <p className="text-zinc-400 text-sm mb-3">
            TradeClaw is 100% open source. Found this useful?
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Star on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
