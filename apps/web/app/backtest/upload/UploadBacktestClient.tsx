'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Play, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';

interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradeResult {
  id: number;
  date: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  tp: number;
  sl: number;
  exit: number;
  pnlPct: number;
  outcome: 'WIN' | 'LOSS' | 'OPEN';
  exitReason: 'TP' | 'SL' | 'EOD';
  barsHeld: number;
}

interface BacktestStats {
  totalSignals: number;
  winRate: number;
  totalPnlPct: number;
  maxDrawdown: number;
  sharpeRatio: number;
  wins: number;
  losses: number;
}

interface BacktestResponse {
  trades: TradeResult[];
  stats: BacktestStats;
  equityCurve: number[];
}

// ─── CSV Parser ──────────────────────────────────────────────

function parseCSV(text: string): { candles: OHLCVCandle[]; error?: string } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { candles: [], error: 'CSV is empty or has no data rows' };

  const headerLine = lines[0].toLowerCase();
  const cols = headerLine.split(',').map(h => h.trim());

  const getIdx = (names: string[]) => {
    for (const n of names) {
      const i = cols.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };

  const dateIdx = getIdx(['date', 'time', 'datetime', 'timestamp']);
  const openIdx = getIdx(['open']);
  const highIdx = getIdx(['high']);
  const lowIdx = getIdx(['low']);
  const closeIdx = getIdx(['close', 'adj close']);
  const volIdx = getIdx(['volume', 'vol']);

  if (closeIdx === -1) return { candles: [], error: 'Could not find a "close" column in CSV header' };

  const candles: OHLCVCandle[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));
    if (parts.length < 2) continue;

    const close = parseFloat(parts[closeIdx]);
    if (isNaN(close) || close <= 0) continue;

    let timestamp = Date.now() - (lines.length - i) * 3600000;
    if (dateIdx !== -1) {
      const raw = parts[dateIdx];
      const parsed = Date.parse(raw);
      if (!isNaN(parsed)) timestamp = parsed;
    }

    const open = openIdx !== -1 ? parseFloat(parts[openIdx]) : close;
    const high = highIdx !== -1 ? parseFloat(parts[highIdx]) : close * 1.002;
    const low = lowIdx !== -1 ? parseFloat(parts[lowIdx]) : close * 0.998;
    const volume = volIdx !== -1 ? parseFloat(parts[volIdx]) : 0;

    candles.push({
      timestamp,
      open: isNaN(open) ? close : open,
      high: isNaN(high) ? close * 1.002 : high,
      low: isNaN(low) ? close * 0.998 : low,
      close,
      volume: isNaN(volume) ? 0 : volume,
    });
  }

  if (candles.length < 60) {
    return { candles, error: `Only ${candles.length} valid rows found — need at least 60` };
  }

  return { candles };
}

// ─── Equity Curve Canvas ─────────────────────────────────────

