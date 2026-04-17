'use client';

import { useEffect, useRef, useState } from 'react';
import { Info, TrendingUp, Target, BarChart2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface CalibrationBucket {
  label: string;           // e.g. "60-69%"
  confMin: number;
  confMax: number;
  count: number;
  wins: number;
  winRate: number;         // actual win rate
  midpoint: number;        // expected win rate (midpoint of bucket)
  calibrationError: number; // abs(winRate - midpoint)
}

interface CalibrationData {
  buckets: CalibrationBucket[];
  overallAccuracy: number;
  totalSignals: number;
  isSimulated: boolean;
  brier: number;           // Brier score (lower is better, 0.25 = random)
  ece: number;             // Expected Calibration Error
  updatedAt: string;
}

function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !buckets.length) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const pad = { top: 24, right: 24, bottom: 48, left: 56 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = pad.top + chartH - (chartH * i / 10);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
    }

    // Perfect calibration diagonal
    ctx.strokeStyle = 'rgba(99,102,241,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + chartH);
    ctx.lineTo(pad.left + chartW, pad.top);
    ctx.stroke();
    ctx.setLineDash([]);

    // Diagonal label
    ctx.fillStyle = 'rgba(99,102,241,0.7)';
    ctx.font = '11px system-ui';
    ctx.save();
    ctx.translate(pad.left + chartW - 60, pad.top + 18);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText('Perfect', 0, 0);
    ctx.restore();

    // Bars
    const barW = (chartW / buckets.length) * 0.6;
    buckets.forEach((b, i) => {
      const x = pad.left + (i + 0.5) * (chartW / buckets.length) - barW / 2;
      const actualH = chartH * b.winRate;
      const expectedH = chartH * b.midpoint;
      const y = pad.top + chartH - actualH;

      // Actual bar
      const isOverConfident = b.winRate < b.midpoint - 0.05;
      const isUnderConfident = b.winRate > b.midpoint + 0.05;
      const barColor = isOverConfident
        ? 'rgba(239,68,68,0.7)'
        : isUnderConfident
        ? 'rgba(251,191,36,0.7)'
        : 'rgba(0,212,163,0.7)';

      const grad = ctx.createLinearGradient(0, y, 0, pad.top + chartH);
      grad.addColorStop(0, barColor);
      grad.addColorStop(1, barColor.replace('0.7', '0.3'));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, actualH, [4, 4, 0, 0]);
      ctx.fill();

      // Expected line
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 4, pad.top + chartH - expectedH);
      ctx.lineTo(x + barW + 4, pad.top + chartH - expectedH);
      ctx.stroke();

      // Count label
      if (b.count > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(String(b.count), x + barW / 2, y - 6);
      }

      // X label
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, x + barW / 2, pad.top + chartH + 16);
    });

    // Y axis labels
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px system-ui';
    for (let i = 0; i <= 10; i += 2) {
      const y = pad.top + chartH - (chartH * i / 10);
      ctx.fillText(`${i * 10}%`, pad.left - 8, y + 4);
    }

    // Axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Confidence Bucket', pad.left + chartW / 2, H - 6);
    ctx.save();
    ctx.translate(14, pad.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Actual Win Rate', 0, 0);
    ctx.restore();
  }, [buckets]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 280 }}
    />
  );
}

