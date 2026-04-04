'use client';

import { useRef, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────

export interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SignalPoint {
  barIndex: number;
  direction: 'BUY' | 'SELL';
  price: number;
}

// ─── Canvas Hook ─────────────────────────────────────────────

function useCanvas(draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void, deps: unknown[]) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);
      draw(ctx, rect.width, rect.height);
    };

    render();
    const ro = new ResizeObserver(render);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return canvasRef;
}

// ─── Equity Curve Canvas ─────────────────────────────────────

export function EquityCurveCanvas({ curve, startBalance }: { curve: number[]; startBalance: number }) {
  const canvasRef = useCanvas((ctx, W, H) => {
    if (curve.length < 2) return;
    const pad = { top: 16, right: 16, bottom: 28, left: 52 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    const min = Math.min(...curve) * 0.995;
    const max = Math.max(...curve) * 1.005;
    const range = max - min || 1;
    const toX = (i: number) => pad.left + (i / (curve.length - 1)) * cW;
    const toY = (v: number) => pad.top + cH - ((v - min) / range) * cH;

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + (g / 4) * cH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    }

    const zeroY = toY(startBalance);
    if (zeroY >= pad.top && zeroY <= pad.top + cH) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(pad.left, zeroY); ctx.lineTo(W - pad.right, zeroY); ctx.stroke();
      ctx.setLineDash([]);
    }

    const isProfit = curve[curve.length - 1] >= startBalance;
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
    grad.addColorStop(0, isProfit ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)');
    grad.addColorStop(1, isProfit ? 'rgba(16,185,129,0.0)' : 'rgba(239,68,68,0.0)');

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(curve[0]));
    for (let i = 1; i < curve.length; i++) ctx.lineTo(toX(i), toY(curve[i]));
    ctx.lineTo(toX(curve.length - 1), pad.top + cH);
    ctx.lineTo(toX(0), pad.top + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(curve[0]));
    for (let i = 1; i < curve.length; i++) ctx.lineTo(toX(i), toY(curve[i]));
    ctx.strokeStyle = isProfit ? '#10B981' : '#EF4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let g = 0; g <= 4; g++) {
      const v = min + (range * (4 - g)) / 4;
      const y = pad.top + (g / 4) * cH;
      ctx.fillText(v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`, pad.left - 4, y + 4);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    [0, 0.25, 0.5, 0.75, 1].forEach(p => {
      const i = Math.floor(p * (curve.length - 1));
      ctx.fillText(`T${i}`, toX(i), pad.top + cH + 18);
    });
  }, [curve, startBalance]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ─── Price Chart Canvas ──────────────────────────────────────

export function PriceChartCanvas({
  priceData, ema20, ema50, signals,
}: {
  priceData: OHLCVCandle[];
  ema20: number[];
  ema50: number[];
  signals: SignalPoint[];
}) {
  const canvasRef = useCanvas((ctx, W, H) => {
    if (priceData.length < 2) return;
    const pad = { top: 16, right: 16, bottom: 28, left: 60 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;
    const n = priceData.length;

    const allPrices = priceData.flatMap(c => [c.high, c.low]);
    const min = Math.min(...allPrices) * 0.998;
    const max = Math.max(...allPrices) * 1.002;
    const range = max - min || 1;

    const toX = (i: number) => pad.left + (i / (n - 1)) * cW;
    const toY = (v: number) => pad.top + cH - ((v - min) / range) * cH;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + (g / 4) * cH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    }

    // Candlesticks
    const candleWidth = Math.max(1, cW / n * 0.6);
    for (let i = 0; i < n; i++) {
      const c = priceData[i];
      const x = toX(i);
      const bullish = c.close >= c.open;
      const color = bullish ? '#10B981' : '#EF4444';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(c.high));
      ctx.lineTo(x, toY(c.low));
      ctx.stroke();

      // Body
      const bodyTop = toY(Math.max(c.open, c.close));
      const bodyBottom = toY(Math.min(c.open, c.close));
      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyBottom - bodyTop));
    }

    // EMA lines
    const drawEMA = (values: number[], color: string) => {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < values.length; i++) {
        if (isNaN(values[i])) continue;
        const x = toX(i);
        const y = toY(values[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    drawEMA(ema20, 'rgba(96,165,250,0.6)');
    drawEMA(ema50, 'rgba(251,191,36,0.5)');

    // Signal markers
    for (const sig of signals) {
      if (sig.barIndex < 0 || sig.barIndex >= n) continue;
      const x = toX(sig.barIndex);
      const y = toY(sig.price);
      const isBuy = sig.direction === 'BUY';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = isBuy ? '#10B981' : '#EF4444';
      ctx.fill();
      ctx.strokeStyle = isBuy ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let g = 0; g <= 4; g++) {
      const v = min + (range * (4 - g)) / 4;
      const y = pad.top + (g / 4) * cH;
      ctx.fillText(v.toFixed(v > 100 ? 1 : 4), pad.left - 4, y + 4);
    }
  }, [priceData, ema20, ema50, signals]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ─── Indicators Canvas ───────────────────────────────────────

export function IndicatorsCanvas({
  rsiValues, macdLine, macdSignalLine, macdHistogram,
}: {
  rsiValues: number[];
  macdLine: number[];
  macdSignalLine: number[];
  macdHistogram: number[];
}) {
  const canvasRef = useCanvas((ctx, W, H) => {
    const n = rsiValues.length;
    if (n < 2) return;

    const PAD_L = 44;
    const PAD_R = 16;
    const PAD_TOP = 8;
    const DIVIDER = 6;
    const rsiH = Math.floor((H - PAD_TOP) * 0.42);
    const macdH = H - PAD_TOP - rsiH - DIVIDER;
    const cW = W - PAD_L - PAD_R;

    const toX = (i: number) => PAD_L + (i / (n - 1)) * cW;

    // RSI panel
    const rsiTop = PAD_TOP;
    const toRsiY = (v: number) => rsiTop + rsiH - (v / 100) * rsiH;

    // Shaded zones
    ctx.fillStyle = 'rgba(239,68,68,0.06)';
    ctx.fillRect(PAD_L, toRsiY(100), cW, toRsiY(70) - toRsiY(100));
    ctx.fillStyle = 'rgba(16,185,129,0.06)';
    ctx.fillRect(PAD_L, toRsiY(30), cW, toRsiY(0) - toRsiY(30));

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    [0, 25, 50, 75, 100].forEach(v => {
      const y = toRsiY(v);
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    });

    // 30/70 lines
    [30, 70].forEach(v => {
      const y = toRsiY(v);
      ctx.strokeStyle = v === 30 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
      ctx.setLineDash([]);
    });

    // 50 center line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(PAD_L, toRsiY(50)); ctx.lineTo(W - PAD_R, toRsiY(50)); ctx.stroke();

    // RSI line
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < n; i++) {
      if (isNaN(rsiValues[i])) continue;
      const x = toX(i);
      const y = toRsiY(rsiValues[i]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // RSI labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    [30, 50, 70].forEach(v => {
      ctx.fillText(String(v), PAD_L - 3, toRsiY(v) + 3);
    });
    ctx.fillStyle = 'rgba(167,139,250,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText('RSI', PAD_L + 4, rsiTop + 12);

    // MACD panel
    const macdTop = rsiTop + rsiH + DIVIDER;
    const validMacd = macdHistogram.filter(v => !isNaN(v));
    const validLines = [...macdLine.filter(v => !isNaN(v)), ...macdSignalLine.filter(v => !isNaN(v))];
    if (validMacd.length === 0) return;

    const macdMin = Math.min(...validMacd, ...validLines) * 1.1;
    const macdMax = Math.max(...validMacd, ...validLines) * 1.1;
    const macdRange = macdMax - macdMin || 1;
    const toMacdY = (v: number) => macdTop + macdH - ((v - macdMin) / macdRange) * macdH;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
      const y = macdTop + (g / 3) * macdH;
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    }

    // Zero line
    const zeroY = toMacdY(0);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.moveTo(PAD_L, zeroY); ctx.lineTo(W - PAD_R, zeroY); ctx.stroke();

    // Histogram bars
    const barW = Math.max(1, cW / n - 1);
    for (let i = 0; i < n; i++) {
      const h = macdHistogram[i];
      if (isNaN(h)) continue;
      const x = toX(i) - barW / 2;
      const y0 = zeroY;
      const y1 = toMacdY(h);
      ctx.fillStyle = h > 0 ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)';
      ctx.fillRect(x, Math.min(y0, y1), barW, Math.abs(y1 - y0));
    }

    // MACD line
    ctx.beginPath();
    started = false;
    for (let i = 0; i < n; i++) {
      if (isNaN(macdLine[i])) continue;
      const x = toX(i); const y = toMacdY(macdLine[i]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Signal line
    ctx.beginPath();
    started = false;
    for (let i = 0; i < n; i++) {
      if (isNaN(macdSignalLine[i])) continue;
      const x = toX(i); const y = toMacdY(macdSignalLine[i]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(251,191,36,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MACD', PAD_L + 4, macdTop + 12);
  }, [rsiValues, macdLine, macdSignalLine, macdHistogram]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ─── Loading Skeleton ────────────────────────────────────────

export function ChartSkeleton() {
  return (
    <div className="animate-pulse bg-white/5 rounded-xl h-64 flex items-center justify-center">
      <div className="text-xs text-zinc-500">Loading chart...</div>
    </div>
  );
}