function EquityCurve({ curve }: { curve: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || curve.length < 2) return;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const W = rect.width;
      const H = rect.height;

      const pad = { top: 12, right: 12, bottom: 24, left: 48 };
      const cW = W - pad.left - pad.right;
      const cH = H - pad.top - pad.bottom;
      const min = Math.min(...curve) * 0.995;
      const max = Math.max(...curve) * 1.005;
      const range = max - min || 1;
      const toX = (i: number) => pad.left + (i / (curve.length - 1)) * cW;
      const toY = (v: number) => pad.top + cH - ((v - min) / range) * cH;

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let g = 0; g <= 4; g++) {
        const y = pad.top + (g / 4) * cH;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      }

      const isProfit = curve[curve.length - 1] >= curve[0];
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
      grad.addColorStop(0, isProfit ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');

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

      // Y labels
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      for (let g = 0; g <= 4; g++) {
        const v = min + (range * (4 - g)) / 4;
        ctx.fillText(`$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)}`, pad.left - 3, pad.top + (g / 4) * cH + 4);
      }

      // X labels
      ctx.textAlign = 'center';
      [0, 0.5, 1].forEach(p => {
        const i = Math.floor(p * (curve.length - 1));
        ctx.fillText(`T${i}`, toX(i), pad.top + cH + 16);
      });
    };

    render();
    const ro = new ResizeObserver(render);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [curve]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ─── Stat Card ───────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-[var(--border)]">
      <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-base font-bold font-mono tabular-nums ${color ?? 'text-[var(--foreground)]'}`}>{value}</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function UploadBacktestClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [candles, setCandles] = useState<OHLCVCandle[]>([]);
  const [preview, setPreview] = useState<OHLCVCandle[]>([]);
  const [parseError, setParseError] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [apiError, setApiError] = useState('');

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setParseError('Please upload a .csv file');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const { candles: parsed, error } = parseCSV(text);
      if (error) {
        setParseError(error);
        setCandles([]);
        setPreview([]);
      } else {
        setParseError('');
        setCandles(parsed);
        setPreview(parsed.slice(0, 5));
        setFileName(file.name);
        setResult(null);
        setApiError('');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleRun = useCallback(async () => {
    if (candles.length < 60) return;
    setRunning(true);
    setApiError('');
    try {
      const res = await fetch('/api/backtest/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candles }),
      });
      const data = await res.json() as BacktestResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Backtest failed');
      setResult(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRunning(false);
    }
  }, [candles]);

  const handleDownloadCSV = useCallback(() => {
    if (!result) return;
    const headers = ['#', 'Date', 'Direction', 'Entry', 'TP', 'SL', 'Exit', 'P&L%', 'Outcome', 'Exit Reason', 'Bars Held'];
    const rows = result.trades.map(t => [
      t.id, t.date, t.direction, t.entry, t.tp, t.sl, t.exit,
      `${t.pnlPct > 0 ? '+' : ''}${t.pnlPct.toFixed(2)}%`,
      t.outcome, t.exitReason, t.barsHeld,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeclaw-backtest-${fileName.replace('.csv', '')}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, fileName]);

  const shareText = result
    ? encodeURIComponent(
        `I backtested my own OHLCV data with @TradeClaw:\n` +
        `Win Rate: ${result.stats.winRate}% | P&L: ${result.stats.totalPnlPct > 0 ? '+' : ''}${result.stats.totalPnlPct}%\n` +
        `Sharpe: ${result.stats.sharpeRatio} | Max DD: -${result.stats.maxDrawdown}%\n\n` +
        `Try it free: https://github.com/naimkatiman/tradeclaw ⭐`,
      )
    : '';

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-20 md:pb-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1 text-[var(--text-secondary)] text-xs">
            <Link href="/backtest" className="hover:text-[var(--foreground)] transition-colors">Backtesting</Link>
            <span>/</span>
            <span>Upload CSV</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Upload Your Own Data</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Drag and drop a CSV file with OHLCV data to run TradeClaw&apos;s signal engine on your own historical dataset.
          </p>
        </div>

        {/* Format hint */}
        <div className="mb-6 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300">
          <strong>Expected CSV format:</strong>{' '}
          <span className="font-mono">date, open, high, low, close, volume</span> — header row required.
          Min 60 rows, max 10,000. Date column can be any standard format (YYYY-MM-DD, ISO8601, etc.).
          Volume column is optional.
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 p-10 text-center mb-6
            ${isDragging
              ? 'border-emerald-500/60 bg-emerald-500/5'
              : candles.length > 0
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-[var(--border)] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          {candles.length > 0 ? (
            <>
              <FileText className="mx-auto mb-2 text-emerald-400" size={32} />
              <div className="text-sm font-semibold text-emerald-400">{fileName}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">{candles.length.toLocaleString()} candles loaded — click to replace</div>
            </>
          ) : (
            <>
              <Upload className="mx-auto mb-3 text-[var(--text-secondary)]" size={32} />
              <div className="text-sm font-semibold mb-1">Drop your CSV here</div>
              <div className="text-xs text-[var(--text-secondary)]">or click to browse — .csv files only</div>
            </>
          )}
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400">
            {parseError}
          </div>
        )}

        {/* Preview table */}
        {preview.length > 0 && (
          <div className="mb-6 glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-xs font-semibold">Preview (first 5 rows)</span>
              <span className="text-[10px] text-[var(--text-secondary)] font-mono">{candles.length.toLocaleString()} total rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {['Date', 'Open', 'High', 'Low', 'Close', 'Volume'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((c, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      <td className="px-4 py-2 font-mono text-[var(--text-secondary)]">
                        {new Date(c.timestamp).toISOString().slice(0, 10)}
                      </td>
                      <td className="px-4 py-2 font-mono">{c.open.toFixed(5)}</td>
                      <td className="px-4 py-2 font-mono text-emerald-400/70">{c.high.toFixed(5)}</td>
                      <td className="px-4 py-2 font-mono text-red-400/70">{c.low.toFixed(5)}</td>
                      <td className="px-4 py-2 font-mono font-semibold">{c.close.toFixed(5)}</td>
                      <td className="px-4 py-2 font-mono text-[var(--text-secondary)]">
                        {c.volume > 0 ? c.volume.toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Run button */}
        {candles.length >= 60 && (
          <div className="mb-6">
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            >
              {running ? (
                <>
                  <span className="w-4 h-4 border border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" />
                  Running backtest...
                </>
              ) : (
                <>
                  <Play size={14} />
                  Run Backtest on {candles.length.toLocaleString()} candles
                </>
              )}
            </button>
          </div>
        )}

        {/* API error */}
        {apiError && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400">
            {apiError}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <StatCard
                label="Signals"
                value={String(result.stats.totalSignals)}
              />
              <StatCard
                label="Win Rate"
                value={`${result.stats.winRate}%`}
                color={result.stats.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}
              />
              <StatCard
                label="Wins"
                value={String(result.stats.wins)}
                color="text-emerald-400"
              />
              <StatCard
                label="Losses"
                value={String(result.stats.losses)}
                color="text-red-400"
              />
              <StatCard
                label="Total P&amp;L"
                value={`${result.stats.totalPnlPct > 0 ? '+' : ''}${result.stats.totalPnlPct}%`}
                color={result.stats.totalPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}
              />
              <StatCard
                label="Max Drawdown"
                value={`-${result.stats.maxDrawdown}%`}
                color={result.stats.maxDrawdown <= 10 ? 'text-emerald-400' : result.stats.maxDrawdown <= 20 ? 'text-yellow-400' : 'text-red-400'}
              />
              <StatCard
                label="Sharpe"
                value={String(result.stats.sharpeRatio)}
                color={result.stats.sharpeRatio >= 1.5 ? 'text-emerald-400' : result.stats.sharpeRatio >= 1 ? 'text-yellow-400' : 'text-red-400'}
              />
            </div>

            {/* Equity curve */}
            <div className="glass-card rounded-2xl p-5">
              <div className="text-xs font-semibold mb-3">Equity Curve</div>
              <div className="h-48">
                <EquityCurve curve={result.equityCurve} />
              </div>
            </div>

            {/* Trade log */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-xs font-semibold">{result.trades.length} Trades</span>
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-white/8 transition-all"
                >
                  <Download size={10} />
                  Download CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {['#', 'Date', 'Dir', 'Entry', 'Exit', 'P&L%', 'Outcome', 'Reason', 'Bars'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.slice(0, 100).map(t => (
                      <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{t.id}</td>
                        <td className="px-3 py-2 font-mono text-[var(--text-secondary)] text-[10px]">{t.date}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-bold flex items-center gap-1 ${t.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {t.direction === 'BUY' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {t.direction}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{t.entry}</td>
                        <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{t.exit}</td>
                        <td className={`px-3 py-2 font-mono font-semibold tabular-nums ${t.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.pnlPct > 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                            t.outcome === 'WIN' ? 'text-emerald-400 bg-emerald-500/10' :
                            t.outcome === 'LOSS' ? 'text-red-400 bg-red-500/10' :
                            'text-[var(--text-secondary)] bg-zinc-500/10'
                          }`}>
                            {t.outcome}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                            t.exitReason === 'TP' ? 'text-emerald-400 bg-emerald-500/10' :
                            t.exitReason === 'SL' ? 'text-red-400 bg-red-500/10' :
                            'text-[var(--text-secondary)] bg-zinc-500/10'
                          }`}>
                            {t.exitReason}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{t.barsHeld}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.trades.length > 100 && (
                  <div className="px-4 py-3 text-center text-[10px] text-[var(--text-secondary)]">
                    Showing 100 of {result.trades.length} trades — download CSV for full results
                  </div>
                )}
              </div>
            </div>

            {/* Share + Star CTA */}
            <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold mb-1">Share your results</div>
                <div className="text-xs text-[var(--text-secondary)]">Let the quant community know about TradeClaw</div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <a
                  href={`https://twitter.com/intent/tweet?text=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all"
                >
                  Share on X
                </a>
                <a
                  href="https://github.com/naimkatiman/tradeclaw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
                >
                  ⭐ Star on GitHub
                </a>
              </div>
            </div>

            {/* Back link + disclaimer */}
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Minus size={10} />
              <span>
                Signals are generated by TradeClaw&apos;s EMA/RSI/MACD engine.
                Outcomes resolved against uploaded candle price action. Not financial advice.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