export function CalibrationClient() {
  const [data, setData] = useState<CalibrationData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/calibration');
      const json = await res.json();
      setData(json);
    } catch {
      // fallback demo data
      const buckets: CalibrationBucket[] = [
        { label: '50-59%', confMin: 0.50, confMax: 0.60, count: 18, wins: 10, winRate: 0.556, midpoint: 0.545, calibrationError: 0.011 },
        { label: '60-69%', confMin: 0.60, confMax: 0.70, count: 24, wins: 16, winRate: 0.667, midpoint: 0.645, calibrationError: 0.022 },
        { label: '70-79%', confMin: 0.70, confMax: 0.80, count: 31, wins: 22, winRate: 0.710, midpoint: 0.745, calibrationError: 0.035 },
        { label: '80-89%', confMin: 0.80, confMax: 0.90, count: 19, wins: 15, winRate: 0.789, midpoint: 0.845, calibrationError: 0.056 },
        { label: '90-99%', confMin: 0.90, confMax: 1.00, count: 8, wins: 7, winRate: 0.875, midpoint: 0.945, calibrationError: 0.070 },
      ];
      setData({
        buckets,
        overallAccuracy: 0.700,
        totalSignals: 100,
        isSimulated: true,
        brier: 0.21,
        ece: 0.038,
        updatedAt: new Date().toISOString(),
      });
    }
    setLoading(false);
  }

  useEffect(() => { setTimeout(() => load(), 0); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const wellCalibrated = data.ece < 0.05;
  const briferScore = data.brier < 0.20 ? 'Excellent' : data.brier < 0.25 ? 'Good' : 'Fair';

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 md:pb-8">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              Confidence Calibration
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">Does 80% confidence → 80% win rate?</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Explainer */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 flex gap-4">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-zinc-300 space-y-1">
            <p className="font-medium text-white">What is calibration?</p>
            <p>A well-calibrated model means: signals labeled <strong>80% confidence</strong> should win roughly <strong>80% of the time</strong>, signals labeled <strong>60%</strong> should win ~<strong>60%</strong> of the time, etc.</p>
            <p className="text-zinc-400">The chart below compares expected win rates (horizontal lines) vs actual outcomes (bars). Perfect calibration = all bars touching the lines.</p>
          </div>
        </div>

        {/* Simulated warning */}
        {data.isSimulated && (
          <div className="bg-zinc-500/10 border border-zinc-500/30 rounded-xl p-4 flex gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-zinc-300 font-medium">Demo data</p>
              <p className="text-zinc-400/80 mt-0.5">These results are based on simulated signal history. As live signals accumulate, this page will reflect real forward-performance data.</p>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400 mb-1">Total Signals</div>
            <div className="text-2xl font-bold text-white">{data.totalSignals}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400 mb-1">Overall Win Rate</div>
            <div className="text-2xl font-bold text-emerald-400">{(data.overallAccuracy * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400 mb-1">Brier Score</div>
            <div className="text-2xl font-bold text-white">{data.brier.toFixed(3)}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{briferScore} · lower is better</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-xs text-zinc-400 mb-1">Calibration Error</div>
            <div className={`text-2xl font-bold ${wellCalibrated ? 'text-emerald-400' : 'text-zinc-400'}`}>
              {(data.ece * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">ECE · {wellCalibrated ? 'well calibrated' : 'needs tuning'}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Calibration Curve
            </h2>
            <div className="flex gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/70 inline-block" />
                Well calibrated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500/70 inline-block" />
                Over-confident
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-zinc-400/70 inline-block" />
                Under-confident
              </span>
            </div>
          </div>
          <CalibrationChart buckets={data.buckets} />
          <p className="text-xs text-zinc-500 mt-3 text-center">
            Bars = actual win rate · Horizontal lines = expected win rate · Count shown above each bar
          </p>
        </div>

        {/* Bucket breakdown table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Bucket Breakdown
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-400 border-b border-zinc-800">
                  <th className="px-5 py-3 text-left font-normal">Confidence</th>
                  <th className="px-4 py-3 text-right font-normal">Count</th>
                  <th className="px-4 py-3 text-right font-normal">Wins</th>
                  <th className="px-4 py-3 text-right font-normal">Expected</th>
                  <th className="px-4 py-3 text-right font-normal">Actual</th>
                  <th className="px-4 py-3 text-right font-normal">Error</th>
                  <th className="px-4 py-3 text-right font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.buckets.map((b) => {
                  const diff = b.winRate - b.midpoint;
                  const isGood = Math.abs(diff) < 0.05;
                  const isOver = diff < -0.05;
                  return (
                    <tr key={b.label} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-zinc-300">{b.label}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{b.count}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{b.wins}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{(b.midpoint * 100).toFixed(0)}%</td>
                      <td className={`px-4 py-3 text-right font-semibold ${isGood ? 'text-emerald-400' : isOver ? 'text-red-400' : 'text-zinc-400'}`}>
                        {b.count > 0 ? `${(b.winRate * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-400 font-mono text-xs">
                        {b.count > 0 ? `${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.count === 0 ? (
                          <span className="text-zinc-600 text-xs">no data</span>
                        ) : isGood ? (
                          <span className="flex items-center justify-end gap-1 text-emerald-400 text-xs">
                            <CheckCircle className="w-3 h-3" /> Good
                          </span>
                        ) : isOver ? (
                          <span className="flex items-center justify-end gap-1 text-red-400 text-xs">
                            <AlertCircle className="w-3 h-3" /> Over-confident
                          </span>
                        ) : (
                          <span className="flex items-center justify-end gap-1 text-zinc-400 text-xs">
                            <AlertCircle className="w-3 h-3" /> Under-confident
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 text-sm">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            Methodology
          </h2>
          <div className="space-y-2 text-zinc-400">
            <p><strong className="text-zinc-300">Outcome definition:</strong> A signal is a &quot;win&quot; if price hits Take Profit 1 before Stop Loss within 24 hours of signal generation.</p>
            <p><strong className="text-zinc-300">Brier Score:</strong> Mean squared error between confidence (0-1) and outcome (0 or 1). Score of 0 = perfect, 0.25 = random, 1.0 = perfectly wrong.</p>
            <p><strong className="text-zinc-300">ECE (Expected Calibration Error):</strong> Weighted average of the difference between predicted confidence and actual win rate across buckets. Below 5% is considered well-calibrated.</p>
            <p><strong className="text-zinc-300">Data source:</strong> {data.isSimulated ? 'Simulated seed data until sufficient live signals accumulate.' : 'Live tracked signals from the TradeClaw signal engine.'}</p>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-zinc-600 text-center">
          Updated: {new Date(data.updatedAt).toLocaleString()} · {data.totalSignals} signals analyzed
        </p>
      </div>
    </div>
  );
}
