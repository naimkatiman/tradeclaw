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
}

interface SignalMarker {
  x: number;
  y: number;
  type: "BUY" | "SELL";
  opacity: number;
  age: number;
}

interface AnimatedChartHeroProps {
  height?: number;
  className?: string;
}

export function AnimatedChartHero({
  height,
  className = "",
}: AnimatedChartHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Capture as non-nullable for use inside nested functions
    const cvs: HTMLCanvasElement = canvas;

    const ctxRaw = cvs.getContext("2d");
    if (!ctxRaw) return;
    const ctx: CanvasRenderingContext2D = ctxRaw;

    let animFrameId: number;
    let t = 0;
    let lastSignalFrame = 0;
    const SIGNAL_INTERVAL = 480; // ~8s at 60fps

    // Particle pool
    const PARTICLE_COUNT = 50;
    const particles: Particle[] = [];

    function initParticles(w: number, h: number) {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle(w, h));
      }
    }

    function createParticle(w: number, h: number): Particle {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1,
        size: Math.random() * 2.5 + 0.8,
        pulseOffset: Math.random() * Math.PI * 2,
      };
    }

    const signalMarkers: SignalMarker[] = [];

    // Noise state for random walk
    let noiseVal = 0;

    function noise(): number {
      noiseVal += (Math.random() - 0.5) * 0.8;
      noiseVal *= 0.92;
      return noiseVal;
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

    function getPrice(frame: number, w: number, h: number, xRatio: number): number {
      const baseY = h * 0.55;
      const amplitude = h * 0.15;
      const freq = 0.012;
      const slowFreq = 0.003;
      // Deterministic: pre-sample noise at this x position approximation
      return (
        baseY -
        amplitude * Math.sin(frame * freq + xRatio * 6) -
        amplitude * 0.4 * Math.sin(frame * slowFreq + xRatio * 3)
      );
    }

    function draw() {
      const w = cvs.width;
      const h = cvs.height;
      if (w === 0 || h === 0) return;

      ctx.clearRect(0, 0, w, h);

      // ── Grid lines ──────────────────────────────────────────
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      const cols = 8;
      const rows = 5;
      for (let i = 1; i < cols; i++) {
        const x = (w / cols) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let j = 1; j < rows; j++) {
        const y = (h / rows) * j;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // ── Price chart fill + line ──────────────────────────────
      const STEPS = Math.min(w, 600);
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i <= STEPS; i++) {
        const xRatio = i / STEPS;
        const px = xRatio * w;
        const baseY = h * 0.55;
        const amp = h * 0.15;
        const frame = t - (STEPS - i) * 0.7;
        const py =
          baseY -
          amp * Math.sin(frame * 0.012 + xRatio * 6) -
          amp * 0.4 * Math.sin(frame * 0.003 + xRatio * 3);
        points.push({ x: px, y: py });
      }

      // Gradient fill under chart
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(16,185,129,0.10)");
      grad.addColorStop(0.5, "rgba(16,185,129,0.04)");
      grad.addColorStop(1, "rgba(16,185,129,0)");

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Chart line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = "rgba(16,185,129,0.65)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glowing tip at the rightmost point
      const tip = points[points.length - 1];
      const tipGlow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 12);
      tipGlow.addColorStop(0, "rgba(16,185,129,0.7)");
      tipGlow.addColorStop(1, "rgba(16,185,129,0)");
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = tipGlow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();

      // ── Signal markers ───────────────────────────────────────
      // Spawn new marker every SIGNAL_INTERVAL frames
      if (t - lastSignalFrame >= SIGNAL_INTERVAL) {
        lastSignalFrame = t;
        const mx = tip.x;
        const my = tip.y;
        const type = Math.random() > 0.5 ? "BUY" : "SELL";
        signalMarkers.push({ x: mx, y: my, type, opacity: 1, age: 0 });
      }

      for (let i = signalMarkers.length - 1; i >= 0; i--) {
        const m = signalMarkers[i];
        m.age++;
        if (m.age > 180) {
          signalMarkers.splice(i, 1);
          continue;
        }
        // Fade: appear over first 15 frames, hold, fade last 60
        if (m.age < 15) m.opacity = m.age / 15;
        else if (m.age > 120) m.opacity = (180 - m.age) / 60;
        else m.opacity = 1;

        drawSignalMarker(ctx, m);
      }

      // ── Particles ─────────────────────────────────────────────
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4;
        if (p.y > h + 4) p.y = -4;

        // Pulse opacity
        const pulse =
          0.4 + 0.6 * Math.abs(Math.sin(t * 0.025 + p.pulseOffset));
        const alpha = p.opacity * pulse;

        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        glow.addColorStop(0, `rgba(16,185,129,${alpha})`);
        glow.addColorStop(1, "rgba(16,185,129,0)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52,211,153,${alpha * 0.9})`;
        ctx.fill();
      }

      t++;
      animFrameId = requestAnimationFrame(draw);
    }

    function drawSignalMarker(
      c: CanvasRenderingContext2D,
      m: SignalMarker
    ) {
      const isBuy = m.type === "BUY";
      const color = isBuy ? "#10b981" : "#f43f5e";
      const size = 8;
      const yOffset = isBuy ? -20 : 20;

      c.save();
      c.globalAlpha = m.opacity;

      // Triangle
      c.beginPath();
      if (isBuy) {
        // Triangle pointing up
        c.moveTo(m.x, m.y + yOffset - size);
        c.lineTo(m.x + size * 0.8, m.y + yOffset + size * 0.4);
        c.lineTo(m.x - size * 0.8, m.y + yOffset + size * 0.4);
      } else {
        // Triangle pointing down
        c.moveTo(m.x, m.y + yOffset + size);
        c.lineTo(m.x + size * 0.8, m.y + yOffset - size * 0.4);
        c.lineTo(m.x - size * 0.8, m.y + yOffset - size * 0.4);
      }
      c.closePath();
      c.fillStyle = color;
      c.fill();

      // Label
      c.font = "bold 8px monospace";
      c.fillStyle = color;
      c.textAlign = "center";
      c.fillText(m.type, m.x, m.y + yOffset + (isBuy ? -size - 4 : size + 12));

      c.restore();
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
    />
  );
}
