'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Share2, Copy, RefreshCw, Zap } from 'lucide-react';

interface Signal {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  timeframe: string;
  price?: number;
  rsi?: number;
  tp?: number;
  sl?: number;
  timestamp?: string;
}

const PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'];
const TIMEFRAMES = ['H1', 'H4', 'D1'];

function useToast() {
  const [toast, setToast] = useState('');
  const show = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);
  return { toast, show };
}

export function CardClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState('');
  const [pair, setPair] = useState('BTCUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const { toast, show } = useToast();

  const fetchSignal = useCallback(async (p: string, tf: string) => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(`/api/signals?pair=${p}&timeframe=${tf}&limit=1`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const sig = (data.signals || [])[0];
      if (sig) {
        setSignal(sig);
      } else {
        throw new Error('no signal returned');
      }
    } catch {
      setSignal(null);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSignal(pair, timeframe); }, [pair, timeframe, fetchSignal]);

  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !signal) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1200, H = 630;
    canvas.width = W;
    canvas.height = H;

    const isBuy = signal.direction === 'BUY';
    const accentColor = isBuy ? '#10b981' : '#f43f5e';
    const accentDark = isBuy ? '#059669' : '#e11d48';

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#070c10');
    bgGrad.addColorStop(0.5, '#050810');
    bgGrad.addColorStop(1, '#030508');
    ctx.fillStyle = bgGrad;
    roundRect(ctx, 0, 0, W, H, 24, true, false);

    // Radial glow
    const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 400);
    glow.addColorStop(0, isBuy ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    const barGrad = ctx.createLinearGradient(0, 0, W, 0);
    barGrad.addColorStop(0, accentColor);
    barGrad.addColorStop(0.5, accentDark);
    barGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, W, 4);

    // Left vertical accent line
    const lineGrad = ctx.createLinearGradient(0, 0, 0, H);
    lineGrad.addColorStop(0, accentColor);
    lineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, 0, 4, H);

    // TradeClaw logo/branding — top left
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('⚡ TRADECLAW', 52, 52);

    // Star CTA — top right
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillText('github.com/naimkatiman/tradeclaw', W - 380, 52);

    // Main: pair symbol — large
    ctx.font = 'bold 96px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 40;
    ctx.fillText(signal.symbol.replace('USD', ''), 72, 200);
    ctx.shadowBlur = 0;

    // Slash USD
    ctx.font = 'bold 42px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    const symWidth = ctx.measureText(signal.symbol.replace('USD', '')).width;
    ctx.fillText('/ USD', 72 + symWidth + 8, 195);

    // Timeframe badge
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(signal.timeframe, 72, 240);

    // BUY / SELL badge — huge
    const badgeW = 240, badgeH = 80, badgeX = 72, badgeY = 272;
    ctx.fillStyle = isBuy ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)';
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 16, true, false);
    ctx.strokeStyle = isBuy ? 'rgba(16,185,129,0.6)' : 'rgba(244,63,94,0.6)';
    ctx.lineWidth = 2;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 16, false, true);

    ctx.font = 'bold 42px monospace';
    ctx.fillStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 20;
    ctx.fillText(isBuy ? '▲ BUY' : '▼ SELL', badgeX + 24, badgeY + 52);
    ctx.shadowBlur = 0;

    // Confidence
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('CONFIDENCE', 72, 410);

    ctx.font = 'bold 52px monospace';
    ctx.fillStyle = signal.confidence >= 80 ? '#10b981' : signal.confidence >= 70 ? '#f59e0b' : '#6b7280';
    ctx.fillText(`${signal.confidence}%`, 72, 468);

    // Confidence bar
    const barY = 482, barX = 72, barW = 340, barH = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, barX, barY, barW, barH, 6, true, false);
    ctx.fillStyle = signal.confidence >= 80 ? '#10b981' : signal.confidence >= 70 ? '#f59e0b' : '#6b7280';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    roundRect(ctx, barX, barY, barW * (signal.confidence / 100), barH, 6, true, false);
    ctx.shadowBlur = 0;

    // RSI indicator
    if (signal.rsi) {
      const rsiColor = signal.rsi > 70 ? '#f43f5e' : signal.rsi < 30 ? '#10b981' : '#f59e0b';
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('RSI', 72, 540);
      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = rsiColor;
      ctx.fillText(String(Math.round(signal.rsi)), 72, 572);
    }

    // Vertical divider
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(560, 140);
    ctx.lineTo(560, H - 60);
    ctx.stroke();

    // Right side: personalized greeting
    const rightX = 600;
    if (name.trim()) {
      ctx.font = 'bold 26px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(`Signal for`, rightX, 180);
      ctx.font = 'bold 52px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 20;
      // Truncate long names
      let displayName = name.trim();
      while (ctx.measureText(displayName).width > 560 && displayName.length > 1) {
        displayName = displayName.slice(0, -1);
      }
      ctx.fillText(displayName, rightX, 240);
      ctx.shadowBlur = 0;
    } else {
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillText('Enter your name', rightX, 220);
      ctx.font = '18px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillText('to personalize this card', rightX, 252);
    }

    // Signal metadata grid (right)
    const metaItems = [
      { label: 'PLATFORM', value: 'TradeClaw AI' },
      { label: 'INDICATORS', value: 'RSI · MACD · EMA · BB' },
      { label: 'GENERATED', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
      { label: 'SOURCE', value: 'Open Source · Self-Hosted' },
    ];
    metaItems.forEach((item, i) => {
      const y = 320 + i * 64;
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText(item.label, rightX, y);
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(item.value, rightX, y + 26);
    });

    // Bottom CTA bar
    const ctaGrad = ctx.createLinearGradient(0, H - 70, W, H - 70);
    ctaGrad.addColorStop(0, 'rgba(16,185,129,0.12)');
    ctaGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ctaGrad;
    ctx.fillRect(0, H - 70, W, 70);

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText('⭐ Star on GitHub', 72, H - 28);
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('Free · Open Source · No Login Required', 300, H - 28);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('tradeclaw.win', W - 180, H - 28);

    setGenerated(true);
  }, [signal, name]);

  useEffect(() => { if (signal) drawCard(); }, [signal, name, drawCard]);

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: boolean, stroke: boolean) {
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
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `tradeclaw-${pair}-${signal?.direction || 'signal'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    show('Card downloaded!');
  };

  const copyCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        show('Copied to clipboard!');
      });
    } catch {
      show('Download instead (clipboard API not available)');
    }
  };

  const shareOnTwitter = () => {
    const text = `Just got a ${signal?.direction} signal on ${pair} with ${signal?.confidence}% confidence from @TradeClaw AI!\n\nFree & open-source trading signals: `;
    const url = `https://tradeclaw.win`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-emerald-400 mb-3">
            <Zap className="w-3 h-3" />
            Social Card Generator
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Create Your Signal Card
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto text-sm">
            Generate a personalized trading signal card to share on Twitter, Discord, or Telegram.
            Show your friends you use AI-powered signals.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl p-5 border border-white/8 bg-zinc-900/50">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">Customize</h2>

              {/* Name */}
              <div className="mb-4">
                <label className="text-xs text-zinc-500 mb-1 block">Your Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Trader"
                  maxLength={24}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-black/40 border border-white/8 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {/* Pair */}
              <div className="mb-4">
                <label className="text-xs text-zinc-500 mb-1 block">Asset Pair</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PAIRS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPair(p)}
                      className="rounded-lg px-2 py-1.5 text-xs font-mono font-semibold transition-all duration-150"
                      style={{
                        background: pair === p ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${pair === p ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        color: pair === p ? '#10b981' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {p.replace('USD', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeframe */}
              <div className="mb-5">
                <label className="text-xs text-zinc-500 mb-1 block">Timeframe</label>
                <div className="flex gap-2">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className="flex-1 rounded-lg py-1.5 text-xs font-mono font-semibold transition-all duration-150"
                      style={{
                        background: timeframe === tf ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${timeframe === tf ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        color: timeframe === tf ? '#10b981' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Refresh */}
              <button
                onClick={() => fetchSignal(pair, timeframe)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Signal
              </button>
            </div>

            {/* Actions */}
            {generated && (
              <div className="rounded-2xl p-5 border border-white/8 bg-zinc-900/50 space-y-3">
                <h2 className="text-sm font-semibold text-zinc-300 mb-4">Share Your Card</h2>

                <button
                  onClick={downloadCard}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', boxShadow: '0 0 16px rgba(16,185,129,0.2)' }}
                >
                  <Download className="w-4 h-4" />
                  Download PNG
                </button>

                <button
                  onClick={shareOnTwitter}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'rgba(29,161,242,0.15)', border: '1px solid rgba(29,161,242,0.3)', color: '#1da1f2' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.737l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Share on Twitter/X
                </button>

                <button
                  onClick={copyCard}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                >
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </button>

                <div className="pt-2 border-t border-white/5">
                  <p className="text-xs text-zinc-600 text-center">1200 × 630px · Optimized for social media</p>
                </div>
              </div>
            )}

            {/* Star CTA */}
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            >
              <Share2 className="w-4 h-4 text-yellow-400" />
              ⭐ Star TradeClaw on GitHub
            </a>
          </div>

          {/* Canvas preview */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden border border-white/8 bg-black/40">
              {/* Preview label */}
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Preview (1200 × 630)</span>
                {signal && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: signal.direction === 'BUY' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                      color: signal.direction === 'BUY' ? '#10b981' : '#f43f5e',
                      border: `1px solid ${signal.direction === 'BUY' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                    }}
                  >
                    {signal.direction === 'BUY' ? '▲' : '▼'} {signal.direction} · {signal.confidence}%
                  </span>
                )}
              </div>
              <div className="p-4">
                <canvas
                  ref={canvasRef}
                  className="w-full rounded-xl"
                  style={{ imageRendering: 'crisp-edges' }}
                />
                {loading && (
                  <div className="text-center py-4 text-xs text-zinc-600 animate-pulse">Fetching live signal...</div>
                )}
              </div>
            </div>

            {/* Share tip */}
            <div className="mt-4 rounded-xl p-4 border border-white/5 bg-zinc-900/30">
              <p className="text-xs text-zinc-500 leading-relaxed">
                <span className="text-emerald-400 font-semibold">💡 Tip:</span> Download your card and post it on Twitter/X, Discord, or Telegram with{' '}
                <span className="text-white font-mono text-[11px]">#TradeClaw</span>. Tag us and we&apos;ll retweet!
                The more people who see it, the faster we reach 1,000 ⭐.
              </p>
            </div>
          </div>
        </div>

        {/* Examples section */}
        <div className="mt-12 text-center">
          <h2 className="text-xl font-bold mb-2">Why share a signal card?</h2>
          <p className="text-zinc-500 text-sm max-w-2xl mx-auto mb-6">
            Every share brings TradeClaw closer to 1,000 GitHub stars — which unlocks the{' '}
            <span className="text-emerald-400">managed cloud version</span>, mobile app, and enterprise features.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: '🎯', title: 'Show your edge', desc: 'AI-scored signals with exact confidence %' },
              { icon: '⚡', title: 'Drive awareness', desc: 'Every share = more stars = better product' },
              { icon: '🤝', title: 'Build community', desc: 'Join traders using open-source AI signals' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl p-4 border border-white/5 bg-zinc-900/30 text-left">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm font-semibold text-white mb-1">{item.title}</div>
                <div className="text-xs text-zinc-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50 transition-all"
          style={{ background: 'rgba(16,185,129,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
