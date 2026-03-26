'use client';

import { useRef, useState, useCallback } from 'react';

export interface ShareSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  sl?: number;
  tp1?: number;
  timeframe: string;
  timestamp?: number;
}

interface ShareSignalProps {
  signal: ShareSignal;
  onClose?: () => void;
}

function drawSignalCard(canvas: HTMLCanvasElement, signal: ShareSignal) {
  const W = 600;
  const H = 340;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const isBuy = signal.direction === 'BUY';
  const accentColor = isBuy ? '#10B981' : '#EF4444';
  const accentBg = isBuy ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';

  // Background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Left accent bar
  ctx.fillStyle = accentColor;
  const barGrad = ctx.createLinearGradient(0, 0, 0, H);
  barGrad.addColorStop(0, accentColor);
  barGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, 0, 3, H);

  // Direction badge background
  ctx.fillStyle = accentBg;
  ctx.beginPath();
  ctx.roundRect(24, 24, 120, 44, 10);
  ctx.fill();
  ctx.strokeStyle = isBuy ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(24, 24, 120, 44, 10);
  ctx.stroke();

  // Direction text
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 20px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(signal.direction, 36, 46);

  // Arrow indicator
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 16px monospace';
  ctx.fillText(isBuy ? '▲' : '▼', 100, 46);

  // Symbol
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px -apple-system, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(signal.symbol, 24, 110);

  // Timeframe badge
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.roundRect(24, 118, 60, 20, 4);
  ctx.fill();
  ctx.fillStyle = '#71717A';
  ctx.font = '11px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(signal.timeframe, 33, 128);

  // Confidence bar section
  const barX = 24;
  const barY = 160;
  const barW = W - 48;
  const barH = 6;

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 3);
  ctx.fill();

  const fillW = (barW * signal.confidence) / 100;
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
  fillGrad.addColorStop(0, accentColor);
  fillGrad.addColorStop(1, isBuy ? '#34D399' : '#F87171');
  ctx.fillStyle = fillGrad;
  ctx.beginPath();
  ctx.roundRect(barX, barY, fillW, barH, 3);
  ctx.fill();

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 14px monospace';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${signal.confidence}% confidence`, barX, barY - 8);

  // Price levels
  const fmtPrice = (n: number) => n >= 1000 ? n.toFixed(2) : n.toFixed(5);
  const levels: Array<{ label: string; value: string; color: string }> = [
    { label: 'ENTRY', value: fmtPrice(signal.entry), color: '#FFFFFF' },
  ];
  if (signal.sl !== undefined) {
    levels.push({ label: 'STOP LOSS', value: fmtPrice(signal.sl), color: '#EF4444' });
  }
  if (signal.tp1 !== undefined) {
    levels.push({ label: 'TARGET', value: fmtPrice(signal.tp1), color: '#10B981' });
  }

  const colW = (W - 48) / Math.max(levels.length, 3);
  levels.forEach((lvl, i) => {
    const x = 24 + i * colW;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(x, 188, colW - 12, 72, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, 188, colW - 12, 72, 8);
    ctx.stroke();

    ctx.fillStyle = '#52525B';
    ctx.font = '10px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(lvl.label, x + 12, 200);

    ctx.fillStyle = lvl.color;
    ctx.font = 'bold 15px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(lvl.value, x + 12, 220);
  });

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, H - 44, W, 44);

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 13px -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('TradeClaw', 24, H - 22);

  ctx.fillStyle = '#3F3F46';
  ctx.font = '11px monospace';
  ctx.fillText('AI Trading Signals', 120, H - 22);

  if (signal.timestamp) {
    const ts = new Date(signal.timestamp).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    ctx.fillStyle = '#27272A';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(ts, W - 24, H - 22);
    ctx.textAlign = 'left';
  }
}

