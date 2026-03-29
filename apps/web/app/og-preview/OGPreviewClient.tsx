'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Download,
  Share2,
  Copy,
  RefreshCw,
  ImageIcon,
  Star,
  Check,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Signal {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  timeframe: string;
  price?: number;
  rsi?: number;
  macd?: number;
  ema?: number;
  tp?: number;
  sl?: number;
}

type Theme = 'dark' | 'purple' | 'gold';
type DirectionOverride = 'auto' | 'BUY' | 'SELL';

const PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BNBUSD'];
const TIMEFRAMES = ['H1', 'H4', 'D1'];

const THEMES: { id: Theme; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'purple', label: 'Dark Purple' },
  { id: 'gold', label: 'Dark Gold' },
];

// ─── Toast hook ───────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState('');
  const show = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);
  return { toast, show };
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

function getThemeColors(theme: Theme, isBuy: boolean) {
  const accent = isBuy ? '#10b981' : '#f43f5e';
  const accentDim = isBuy ? '#059669' : '#e11d48';

  switch (theme) {
    case 'purple':
      return { bg0: '#0d0015', bg1: '#150025', text: '#e9d5ff', subText: '#a78bfa', border: '#4c1d95', accent: isBuy ? '#34d399' : '#f472b6', accentDim: isBuy ? '#10b981' : '#ec4899' };
    case 'gold':
      return { bg0: '#0f0c06', bg1: '#1a1408', text: '#fef3c7', subText: '#d97706', border: '#78350f', accent: isBuy ? '#10b981' : '#f43f5e', accentDim };
    default: // dark
      return { bg0: '#0a0a0a', bg1: '#0e1520', text: '#f1f5f9', subText: '#94a3b8', border: '#1e293b', accent, accentDim };
  }
}

