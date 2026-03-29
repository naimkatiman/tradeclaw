'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sprout, Zap, Flame, Gem, Rocket, Trophy, Sparkles, Target, Gift } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const REPO_URL = 'https://github.com/naimkatiman/tradeclaw';
const STAR_TARGET = 1000;

interface GitHubStats {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
}

interface Milestone {
  stars: number;
  label: string;
  icon: LucideIcon;
  message: string;
  unlock: string;
}

const MILESTONES: Milestone[] = [
  { stars: 10, label: '10 Stars', icon: Sprout, message: 'First community signal!', unlock: 'First community signal fires' },
  { stars: 25, label: '25 Stars', icon: Zap, message: 'Gaining momentum!', unlock: 'Telegram bot goes live' },
  { stars: 50, label: '50 Stars', icon: Flame, message: 'On fire!', unlock: 'Strategy builder release' },
  { stars: 100, label: '100 Stars', icon: Gem, message: 'Triple digits!', unlock: 'Plugin ecosystem launch' },
  { stars: 250, label: '250 Stars', icon: Rocket, message: 'Going viral!', unlock: 'Mobile app beta' },
  { stars: 500, label: '500 Stars', icon: Trophy, message: 'Half-way hero!', unlock: 'Enterprise features unlock' },
  { stars: 1000, label: '1,000 Stars', icon: Sparkles, message: 'Legendary! We made it!', unlock: 'Full SaaS launch' },
];

function useCountUp(target: number, duration: number, triggered: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!triggered || target === 0) return;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [target, duration, triggered]);

  return count;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

function fireConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const colors = ['#10b981', '#34d399', '#f59e0b', '#fbbf24', '#ffffff', '#6ee7b7', '#fde68a'];

  const particles: ConfettiParticle[] = Array.from({ length: 80 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 200,
    y: H * 0.3,
    vx: (Math.random() - 0.5) * 8,
    vy: Math.random() * -6 - 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 6 + 3,
    alpha: 1,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.2,
  }));

  let start: number | null = null;
  const duration = 2500;

  const animate = (timestamp: number) => {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;

    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.vx *= 0.99;
      p.alpha = Math.max(0, 1 - elapsed / duration);
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }

    if (elapsed < duration) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, W, H);
  };

  requestAnimationFrame(animate);
}

function drawStarChart(canvas: HTMLCanvasElement, currentStars: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, W, H);

  // Generate mock growth data (logistic curve over 6 months, 26 weeks)
  const weeks = 26;
  const data: number[] = [];
  const k = 0.3; // steepness
  const midpoint = 16; // week where growth is fastest

  for (let i = 0; i <= weeks; i++) {
    const logistic = STAR_TARGET / (1 + Math.exp(-k * (i - midpoint)));
    // Add some noise
    const noise = (Math.random() - 0.5) * 10;
    data.push(Math.max(0, Math.round(logistic + noise)));
  }

  // Clamp the current point to match actual stars
  const currentWeek = 4; // assume we're at week 4 now
  data[currentWeek] = currentStars;

  const maxVal = STAR_TARGET * 1.05;

  const toX = (i: number) => PAD.left + (i / weeks) * chartW;
  const toY = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();
  }

  // Milestone dashed lines
  const milestoneLevels = [100, 250, 500, 1000];
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  for (const m of milestoneLevels) {
    const y = toY(m);
    ctx.strokeStyle = m <= currentStars ? 'rgba(251,191,36,0.5)' : 'rgba(251,191,36,0.2)';
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();

    ctx.fillStyle = m <= currentStars ? 'rgba(251,191,36,0.8)' : 'rgba(251,191,36,0.4)';
    ctx.font = '10px monospace';
    ctx.fillText(`${m}★`, PAD.left - 46, y + 4);
  }
  ctx.setLineDash([]);

  // Gradient fill under the curve
  const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
  grad.addColorStop(0, 'rgba(16,185,129,0.3)');
  grad.addColorStop(1, 'rgba(16,185,129,0)');

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(data[0]));
  for (let i = 1; i <= weeks; i++) {
    ctx.lineTo(toX(i), toY(data[i]));
  }
  ctx.lineTo(toX(weeks), toY(0));
  ctx.lineTo(toX(0), toY(0));
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Main line
  const lineGrad = ctx.createLinearGradient(PAD.left, 0, PAD.left + chartW, 0);
  lineGrad.addColorStop(0, '#10b981');
  lineGrad.addColorStop(1, '#34d399');

  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(data[0]));
  for (let i = 1; i <= weeks; i++) {
    ctx.lineTo(toX(i), toY(data[i]));
  }
  ctx.stroke();

  // "Today" dot
  ctx.beginPath();
  ctx.arc(toX(currentWeek), toY(currentStars), 5, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // "Today" label
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`${currentStars}★ today`, toX(currentWeek) + 8, toY(currentStars) - 6);

  // X-axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '10px monospace';
  const monthLabels = ['Now', 'Mo 2', 'Mo 3', 'Mo 4', 'Mo 5', 'Mo 6'];
  for (let i = 0; i < monthLabels.length; i++) {
    const x = toX(Math.round((i / (monthLabels.length - 1)) * weeks));
    ctx.fillText(monthLabels[i], x - 12, H - PAD.bottom + 18);
  }
}

