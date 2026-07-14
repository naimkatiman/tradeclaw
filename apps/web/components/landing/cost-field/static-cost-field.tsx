'use client';

/**
 * StaticCostField — the reduced-motion / no-WebGL rendering of the same
 * dataset the 3D scene shows. A single 2D canvas scatter of NET R per trade
 * (gross minus modeled fees and slippage) around a zero line. Drawn once per
 * resize; no animation.
 */

import { useEffect, useRef } from 'react';

export interface CostFieldData {
  t: number[];
  grossR: number[];
  costR: number[];
  cls: number[];
}

const DISPLAY_R_CLAMP = 4.5;
const UP = 'rgba(16, 185, 129, 0.75)';
const DOWN = 'rgba(244, 63, 94, 0.75)';

export function StaticCostField({ data }: { data: CostFieldData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.t.length === 0) return;

    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const zeroY = h * 0.42;
      const rToY = (r: number) => {
        const clamped = Math.max(-DISPLAY_R_CLAMP, Math.min(DISPLAY_R_CLAMP, r));
        return zeroY - (clamped / DISPLAY_R_CLAMP) * (h * 0.38);
      };

      ctx.strokeStyle = 'rgba(156, 163, 175, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(w, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      const n = data.t.length;
      for (let i = 0; i < n; i++) {
        const netR = data.grossR[i] - data.costR[i];
        const x = (n === 1 ? 0.5 : i / (n - 1)) * (w - 16) + 8;
        const y = rToY(netR);
        ctx.fillStyle = netR >= 0 ? UP : DOWN;
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      role="img"
      aria-label={`Scatter of ${data.t.length} resolved trades. Each dot shows one trade result after modeled fees and slippage, relative to zero.`}
    />
  );
}