function drawCard(
  canvas: HTMLCanvasElement,
  signal: Signal,
  name: string,
  theme: Theme,
  tagline: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = 1200, H = 630;
  canvas.width = W;
  canvas.height = H;
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';

  const isBuy = signal.direction === 'BUY';
  const C = getThemeColors(theme, isBuy);

  // ── Background ──
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, C.bg0);
  bg.addColorStop(1, C.bg1);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.35;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.globalAlpha = 1;

  // Glow orb
  const orb = ctx.createRadialGradient(W * 0.72, H * 0.3, 0, W * 0.72, H * 0.3, 380);
  orb.addColorStop(0, C.accent + '22');
  orb.addColorStop(1, 'transparent');
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, W, H);

  // ── Logo + brand (top-left) ──
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = C.accent;
  ctx.fillText('⬡ TradeClaw', 56, 64);

  ctx.font = '13px monospace';
  ctx.fillStyle = C.subText;
  ctx.fillText('AI Trading Signal Platform', 56, 86);

  // ── "Generated for" tag (top-right) ──
  if (name.trim()) {
    const tag = `Generated for ${name.trim()}`;
    ctx.font = '600 15px sans-serif';
    const tw = ctx.measureText(tag).width;
    const tx = W - tw - 72;

    // pill bg
    ctx.fillStyle = C.border;
    roundRect(ctx, tx - 12, 48, tw + 24, 28, 14);
    ctx.fill();

    ctx.fillStyle = C.subText;
    ctx.fillText(tag, tx, 67);
  }

  // ── Large pair label ──
  ctx.font = 'bold 80px monospace';
  ctx.fillStyle = C.text;
  ctx.fillText(signal.symbol, 56, 210);

  ctx.font = '600 20px monospace';
  ctx.fillStyle = C.subText;
  ctx.fillText(`${signal.timeframe} · AI Signal`, 58, 240);

  // ── Direction badge ──
  const badgeX = 56, badgeY = 270;
  const badgeW = 160, badgeH = 52;
  ctx.fillStyle = C.accent + '22';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
  ctx.fill();
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 1.5;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
  ctx.stroke();

  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = C.accent;
  const dir = signal.direction;
  const dw = ctx.measureText(dir).width;
  ctx.fillText(dir, badgeX + (badgeW - dw) / 2, badgeY + 34);

  // ── Confidence ──
  const confY = 358;
  ctx.font = '500 14px sans-serif';
  ctx.fillStyle = C.subText;
  ctx.fillText('Confidence', 56, confY);

  ctx.font = 'bold 42px monospace';
  ctx.fillStyle = C.accent;
  ctx.fillText(`${signal.confidence}%`, 56, confY + 48);

  // confidence bar
  const barX = 56, barY = confY + 60, barW = 340, barH = 8;
  ctx.fillStyle = C.border;
  roundRect(ctx, barX, barY, barW, barH, 4);
  ctx.fill();
  ctx.fillStyle = C.accent;
  roundRect(ctx, barX, barY, barW * (signal.confidence / 100), barH, 4);
  ctx.fill();

  // ── RSI / MACD / EMA metrics (right side) ──
  const metaX = 560, metaY = 180;
  const metrics: { label: string; value: string }[] = [
    { label: 'RSI', value: signal.rsi !== undefined ? signal.rsi.toFixed(1) : '—' },
    { label: 'MACD', value: signal.macd !== undefined ? (signal.macd >= 0 ? '+' : '') + signal.macd.toFixed(4) : '—' },
    { label: 'EMA', value: signal.ema !== undefined ? signal.ema.toFixed(2) : '—' },
  ];

  metrics.forEach((m, i) => {
    const my = metaY + i * 72;
    ctx.fillStyle = C.border;
    roundRect(ctx, metaX, my, 280, 56, 10);
    ctx.fill();

    ctx.font = '600 11px monospace';
    ctx.fillStyle = C.subText;
    ctx.fillText(m.label, metaX + 16, my + 22);

    ctx.font = 'bold 19px monospace';
    ctx.fillStyle = C.text;
    ctx.fillText(m.value, metaX + 16, my + 44);
  });

  // ── Decorative chart line (right) ──
  const lineX = 900, lineY0 = 160, lineH2 = 330;
  const pts: [number, number][] = [];
  let seed = signal.symbol.charCodeAt(0) + signal.confidence;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed % 1000) / 1000; };
  for (let i = 0; i < 20; i++) pts.push([lineX + i * 15, lineY0 + lineH2 - rand() * lineH2]);

  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 2; i++) {
    const cx1 = (pts[i][0] + pts[i + 1][0]) / 2;
    const cy1 = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], cx1, cy1);
  }
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ── Custom tagline ──
  if (tagline.trim()) {
    ctx.font = 'italic 16px sans-serif';
    ctx.fillStyle = C.subText;
    ctx.globalAlpha = 0.85;
    ctx.fillText(`"${tagline.trim()}"`, 56, 480);
    ctx.globalAlpha = 1;
  }

  // ── Footer bar ──
  ctx.fillStyle = C.border;
  ctx.fillRect(0, H - 68, W, 68);

  ctx.font = '500 13px monospace';
  ctx.fillStyle = C.subText;
  ctx.fillText('tradeclaw.win  ·  Open-source AI trading signals  ·  Star us on GitHub', 56, H - 30);

  // timestamp
  const ts = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  ctx.font = '13px monospace';
  ctx.fillStyle = C.subText;
  ctx.globalAlpha = 0.6;
  const tsW = ctx.measureText(ts).width;
  ctx.fillText(ts, W - tsW - 56, H - 30);
  ctx.globalAlpha = 1;

  void dpr; // used for reference
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OGPreviewClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [name, setName] = useState('');
  const [pair, setPair] = useState('BTCUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [theme, setTheme] = useState<Theme>('dark');
  const [dirOverride, setDirOverride] = useState<DirectionOverride>('auto');
  const [tagline, setTagline] = useState('');
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const { toast, show } = useToast();

  // ── Fetch signal ──
  const fetchSignal = useCallback(async (p: string, tf: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/signals?pair=${p}&timeframe=${tf}&limit=1`);
      if (!res.ok) throw new Error('fetch error');
      const data: { signals?: Signal[] } = await res.json();
      let sig = (data.signals ?? [])[0];
      if (!sig) throw new Error('empty');

      if (dirOverride !== 'auto') sig = { ...sig, direction: dirOverride };
      setSignal(sig);
    } catch {
      // synthetic fallback
      const fallback: Signal = {
        symbol: p,
        direction: dirOverride === 'auto' ? 'BUY' : dirOverride,
        confidence: 78,
        timeframe: tf,
        price: p.startsWith('BTC') ? 67420 : p.startsWith('ETH') ? 3540 : 2340,
        rsi: 54.2,
        macd: 0.0023,
        ema: p.startsWith('BTC') ? 66850 : p.startsWith('ETH') ? 3510 : 2310,
      };
      setSignal(fallback);
    } finally {
      setLoading(false);
    }
  }, [dirOverride]);

  useEffect(() => { fetchSignal(pair, timeframe); }, [pair, timeframe, dirOverride, fetchSignal]);

  // ── Re-draw when inputs change ──
  useEffect(() => {
    if (canvasRef.current && signal) {
      drawCard(canvasRef.current, signal, name, theme, tagline);
    }
  }, [signal, name, theme, tagline]);

  // ── Download PNG ──
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tradeclaw-${pair}-${timeframe}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
    show('Image downloaded!');
  }, [pair, timeframe, show]);

  // ── Copy image to clipboard ──
  const handleCopyImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (!blob) throw new Error('no blob');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedImg(true);
      setTimeout(() => setCopiedImg(false), 2000);
      show('Image copied to clipboard!');
    } catch {
      show('Copy failed — try downloading instead');
    }
  }, [show]);

  // ── Copy page link ──
  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/og-preview?pair=${pair}&tf=${timeframe}`;
    navigator.clipboard.writeText(url).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    show('Link copied!');
  }, [pair, timeframe, show]);

  // ── Share on X ──
  const handleShareX = useCallback(() => {
    const text = encodeURIComponent(
      `📊 ${signal?.direction ?? 'BUY'} signal on ${pair} (${timeframe}) — ${signal?.confidence ?? 78}% confidence\n\nGenerated by @TradeClaw — open-source AI trading signals 🤖\n\ntradeclaw.win`,
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener');
  }, [signal, pair, timeframe]);

  // ── Share on LinkedIn ──
  const handleShareLinkedIn = useCallback(() => {
    const url = encodeURIComponent(`https://tradeclaw.win/og-preview?pair=${pair}&tf=${timeframe}`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener');
  }, [pair, timeframe]);

  // ── Share on Reddit ──
  const handleShareReddit = useCallback(() => {
    const title = encodeURIComponent(`TradeClaw AI Signal: ${signal?.direction ?? 'BUY'} ${pair} ${timeframe} — ${signal?.confidence ?? 78}% confidence`);
    const url = encodeURIComponent('https://tradeclaw.win');
    window.open(`https://reddit.com/submit?url=${url}&title=${title}`, '_blank', 'noopener');
  }, [signal, pair, timeframe]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-24 pb-20 px-4">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl">
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
            <ImageIcon className="w-3.5 h-3.5" />
            OG Preview Generator
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Create Your Signal Card
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
            Personalise a 1200×630 social preview card with live AI signal data.
            Download or share — your card includes the TradeClaw branding to drive organic reach.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* ── Canvas preview ── */}
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] p-3">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-2xl">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="w-full rounded-xl"
                style={{ aspectRatio: '1200/630' }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors duration-200"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>

              <button
                onClick={handleCopyImage}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--glass-bg)] text-sm font-medium transition-colors duration-200"
              >
                {copiedImg ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                Copy Image
              </button>

              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--glass-bg)] text-sm font-medium transition-colors duration-200"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                Copy Link
              </button>

              <button
                onClick={() => fetchSignal(pair, timeframe)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--glass-bg)] text-sm font-medium transition-colors duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Signal
              </button>
            </div>

            {/* Share buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleShareX}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black border border-white/10 hover:bg-zinc-900 text-white text-sm font-medium transition-colors duration-200"
              >
                <ExternalLink className="w-4 h-4" />
                Share on X
              </button>

              <button
                onClick={handleShareLinkedIn}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0077b5] hover:bg-[#006097] text-white text-sm font-medium transition-colors duration-200"
              >
                <Share2 className="w-4 h-4" />
                LinkedIn
              </button>

              <button
                onClick={handleShareReddit}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff4500] hover:bg-[#e03d00] text-white text-sm font-medium transition-colors duration-200"
              >
                <Share2 className="w-4 h-4" />
                Reddit
              </button>
            </div>
          </div>

          {/* ── Controls ── */}
          <div className="space-y-6">
            {/* Name */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
                Personalise
              </h2>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block" htmlFor="og-name">
                  Your name / handle
                </label>
                <input
                  id="og-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. @naim"
                  maxLength={32}
                  className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block" htmlFor="og-tagline">
                  Custom tagline (optional)
                </label>
                <input
                  id="og-tagline"
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Trading smarter with AI"
                  maxLength={60}
                  className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500/50 transition-colors"
                />
                <span className="text-[10px] text-[var(--text-secondary)] mt-1 block">{tagline.length}/60</span>
              </div>
            </div>

            {/* Signal config */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
                Signal
              </h2>

              {/* Pair */}
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Pair</label>
                <div className="relative">
                  <select
                    value={pair}
                    onChange={(e) => setPair(e.target.value)}
                    className="w-full appearance-none bg-[var(--glass-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500/50 pr-8"
                  >
                    {PAIRS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)] pointer-events-none" />
                </div>
              </div>

              {/* Timeframe */}
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Timeframe</label>
                <div className="flex gap-2">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors duration-200 ${
                        timeframe === tf
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'border-[var(--border)] hover:bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction override */}
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Direction</label>
                <div className="flex gap-2">
                  {(['auto', 'BUY', 'SELL'] as DirectionOverride[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDirOverride(d)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors duration-200 ${
                        dirOverride === d
                          ? d === 'BUY'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : d === 'SELL'
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                            : 'bg-zinc-500/20 border-zinc-500/40 text-zinc-300'
                          : 'border-[var(--border)] hover:bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {d === 'auto' ? 'Auto' : d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Theme */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
                Theme
              </h2>
              <div className="flex gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors duration-200 ${
                      theme === t.id
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'border-[var(--border)] hover:bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live signal data card */}
            {signal && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Live Data
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Pair', value: signal.symbol },
                    { label: 'Direction', value: signal.direction },
                    { label: 'Confidence', value: `${signal.confidence}%` },
                    { label: 'RSI', value: signal.rsi !== undefined ? signal.rsi.toFixed(1) : '—' },
                    { label: 'MACD', value: signal.macd !== undefined ? signal.macd.toFixed(4) : '—' },
                    { label: 'EMA', value: signal.ema !== undefined ? signal.ema.toFixed(2) : '—' },
                  ].map((item) => (
                    <div key={item.label} className="bg-[var(--glass-bg)] rounded-xl p-2.5">
                      <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-0.5">{item.label}</div>
                      <div className={`text-sm font-semibold ${item.label === 'Direction' ? (signal.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400') : 'text-[var(--foreground)]'}`}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center space-y-3">
              <Star className="w-6 h-6 text-emerald-400 mx-auto" />
              <p className="text-sm text-[var(--text-secondary)]">
                Love TradeClaw? Star us on GitHub and help us reach 1,000 stars!
              </p>
              <a
                href="https://github.com/naimkatiman/tradeclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                ⭐ Star on GitHub
              </a>
              <p className="text-xs text-[var(--text-secondary)]">
                Or explore{' '}
                <Link href="/share" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                  more ways to share
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* ── Gallery: 6 example cards ── */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center mb-2">Example Signal Cards</h2>
          <p className="text-center text-[var(--text-secondary)] text-sm mb-8">
            See what the community is sharing
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {GALLERY_CARDS.map((card) => (
              <div key={card.pair} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                <svg viewBox="0 0 1200 630" className="w-full" role="img" aria-label={`${card.pair} ${card.direction} signal card`}>
                  <defs>
                    <linearGradient id={`bg-${card.pair}`} x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor={card.bg0} />
                      <stop offset="100%" stopColor={card.bg1} />
                    </linearGradient>
                  </defs>
                  <rect width="1200" height="630" fill={`url(#bg-${card.pair})`} />
                  {/* Grid pattern */}
                  {Array.from({ length: 20 }).map((_, i) => (
                    <line key={`v${i}`} x1={i * 60} y1="0" x2={i * 60} y2="630" stroke={card.border} strokeWidth="0.5" opacity="0.3" />
                  ))}
                  {Array.from({ length: 11 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={i * 60} x2="1200" y2={i * 60} stroke={card.border} strokeWidth="0.5" opacity="0.3" />
                  ))}
                  {/* Brand */}
                  <text x="56" y="64" fill={card.accent} fontFamily="monospace" fontWeight="bold" fontSize="22">TradeClaw</text>
                  <text x="56" y="86" fill={card.subText} fontFamily="monospace" fontSize="13">AI Trading Signal Platform</text>
                  {/* Pair */}
                  <text x="56" y="210" fill={card.text} fontFamily="monospace" fontWeight="bold" fontSize="80">{card.pair}</text>
                  <text x="58" y="240" fill={card.subText} fontFamily="monospace" fontWeight="600" fontSize="20">{card.tf} · AI Signal</text>
                  {/* Direction badge */}
                  <rect x="56" y="270" width="160" height="52" rx="12" fill={card.accent + '22'} stroke={card.accent} strokeWidth="1.5" />
                  <text x="136" y="304" fill={card.accent} fontFamily="monospace" fontWeight="bold" fontSize="28" textAnchor="middle">{card.direction}</text>
                  {/* Confidence */}
                  <text x="56" y="358" fill={card.subText} fontFamily="sans-serif" fontWeight="500" fontSize="14">Confidence</text>
                  <text x="56" y="406" fill={card.accent} fontFamily="monospace" fontWeight="bold" fontSize="42">{card.confidence}%</text>
                  {/* Confidence bar */}
                  <rect x="56" y="418" width="340" height="8" rx="4" fill={card.border} />
                  <rect x="56" y="418" width={340 * card.confidence / 100} height="8" rx="4" fill={card.accent} />
                  {/* Metrics */}
                  {card.metrics.map((m, i) => (
                    <g key={m.label}>
                      <rect x="560" y={180 + i * 72} width="280" height="56" rx="10" fill={card.border} />
                      <text x="576" y={202 + i * 72} fill={card.subText} fontFamily="monospace" fontWeight="600" fontSize="11">{m.label}</text>
                      <text x="576" y={224 + i * 72} fill={card.text} fontFamily="monospace" fontWeight="bold" fontSize="19">{m.value}</text>
                    </g>
                  ))}
                  {/* Footer */}
                  <rect x="0" y="562" width="1200" height="68" fill={card.border} />
                  <text x="56" y="600" fill={card.subText} fontFamily="monospace" fontWeight="500" fontSize="13">tradeclaw.win · Open-source AI trading signals · Star us on GitHub</text>
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Gallery data ─────────────────────────────────────────────────────────────

const GALLERY_CARDS = [
  {
    pair: 'BTCUSD', direction: 'BUY' as const, confidence: 87, tf: 'H4',
    bg0: '#0a0a0a', bg1: '#0e1520', text: '#f1f5f9', subText: '#94a3b8', border: '#1e293b', accent: '#10b981',
    metrics: [{ label: 'RSI', value: '62.4' }, { label: 'MACD', value: '+0.0034' }, { label: 'EMA', value: '67120.50' }],
  },
  {
    pair: 'ETHUSD', direction: 'SELL' as const, confidence: 72, tf: 'D1',
    bg0: '#0a0a0a', bg1: '#0e1520', text: '#f1f5f9', subText: '#94a3b8', border: '#1e293b', accent: '#f43f5e',
    metrics: [{ label: 'RSI', value: '71.8' }, { label: 'MACD', value: '-0.0012' }, { label: 'EMA', value: '3480.25' }],
  },
  {
    pair: 'XAUUSD', direction: 'BUY' as const, confidence: 91, tf: 'H1',
    bg0: '#0d0015', bg1: '#150025', text: '#e9d5ff', subText: '#a78bfa', border: '#4c1d95', accent: '#34d399',
    metrics: [{ label: 'RSI', value: '55.1' }, { label: 'MACD', value: '+0.0045' }, { label: 'EMA', value: '2342.80' }],
  },
  {
    pair: 'EURUSD', direction: 'SELL' as const, confidence: 65, tf: 'H4',
    bg0: '#0d0015', bg1: '#150025', text: '#e9d5ff', subText: '#a78bfa', border: '#4c1d95', accent: '#f472b6',
    metrics: [{ label: 'RSI', value: '38.7' }, { label: 'MACD', value: '-0.0008' }, { label: 'EMA', value: '1.0842' }],
  },
  {
    pair: 'USDJPY', direction: 'BUY' as const, confidence: 83, tf: 'D1',
    bg0: '#0f0c06', bg1: '#1a1408', text: '#fef3c7', subText: '#d97706', border: '#78350f', accent: '#10b981',
    metrics: [{ label: 'RSI', value: '58.3' }, { label: 'MACD', value: '+0.0019' }, { label: 'EMA', value: '151.45' }],
  },
  {
    pair: 'BNBUSD', direction: 'BUY' as const, confidence: 76, tf: 'H1',
    bg0: '#0f0c06', bg1: '#1a1408', text: '#fef3c7', subText: '#d97706', border: '#78350f', accent: '#10b981',
    metrics: [{ label: 'RSI', value: '49.6' }, { label: 'MACD', value: '+0.0015' }, { label: 'EMA', value: '612.30' }],
  },
];