export function StarsClient() {
  const [stats, setStats] = useState<GitHubStats>({ stars: 0, forks: 0, watchers: 0, openIssues: 0 });
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const animatedStars = useCountUp(stats.stars, 2000, loaded);

  // Fetch stats
  useEffect(() => {
    fetch('/api/github-stars')
      .then((r) => r.json())
      .then((data: GitHubStats) => {
        setStats(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Confetti on milestone
  useEffect(() => {
    if (!loaded || stats.stars === 0) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const reached = MILESTONES.filter((m) => stats.stars >= m.stars);
    if (reached.length > 0 && confettiRef.current) {
      fireConfetti(confettiRef.current);
    }
  }, [loaded, stats.stars]);

  // Draw chart
  const drawChart = useCallback(() => {
    const canvas = chartRef.current;
    const container = chartContainerRef.current;
    if (!canvas || !container || !loaded) return;
    canvas.width = container.clientWidth;
    canvas.height = 220;
    drawStarChart(canvas, stats.stars);
  }, [loaded, stats.stars]);

  useEffect(() => {
    drawChart();
    const observer = new ResizeObserver(drawChart);
    if (chartContainerRef.current) observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, [drawChart]);

  const highestMilestone = [...MILESTONES].reverse().find((m) => stats.stars >= m.stars);
  const progressPct = Math.min((stats.stars / STAR_TARGET) * 100, 100);

  const twitterShareUrl = () => {
    const milestone = highestMilestone ? `${highestMilestone.label} milestone!` : 'growing fast!';
    const text = encodeURIComponent(
      `TradeClaw just hit the ${milestone} Self-hosted AI trading signals, MIT licensed — star it on GitHub:\n${REPO_URL}`
    );
    return `https://twitter.com/intent/tweet?text=${text}`;
  };

  const badgeMarkdown = `[![GitHub Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](${REPO_URL})`;
  const badgeHtml = `<a href="${REPO_URL}"><img src="https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social" alt="GitHub Stars"></a>`;

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Confetti canvas — overlay */}
      <canvas
        ref={confettiRef}
        width={800}
        height={600}
        className="pointer-events-none fixed inset-0 z-50 w-full h-full"
        aria-hidden="true"
      />

      <div className="pt-28 pb-20 px-4 max-w-4xl mx-auto space-y-16">

        {/* ── Hero: Star Counter ── */}
        <section className="text-center space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Live GitHub Stars
          </div>

          <div className="space-y-2">
<<<<<<< HEAD
            <div className="text-8xl font-black tracking-tight tabular-nums text-white" aria-live="polite">
=======
            <div className="text-8xl font-black tracking-tight tabular-nums text-[var(--foreground)]" aria-live="polite">
>>>>>>> origin/main
              {loaded ? animatedStars.toLocaleString() : '—'}
            </div>
            <div className="text-[var(--text-secondary)] text-lg">GitHub stars and counting</div>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
              {stats.forks} forks
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              {stats.watchers} watchers
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              {stats.openIssues} open issues
            </span>
          </div>

          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 px-8 py-3.5 text-sm font-semibold text-black transition-all duration-300 active:scale-[0.98] shadow-[0_0_24px_rgba(16,185,129,0.4)] hover:shadow-[0_0_36px_rgba(16,185,129,0.6)]"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Star TradeClaw on GitHub
          </a>
        </section>

        {/* ── Progress Bar ── */}
        <section className="glass-card rounded-2xl p-6 space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between text-sm">
<<<<<<< HEAD
            <span className="font-semibold text-white">Progress to 1,000 Stars</span>
            <span className="text-emerald-400 font-mono font-bold">{progressPct.toFixed(1)}%</span>
          </div>

          <div className="relative h-4 rounded-full bg-white/5 overflow-hidden">
=======
            <span className="font-semibold text-[var(--foreground)]">Progress to 1,000 Stars</span>
            <span className="text-emerald-400 font-mono font-bold">{progressPct.toFixed(1)}%</span>
          </div>

          <div className="relative h-4 rounded-full bg-[var(--glass-bg)] overflow-hidden">
>>>>>>> origin/main
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300 transition-all duration-[1500ms] ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              style={{ width: loaded ? `${progressPct}%` : '0%' }}
            />
            {/* Milestone markers */}
            {MILESTONES.map((m) => (
              <div
                key={m.stars}
                className="absolute top-0 bottom-0 w-px"
                style={{
                  left: `${(m.stars / STAR_TARGET) * 100}%`,
                  backgroundColor: stats.stars >= m.stars ? 'rgba(251,191,36,0.8)' : 'rgba(255,255,255,0.2)',
                }}
                title={m.label}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>{stats.stars.toLocaleString()} stars</span>
            <span className="flex items-center gap-1">1,000 stars <Target className="w-3.5 h-3.5 inline" /></span>
          </div>

          {/* Milestone chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {MILESTONES.map((m) => (
              <span
                key={m.stars}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-all ${
                  stats.stars >= m.stars
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
<<<<<<< HEAD
                    : 'border-white/10 bg-white/5 text-[var(--text-secondary)]'
=======
                    : 'border-[var(--border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'
>>>>>>> origin/main
                }`}
              >
                {stats.stars >= m.stars && '✓ '}<m.icon className="w-3.5 h-3.5 inline" /> {m.label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Milestone Celebration ── */}
        {highestMilestone && (
          <section className="relative rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-center space-y-3 overflow-hidden opacity-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="flex justify-center"><highestMilestone.icon className="w-12 h-12 text-amber-300" /></div>
            <h2 className="text-2xl font-bold text-amber-300">{highestMilestone.message}</h2>
            <p className="text-[var(--text-secondary)]">
              You&apos;ve reached the <strong className="text-amber-400">{highestMilestone.label}</strong> milestone!
            </p>
            <p className="text-sm text-emerald-400 font-medium">
              <Gift className="w-4 h-4 inline mr-1" /> Unlocked: {highestMilestone.unlock}
            </p>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />
          </section>
        )}

        {/* ── Star History Chart ── */}
        <section className="glass-card rounded-2xl p-6 space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between">
<<<<<<< HEAD
            <h2 className="font-semibold text-white">Star Growth Trajectory</h2>
=======
            <h2 className="font-semibold text-[var(--foreground)]">Star Growth Trajectory</h2>
>>>>>>> origin/main
            <span className="text-xs text-[var(--text-secondary)]">Projected path to 1,000</span>
          </div>
          <div ref={chartContainerRef} className="w-full">
            <canvas ref={chartRef} className="w-full rounded-lg" style={{ height: '220px' }} />
          </div>
          <p className="text-xs text-[var(--text-secondary)] text-center">
            Gold dot = today &nbsp;·&nbsp; Dashed lines = milestones &nbsp;·&nbsp; Curve = projected growth
          </p>
        </section>

        {/* ── Share Milestone ── */}
        <section className="glass-card rounded-2xl p-6 space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
<<<<<<< HEAD
          <h2 className="font-semibold text-white">Share the Milestone</h2>
=======
          <h2 className="font-semibold text-[var(--foreground)]">Share the Milestone</h2>
>>>>>>> origin/main
          <p className="text-sm text-[var(--text-secondary)]">Help us reach 1,000 — one tweet can make a difference.</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={twitterShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
<<<<<<< HEAD
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-medium transition-all duration-200"
=======
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] px-5 py-3 text-sm font-medium transition-all duration-200"
>>>>>>> origin/main
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share on X / Twitter
            </a>

            <button
              onClick={() => copyToClipboard(
                `TradeClaw is an open-source AI trading signals platform — ${stats.stars} GitHub stars and growing! MIT licensed, self-hostable. Check it out: ${REPO_URL}`,
                'shareText'
              )}
<<<<<<< HEAD
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-medium transition-all duration-200"
=======
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] px-5 py-3 text-sm font-medium transition-all duration-200"
>>>>>>> origin/main
            >
              {copied === 'shareText' ? (
                <><svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Copied!</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copy share text</>
              )}
            </button>
          </div>
        </section>

        {/* ── Embed Code ── */}
        <section className="glass-card rounded-2xl p-6 space-y-5 opacity-0 animate-fade-up" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
          <div>
<<<<<<< HEAD
            <h2 className="font-semibold text-white">Embed on Your Site</h2>
=======
            <h2 className="font-semibold text-[var(--foreground)]">Embed on Your Site</h2>
>>>>>>> origin/main
            <p className="text-sm text-[var(--text-secondary)] mt-1">Copy-paste a live star badge anywhere.</p>
          </div>

          {/* Badge preview */}
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social"
              alt="GitHub Stars badge"
              className="h-5"
            />
            <span className="text-xs text-[var(--text-secondary)]">Live badge — updates automatically</span>
          </div>

          {/* Markdown */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Markdown</div>
            <div className="relative">
<<<<<<< HEAD
              <pre className="rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap break-all">
=======
              <pre className="rounded-xl bg-black/40 border border-[var(--border)] px-4 py-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap break-all">
>>>>>>> origin/main
                {badgeMarkdown}
              </pre>
              <button
                onClick={() => copyToClipboard(badgeMarkdown, 'markdown')}
<<<<<<< HEAD
                className="absolute top-2 right-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs transition-all"
=======
                className="absolute top-2 right-2 rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] px-2.5 py-1 text-xs transition-all"
>>>>>>> origin/main
              >
                {copied === 'markdown' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* HTML */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">HTML</div>
            <div className="relative">
<<<<<<< HEAD
              <pre className="rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap break-all">
=======
              <pre className="rounded-xl bg-black/40 border border-[var(--border)] px-4 py-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap break-all">
>>>>>>> origin/main
                {badgeHtml}
              </pre>
              <button
                onClick={() => copyToClipboard(badgeHtml, 'html')}
<<<<<<< HEAD
                className="absolute top-2 right-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs transition-all"
=======
                className="absolute top-2 right-2 rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] px-2.5 py-1 text-xs transition-all"
>>>>>>> origin/main
              >
                {copied === 'html' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </section>

        {/* ── Help Us Reach 1,000 Stars ── */}
        <section className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: '380ms', animationFillMode: 'forwards' }}>
          <div className="text-center space-y-2">
<<<<<<< HEAD
            <h2 className="text-2xl font-bold text-white">Help Us Reach 1,000 Stars</h2>
=======
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Help Us Reach 1,000 Stars</h2>
>>>>>>> origin/main
            <p className="text-[var(--text-secondary)]">Every action below moves the counter. Pick one — or all five.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Star on GitHub */}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:border-emerald-500/30 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/25 transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <div>
<<<<<<< HEAD
                <div className="text-sm font-semibold text-white">Star on GitHub</div>
=======
                <div className="text-sm font-semibold text-[var(--foreground)]">Star on GitHub</div>
>>>>>>> origin/main
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">Takes 2 seconds, means the world.</div>
              </div>
              <div className="text-xs text-emerald-400 font-medium mt-auto">Star now →</div>
            </a>

            {/* Share on Twitter */}
            <a
              href={twitterShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:border-sky-500/30 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/25 transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </div>
              <div>
<<<<<<< HEAD
                <div className="text-sm font-semibold text-white">Share on X / Twitter</div>
=======
                <div className="text-sm font-semibold text-[var(--foreground)]">Share on X / Twitter</div>
>>>>>>> origin/main
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">One tweet reaches 1000+ developers.</div>
              </div>
              <div className="text-xs text-sky-400 font-medium mt-auto">Tweet now →</div>
            </a>

            {/* Write a Blog Post */}
            <a
              href={`https://dev.to/new?prefill=---+title%3A+I+tried+TradeClaw%2C+the+open-source+AI+trading+signals+platform%0A---`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:border-violet-500/30 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/25 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              </div>
              <div>
<<<<<<< HEAD
                <div className="text-sm font-semibold text-white">Write a Blog Post</div>
=======
                <div className="text-sm font-semibold text-[var(--foreground)]">Write a Blog Post</div>
>>>>>>> origin/main
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">Share your experience on dev.to or Medium.</div>
              </div>
              <div className="text-xs text-violet-400 font-medium mt-auto">Draft on dev.to →</div>
            </a>

            {/* Contribute Code */}
            <a
              href="/contribute"
              className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:border-amber-500/30 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/25 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              </div>
              <div>
<<<<<<< HEAD
                <div className="text-sm font-semibold text-white">Contribute Code</div>
=======
                <div className="text-sm font-semibold text-[var(--foreground)]">Contribute Code</div>
>>>>>>> origin/main
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">Good first issues waiting for you.</div>
              </div>
              <div className="text-xs text-amber-400 font-medium mt-auto">See open issues →</div>
            </a>

            {/* Self-Host & Share */}
            <a
              href="https://github.com/naimkatiman/tradeclaw#quick-start"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:border-rose-500/30 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/25 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>
              </div>
              <div>
<<<<<<< HEAD
                <div className="text-sm font-semibold text-white">Self-Host & Share</div>
=======
                <div className="text-sm font-semibold text-[var(--foreground)]">Self-Host & Share</div>
>>>>>>> origin/main
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">Deploy in 5 min. Show your community.</div>
              </div>
              <div className="text-xs text-rose-400 font-medium mt-auto">Deploy with Docker →</div>
            </a>
          </div>
        </section>

        {/* ── Star History Chart ── */}
        <section className="glass-card rounded-2xl p-6 space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between">
<<<<<<< HEAD
            <h2 className="font-semibold text-white">Star History</h2>
=======
            <h2 className="font-semibold text-[var(--foreground)]">Star History</h2>
>>>>>>> origin/main
            <span className="text-xs text-[var(--text-secondary)]">via star-history.com</span>
          </div>
          <div className="w-full rounded-xl overflow-hidden bg-white/3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://api.star-history.com/svg?repos=naimkatiman/tradeclaw&type=Date"
              alt="Star History chart for naimkatiman/tradeclaw"
              className="w-full"
              loading="lazy"
            />
          </div>
        </section>

        {/* ── Join the Journey ── */}
        <section className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: '450ms', animationFillMode: 'forwards' }}>
          <div className="text-center space-y-2">
<<<<<<< HEAD
            <h2 className="text-2xl font-bold text-white">Join the Journey</h2>
=======
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Join the Journey</h2>
>>>>>>> origin/main
            <p className="text-[var(--text-secondary)]">Features unlock as TradeClaw grows. Every star counts.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {MILESTONES.map((m, i) => {
              const reached = stats.stars >= m.stars;
              const milestoneTweet = encodeURIComponent(
                `TradeClaw just hit the ${m.label} milestone! ${m.message} Self-hosted AI trading signals, MIT licensed — star it on GitHub:\n${REPO_URL}`
              );
              const milestoneShareUrl = `https://twitter.com/intent/tweet?text=${milestoneTweet}`;
              return (
                <div
                  key={m.stars}
                  className={`rounded-2xl border p-5 transition-all duration-300 ${
                    reached
                      ? 'border-amber-500/40 bg-amber-500/10'
<<<<<<< HEAD
                      : 'border-white/10 bg-white/3 opacity-60'
=======
                      : 'border-[var(--border)] bg-white/3 opacity-60'
>>>>>>> origin/main
                  }`}
                  style={{ animationDelay: `${450 + i * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <m.icon className="w-5 h-5 text-amber-300" />
<<<<<<< HEAD
                        <span className={`text-sm font-bold ${reached ? 'text-amber-300' : 'text-white'}`}>
=======
                        <span className={`text-sm font-bold ${reached ? 'text-amber-300' : 'text-[var(--foreground)]'}`}>
>>>>>>> origin/main
                          {m.label}
                        </span>
                        {reached && (
                          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-400">
                            ✓ Unlocked
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${reached ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)] opacity-70'}`}>
                        {m.unlock}
                      </p>
                    </div>
                    <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                      {!reached && (
                        <div className="text-xs text-[var(--text-secondary)]">
                          {(m.stars - stats.stars).toLocaleString()} more
                        </div>
                      )}
                      {reached && (
                        <a
                          href={milestoneShareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
<<<<<<< HEAD
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[10px] text-[var(--text-secondary)] transition-colors"
=======
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] px-2 py-1 text-[10px] text-[var(--text-secondary)] transition-colors"
>>>>>>> origin/main
                          title="Share this milestone"
                        >
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          Share
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-4">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-6 py-2.5 text-sm font-medium text-emerald-400 transition-all duration-300"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Star TradeClaw — help unlock the next milestone
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
