'use client';

import { useEffect, useRef } from 'react';
import type { BacktestResult } from '@tradeclaw/strategies';

interface ComparisonChartProps {
  results: BacktestResult[];
  presetNames: Record<string, string>;
}

const COLORS = ['#60a5fa', '#f97316', '#22c55e', '#e879f9', '#fbbf24'];

export function ComparisonChart({ results, presetNames }: ComparisonChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const curves = results.filter((r) => r.equityCurve.length > 0);
    if (curves.length === 0) return;

    const allValues = curves.flatMap((r) => r.equityCurve);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const maxLen = Math.max(...curves.map((r) => r.equityCurve.length));
    const pad = 24;
    const plotW = w - pad * 2;
    const plotH = h - pad * 2;

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.strokeRect(pad, pad, plotW, plotH);

    curves.forEach((r, i) => {
      ctx.strokeStyle = COLORS[i % COLORS.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      r.equityCurve.forEach((v, j) => {
        const x = pad + (j / Math.max(1, maxLen - 1)) * plotW;
        const y = pad + plotH - ((v - min) / Math.max(1, max - min)) * plotH;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }, [results]);

  return (
    <div>
      <canvas ref={canvasRef} className="w-full h-64 bg-black/20 rounded-xl" />
      <div className="flex gap-4 mt-2 text-xs flex-wrap">
        {results.map((r, i) => (
          <div key={r.strategyId} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-zinc-300">{presetNames[r.strategyId] ?? r.strategyId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
