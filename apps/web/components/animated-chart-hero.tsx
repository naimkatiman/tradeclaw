"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  pulseOffset: number;
  color: "emerald" | "purple" | "white";
}

interface SignalBadge {
  x: number;
  y: number;
  type: "BUY" | "SELL";
  symbol: string;
  confidence: number;
  price: string;
  opacity: number;
  age: number;
  vy: number;
}

interface Sparkle {
  x: number;
  y: number;
  opacity: number;
  age: number;
  vx: number;
  vy: number;
  size: number;
}

interface AnimatedChartHeroProps {
  height?: number;
  className?: string;
}

const SIGNAL_SYMBOLS = [
  { symbol: "BTC/USD", price: "94,210" },
  { symbol: "XAU/USD", price: "2,648" },
  { symbol: "EUR/USD", price: "1.0832" },
  { symbol: "ETH/USD", price: "3,412" },
  { symbol: "GBP/USD", price: "1.2734" },
  { symbol: "SOL/USD", price: "182.6" },
  { symbol: "NAS100", price: "21,840" },
  { symbol: "OIL/USD", price: "78.34" },
];

export function AnimatedChartHero({
  height,
  className = "",
}: AnimatedChartHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const cvs: HTMLCanvasElement = canvas;
    const ctxRaw = cvs.getContext("2d");
    if (!ctxRaw) return;
    const ctx: CanvasRenderingContext2D = ctxRaw;

    let animFrameId: number;
    let t = 0;
    let lastSignalFrame = 0;
    let lastSparkleFrame = 0;
    const SIGNAL_INTERVAL = 300; // ~5s at 60fps
    const SPARKLE_INTERVAL = 40;

    // Particle pool
    const PARTICLE_COUNT = 65;
    const particles: Particle[] = [];
    const signalBadges: SignalBadge[] = [];
    const sparkles: Sparkle[] = [];

    const COLORS = {
      emerald: { r: 16, g: 185, b: 129 },
      purple: { r: 139, g: 92, b: 246 },
      white: { r: 200, g: 200, b: 220 },
    };

    function rgba(c: keyof typeof COLORS, a: number) {
      const { r, g, b } = COLORS[c];
      return `rgba(${r},${g},${b},${a})`;
    }

    function initParticles(w: number, h: number) {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const colorRoll = Math.random();
        const color: Particle["color"] =
          colorRoll < 0.55 ? "emerald" : colorRoll < 0.8 ? "purple" : "white";
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.35,
          opacity: Math.random() * 0.45 + 0.1,
          size: Math.random() * 2.8 + 0.8,
          pulseOffset: Math.random() * Math.PI * 2,
          color,
        });
      }
    }

    function resize() {
      const parent = cvs.parentElement;
      const w = parent ? parent.clientWidth : window.innerWidth;
      const h = height ?? (parent ? parent.clientHeight : window.innerHeight);
      cvs.width = w;
      cvs.height = h;
      initParticles(w, h);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(cvs.parentElement ?? document.body);
    resize();

    // Build two overlapping price lines
    function getPricePoint(frame: number, h: number, xRatio: number, offset: number): number {
      const baseY = h * (0.52 + offset * 0.08);
      const amp = h * (0.14 - offset * 0.03);
      return (
        baseY -
        amp * Math.sin(frame * 0.01 + xRatio * 5.5 + offset) -
        amp * 0.45 * Math.sin(frame * 0.0028 + xRatio * 2.8 + offset * 1.7) -
        amp * 0.18 * Math.sin(frame * 0.022 + xRatio * 11 + offset * 0.5)
      );
    }

    function spawnSparkles(x: number, y: number, count = 8) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = Math.random() * 1.8 + 0.6;
        sparkles.push({
          x,
          y,
          opacity: 1,
          age: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2.5 + 1,
        });
      }
    }

    function drawPriceLine(
      points: { x: number; y: number }[],
      colorKey: "emerald" | "purple",
      alpha: number,
      lineWidth: number,
      w: number,
      h: number,
      fillAlpha = 0.06
    ) {
      if (points.length < 2) return;

      // Fill
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, rgba(colorKey, fillAlpha * 1.4));
      grad.addColorStop(0.45, rgba(colorKey, fillAlpha));
      grad.addColorStop(1, rgba(colorKey, 0));

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        // Smooth curves
        const cpx = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
      }

      // Glow line
      ctx.shadowColor = rgba(colorKey, 0.6);
      ctx.shadowBlur = 10;
      ctx.strokeStyle = rgba(colorKey, alpha);
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function drawTip(x: number, y: number, colorKey: "emerald" | "purple") {
      // Pulse ring
      const ringRadius = 6 + 4 * Math.abs(Math.sin(t * 0.06));
      const ringAlpha = 0.25 - 0.15 * Math.abs(Math.sin(t * 0.06));
      const ringGrad = ctx.createRadialGradient(x, y, ringRadius * 0.5, x, y, ringRadius);
      ringGrad.addColorStop(0, rgba(colorKey, ringAlpha));
      ringGrad.addColorStop(1, rgba(colorKey, 0));
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.fillStyle = ringGrad;
      ctx.fill();

      // Outer glow
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 18);
      glow.addColorStop(0, rgba(colorKey, 0.75));
      glow.addColorStop(1, rgba(colorKey, 0));
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[colorKey].r === 16 ? "#34d399" : "#a78bfa";
      ctx.shadowColor = rgba(colorKey, 1);
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawSignalBadge(badge: SignalBadge) {
      const isBuy = badge.type === "BUY";
<<<<<<< HEAD
      const accent = isBuy ? COLORS.emerald : { r: 244, g: 63, b: 94 };
=======
>>>>>>> origin/main
      const accentStr = isBuy ? "rgba(16,185,129" : "rgba(244,63,94";

      ctx.save();
      ctx.globalAlpha = badge.opacity;

      const bw = 130;
      const bh = 44;
      const bx = badge.x - bw / 2;
      const by = badge.y - bh / 2;
      const r = 8;

      // Badge background
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, r);
      ctx.fillStyle = "rgba(10,10,12,0.85)";
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, r);
      ctx.strokeStyle = `${accentStr},0.35)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Left accent bar
      ctx.beginPath();
      ctx.roundRect(bx, by + 8, 3, bh - 16, 2);
      ctx.fillStyle = `${accentStr},0.8)`;
      ctx.fill();

      // BUY/SELL badge
      const labelW = 34;
      ctx.beginPath();
      ctx.roundRect(bx + 10, by + 10, labelW, 16, 3);
      ctx.fillStyle = `${accentStr},0.15)`;
      ctx.fill();

      ctx.font = "bold 9px monospace";
      ctx.fillStyle = `${accentStr},1)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badge.type, bx + 10 + labelW / 2, by + 18);

      // Symbol
      ctx.font = "bold 11px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.textAlign = "left";
      ctx.fillText(badge.symbol, bx + 50, by + 16);

      // Price
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(160,160,180,0.75)";
      ctx.fillText(badge.price, bx + 50, by + 30);

      // Confidence bar
      const barX = bx + 10;
      const barY = by + bh - 9;
      const barW = bw - 20;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, 3, 1.5);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * (badge.confidence / 100), 3, 1.5);
      ctx.fillStyle = `${accentStr},0.7)`;
      ctx.fill();

      ctx.restore();
    }

    function drawConnectionLines(w: number, h: number) {
      const MAX_DIST = Math.min(w, h) * 0.18;
      ctx.lineWidth = 0.4;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.055;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(16,185,129,${alpha})`;
            ctx.stroke();
          }
        }
      }
    }

    function draw() {
      const w = cvs.width;
      const h = cvs.height;
      if (w === 0 || h === 0) {
        animFrameId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      // ── Subtle grid ─────────────────────────────────────────
      ctx.strokeStyle = "rgba(255,255,255,0.028)";
      ctx.lineWidth = 1;
      const COLS = 10;
      const ROWS = 6;
      for (let i = 1; i < COLS; i++) {
        ctx.beginPath();
        ctx.moveTo((w / COLS) * i, 0);
        ctx.lineTo((w / COLS) * i, h);
        ctx.stroke();
      }
      for (let j = 1; j < ROWS; j++) {
        ctx.beginPath();
        ctx.moveTo(0, (h / ROWS) * j);
        ctx.lineTo(w, (h / ROWS) * j);
        ctx.stroke();
      }

      // ── Price lines ─────────────────────────────────────────
      const STEPS = Math.min(w, 500);

      const ptsMain: { x: number; y: number }[] = [];
      const ptsAlt: { x: number; y: number }[] = [];

      for (let i = 0; i <= STEPS; i++) {
        const xRatio = i / STEPS;
        const px = xRatio * w;
        const frame = t - (STEPS - i) * 0.65;
        ptsMain.push({ x: px, y: getPricePoint(frame, h, xRatio, 0) });
        ptsAlt.push({ x: px, y: getPricePoint(frame, h, xRatio, 1) });
      }

      // Draw secondary (purple) line first, slightly behind
      drawPriceLine(ptsAlt, "purple", 0.35, 1.2, w, h, 0.035);
      // Draw primary (emerald) line on top
      drawPriceLine(ptsMain, "emerald", 0.7, 1.8, w, h, 0.08);

      const mainTip = ptsMain[ptsMain.length - 1];
      const altTip = ptsAlt[ptsAlt.length - 1];

      drawTip(mainTip.x, mainTip.y, "emerald");
      drawTip(altTip.x, altTip.y, "purple");

      // ── Connection lines between nearby particles ────────────
      drawConnectionLines(w, h);

      // ── Particles ────────────────────────────────────────────
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4;
        if (p.y > h + 4) p.y = -4;

        const pulse = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.022 + p.pulseOffset));
        const alpha = p.opacity * pulse;

        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
        glow.addColorStop(0, rgba(p.color, alpha * 0.85));
        glow.addColorStop(1, rgba(p.color, 0));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.color, alpha);
        ctx.fill();
      }

      // ── Sparkles ─────────────────────────────────────────────
      if (t - lastSparkleFrame >= SPARKLE_INTERVAL && Math.random() < 0.6) {
        lastSparkleFrame = t;
        const randParticle = particles[Math.floor(Math.random() * particles.length)];
        if (randParticle) {
          sparkles.push({
            x: randParticle.x,
            y: randParticle.y,
            opacity: 1,
            age: 0,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2,
            size: Math.random() * 2 + 0.5,
          });
        }
      }
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.age++;
        if (s.age > 45) { sparkles.splice(i, 1); continue; }
        s.opacity = 1 - s.age / 45;
        s.x += s.vx;
        s.y += s.vy;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52,211,153,${s.opacity * 0.7})`;
        ctx.fill();
      }

      // ── Signal badges ─────────────────────────────────────────
      if (t - lastSignalFrame >= SIGNAL_INTERVAL) {
        lastSignalFrame = t;
        const sym = SIGNAL_SYMBOLS[Math.floor(Math.random() * SIGNAL_SYMBOLS.length)];
        const isBuy = Math.random() > 0.42;
        // Place badge near price line, offset to avoid overlap
        const fraction = 0.25 + Math.random() * 0.55;
        const ptIdx = Math.floor(fraction * (ptsMain.length - 1));
        const pt = ptsMain[ptIdx];
        const offset = isBuy ? -65 : 65;
        signalBadges.push({
          x: pt.x,
          y: pt.y + offset,
          type: isBuy ? "BUY" : "SELL",
          symbol: sym.symbol,
          confidence: Math.floor(Math.random() * 22 + 65),
          price: sym.price,
          opacity: 0,
          age: 0,
          vy: isBuy ? -0.18 : 0.18,
        });
        spawnSparkles(pt.x, pt.y, 6);
      }

      for (let i = signalBadges.length - 1; i >= 0; i--) {
        const b = signalBadges[i];
        b.age++;
        if (b.age > 240) { signalBadges.splice(i, 1); continue; }
        if (b.age < 20) b.opacity = b.age / 20;
        else if (b.age > 180) b.opacity = (240 - b.age) / 60;
        else b.opacity = 1;
        b.y += b.vy;
        drawSignalBadge(b);
      }

      t++;
      animFrameId = requestAnimationFrame(draw);
    }

    animFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameId);
      ro.disconnect();
    };
  }, [height]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
      style={{ willChange: "transform" }}
    />
  );
}
