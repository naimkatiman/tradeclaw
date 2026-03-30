"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Copy, CheckCircle2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface TVAlert {
  id: string;
  symbol: string;
  exchange?: string;
  interval?: string;
  action: string;
  close?: number;
  volume?: number;
  message?: string;
  receivedAt: string;
  normalizedPair: string;
  normalizedAction: "BUY" | "SELL";
}

interface AlertStats {
  total: number;
  last24h: number;
  byPair: Record<string, number>;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function TVAlertsClient() {
  const [alerts, setAlerts] = useState<TVAlert[]>([]);
  const [stats, setStats] = useState<AlertStats>({ total: 0, last24h: 0, byPair: {} });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [openStep, setOpenStep] = useState<Record<number, boolean>>({});

  const webhookUrl = typeof window !== "undefined"
    ? window.location.origin + "/api/tradingview/webhook"
    : "https://your-domain.com/api/tradingview/webhook";

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/tradingview/alerts");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setStats(data.stats ?? { total: 0, last24h: 0, byPair: {} });
    } catch {
      // keep existing state on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
  }

  const mostActive = Object.entries(stats.byPair).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "\u2014";

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Hero */}
        <section className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded-full px-4 py-1.5 mb-6">
            <Zap className="w-4 h-4 text-[#FF6A00]" />
            <span className="text-sm text-[#FF6A00] font-medium">TradingView Integration</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Bridge TradingView &rarr; TradeClaw</h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Route Pine Script alerts to Telegram, Discord, and more. Works with any TradingView plan &mdash; even free accounts.</p>
        </section>

        {/* Webhook URL Card */}
        <section className="mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Your Webhook URL</h2>
          <div className="flex items-center gap-3 bg-zinc-800 rounded-xl px-4 py-3">
            <code className="flex-1 text-[#FF6A00] text-sm font-mono truncate">{webhookUrl}</code>
            <button onClick={() => copyToClipboard(webhookUrl, "url")} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors shrink-0">
              {copied["url"] ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied["url"] ? "Copied!" : "Copy"}
            </button>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="mb-8 grid grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#FF6A00]">{stats.total}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Alerts</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.last24h}</div>
            <div className="text-xs text-zinc-500 mt-1">Last 24h</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{mostActive}</div>
            <div className="text-xs text-zinc-500 mt-1">Most Active</div>
          </div>
        </section>

        {/* Live Alert Log */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Live Alert Log</h2>
          {loading ? (
            <div className="text-zinc-500 text-sm">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
              No alerts yet. Send your first webhook to see it here.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                  <span className="bg-[#FF6A00]/20 text-[#FF6A00] text-xs font-bold px-2 py-1 rounded shrink-0">{alert.normalizedPair}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${alert.normalizedAction === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>{alert.normalizedAction}</span>
                  <span className="text-zinc-300 text-sm flex-1 truncate">{alert.message ?? `${alert.symbol} ${alert.action}`}</span>
                  <span className="text-zinc-600 text-xs shrink-0">{formatRelativeTime(alert.receivedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Setup Guide */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Setup Guide</h2>
          <div className="space-y-2">
            {[
              { title: "1. Copy your webhook URL", content: "Copy the webhook URL shown above. You\u2019ll paste it into TradingView." },
              { title: "2. Create a TradingView Alert", content: "In TradingView, go to Alerts \u2192 Create Alert. In the Notifications tab, check Webhook URL and paste your webhook URL." },
              { title: "3. Set the alert message", content: "In the Message field, paste this JSON template (edit as needed):\n\n{\"symbol\":\"{{ticker}}\",\"exchange\":\"{{exchange}}\",\"interval\":\"{{interval}}\",\"action\":\"buy\",\"close\":{{close}},\"volume\":{{volume}},\"message\":\"Your alert message\"}" },
              { title: "4. Optional: Configure output channels", content: "Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in your .env file to receive alerts via Telegram. Set DISCORD_WEBHOOK_URL to post to a Discord channel." },
            ].map((step, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenStep(prev => ({ ...prev, [i]: !prev[i] }))}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800 transition-colors"
                >
                  <span className="font-medium text-sm">{step.title}</span>
                  {openStep[i] ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                </button>
                {openStep[i] && (
                  <div className="px-4 pb-4 text-zinc-400 text-sm whitespace-pre-wrap">{step.content}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Pine Script Templates */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Pine Script Templates</h2>
          <div className="space-y-4">
            {[
              {
                title: "RSI Oversold Alert",
                code: `//@version=5
indicator("TradeClaw RSI Alert", overlay=true)
rsiLen = input.int(14, "RSI Length")
rsiOversold = input.int(30, "Oversold Level")
rsi = ta.rsi(close, rsiLen)
alertcondition(ta.crossover(rsi, rsiOversold), title="RSI Oversold Buy")
// Alert Message (paste in TradingView alert):
// {"symbol":"{{ticker}}","exchange":"{{exchange}}","interval":"{{interval}}","action":"buy","close":{{close}},"message":"RSI crossed above oversold"}`,
              },
              {
                title: "EMA Crossover Alert",
                code: `//@version=5
indicator("TradeClaw EMA Cross", overlay=true)
ema9 = ta.ema(close, 9)
ema21 = ta.ema(close, 21)
plot(ema9, color=color.green)
plot(ema21, color=color.red)
alertcondition(ta.crossover(ema9, ema21), title="EMA Bullish Cross")
alertcondition(ta.crossunder(ema9, ema21), title="EMA Bearish Cross")
// Alert Message: {"symbol":"{{ticker}}","action":"buy","close":{{close}},"message":"EMA 9/21 bullish crossover"}`,
              },
              {
                title: "MACD Signal Alert",
                code: `//@version=5
indicator("TradeClaw MACD Alert", overlay=false)
[macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)
plot(macdLine, "MACD", color.blue)
plot(signalLine, "Signal", color.orange)
alertcondition(ta.crossover(macdLine, signalLine), title="MACD Bullish")
alertcondition(ta.crossunder(macdLine, signalLine), title="MACD Bearish")
// Alert Message: {"symbol":"{{ticker}}","action":"buy","close":{{close}},"message":"MACD bullish crossover"}`,
              },
            ].map((tpl, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                  <span className="text-sm font-medium">{tpl.title}</span>
                  <button onClick={() => copyToClipboard(tpl.code, `tpl-${i}`)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
                    {copied[`tpl-${i}`] ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied[`tpl-${i}`] ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="px-4 py-4 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre">{tpl.code}</pre>
              </div>
            ))}
          </div>
        </section>

        {/* Star CTA */}
        <section className="text-center bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-2">Open Source &amp; Free Forever</h2>
          <p className="text-zinc-400 text-sm mb-6">TradeClaw is MIT-licensed. Self-host it, fork it, build on it.</p>
          <a href="https://github.com/naimkatiman/tradeclaw" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#FF6A00] hover:bg-[#e05e00] text-white font-medium px-6 py-3 rounded-xl transition-colors">
            <ExternalLink className="w-4 h-4" />
            Star on GitHub
          </a>
        </section>

      </div>
    </main>
  );
}