export function ShareSignalModal({ signal, onClose }: ShareSignalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [status, setStatus] = useState<'idle' | 'copied' | 'shared' | 'downloading'>('idle');

  const renderCard = useCallback(() => {
    if (!canvasRef.current) return;
    drawSignalCard(canvasRef.current, signal);
    setRendered(true);
  }, [signal]);

  const getBlob = async (): Promise<Blob | null> => {
    if (!canvasRef.current) return null;
    return new Promise(resolve => canvasRef.current!.toBlob(resolve, 'image/png'));
  };

  const handleShare = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], `tradeclaw-${signal.symbol}-${signal.direction}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: `${signal.symbol} ${signal.direction} — ${signal.confidence}% confidence`,
          text: `TradeClaw signal: ${signal.symbol} ${signal.direction} entry ${signal.entry}`,
          files: [file],
        });
        setStatus('shared');
        setTimeout(() => setStatus('idle'), 2000);
      } catch { /* cancelled */ }
    } else {
      // Fallback: copy link
      const deepLink = `${window.location.origin}/dashboard?signal=${encodeURIComponent(JSON.stringify({ symbol: signal.symbol, direction: signal.direction, confidence: signal.confidence }))}`;
      await navigator.clipboard.writeText(deepLink);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const handleCopyImage = async () => {
    const blob = await getBlob();
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      // Fallback: download
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    setStatus('downloading');
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeclaw-${signal.symbol}-${signal.direction}-${signal.confidence}pct.png`;
    a.click();
    setTimeout(() => setStatus('idle'), 1000);
  };

  const handleCopyLink = async () => {
    const signalPath = `/signal/${signal.symbol}-${signal.timeframe}-${signal.direction}`;
    const deepLink = `${window.location.origin}${signalPath}`;
    await navigator.clipboard.writeText(deepLink);
    setStatus('copied');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const getTwitterUrl = () => {
    const fmtP = (n: number) => n >= 1000 ? n.toFixed(2) : n >= 1 ? n.toFixed(4) : n.toFixed(5);
    const signalPath = `/signal/${signal.symbol}-${signal.timeframe}-${signal.direction}`;
    const url = `${window.location.origin}${signalPath}`;
    const text = [
      `${signal.symbol} ${signal.direction} — ${signal.confidence}% confidence`,
      signal.entry ? `Entry: ${fmtP(signal.entry)}` : '',
      signal.sl ? `SL: ${fmtP(signal.sl)}` : '',
      signal.tp1 ? `TP1: ${fmtP(signal.tp1)}` : '',
      ``,
      `Free AI trading signal via TradeClaw`,
    ].filter(Boolean).join('\n');
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  };

  const getTelegramUrl = () => {
    const signalPath = `/signal/${signal.symbol}-${signal.timeframe}-${signal.direction}`;
    const url = `${window.location.origin}${signalPath}`;
    const text = `${signal.symbol} ${signal.direction} ${signal.confidence}% confidence — TradeClaw AI Signal`;
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card p-6 w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Share Signal</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-lg leading-none">&times;</button>
        </div>

        {/* Canvas preview */}
        <div className="bg-[#050505] rounded-xl overflow-hidden border border-white/5 mb-4">
          <canvas
            ref={canvasRef}
            className="w-full h-auto block"
            style={{ aspectRatio: '600/340' }}
          />
          {!rendered && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={renderCard}
                className="px-4 py-2 rounded-lg text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
              >
                Preview card
              </button>
            </div>
          )}
        </div>

        {!rendered && (
          <button
            onClick={renderCard}
            className="w-full mb-4 py-2 rounded-xl text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            Generate card
          </button>
        )}

        {/* Action buttons */}
        {rendered && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
            <button
              onClick={handleShare}
              className="py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            >
              {status === 'shared' ? 'Shared!' : 'Share'}
            </button>
            <button
              onClick={handleCopyImage}
              className="py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:border-white/20 transition-colors"
            >
              {status === 'copied' ? 'Copied!' : 'Copy image'}
            </button>
            <button
              onClick={handleDownload}
              className="py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:border-white/20 transition-colors"
            >
              {status === 'downloading' ? 'Saving...' : 'Download'}
            </button>
          </div>
        )}
        {rendered && (
          <div className="grid grid-cols-3 gap-2">
            <a
              href={getTwitterUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 rounded-xl text-xs font-semibold text-center transition-colors
                bg-[#1d9bf0]/10 border border-[#1d9bf0]/20 text-[#1d9bf0] hover:bg-[#1d9bf0]/20"
            >
              Share on X
            </a>
            <a
              href={getTelegramUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 rounded-xl text-xs font-semibold text-center transition-colors
                bg-[#0088cc]/10 border border-[#0088cc]/20 text-[#0088cc] hover:bg-[#0088cc]/20"
            >
              Telegram
            </a>
            <button
              onClick={handleCopyLink}
              className="py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:border-white/20 transition-colors"
            >
              {status === 'copied' ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        )}

        {/* Signal summary */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-4 text-xs text-zinc-600">
          <span className={signal.direction === 'BUY' ? 'text-emerald-500' : 'text-red-500'}>{signal.direction}</span>
          <span>{signal.symbol}</span>
          <span>{signal.timeframe}</span>
          <span>{signal.confidence}%</span>
        </div>
      </div>
    </div>
  );
}
