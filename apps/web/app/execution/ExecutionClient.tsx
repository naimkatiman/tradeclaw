'use client';

import { useState, useEffect, useCallback } from 'react';
import { ListOrdered, CheckCircle, XCircle, Clock, Minus, Wifi, WifiOff, ArrowRight, BarChart3 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type OrderStatus = 'filled' | 'rejected' | 'pending' | 'cancelled';

interface Order {
  id: string;
  time: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  entryPrice: number;
  fillPrice: number | null;
  status: OrderStatus;
  broker: string;
}

interface PipelineStage {
  name: string;
  status: 'pass' | 'fail' | 'pending' | 'skip';
  detail?: string;
}

interface BrokerStatus {
  name: string;
  connected: boolean;
  mode: 'paper' | 'live';
  accountEquity: number;
  lastPing: string;
}

interface ExecutionStats {
  totalOrders: number;
  fillRate: number;
  avgSlippage: number;
  todayOrders: number;
  todayFills: number;
}

// ─── Mock Data ───────────────────────────────────────────────
// TODO: replace with real API calls

function getMockOrders(): Order[] {
  return [
    { id: '1', time: '2026-04-11T09:15:00Z', symbol: 'BTCUSD', direction: 'BUY', type: 'MARKET', quantity: 0.05, entryPrice: 68420.50, fillPrice: 68425.30, status: 'filled', broker: 'alpaca' },
    { id: '2', time: '2026-04-11T08:45:00Z', symbol: 'EURUSD', direction: 'SELL', type: 'LIMIT', quantity: 10000, entryPrice: 1.0852, fillPrice: null, status: 'rejected', broker: 'alpaca' },
    { id: '3', time: '2026-04-11T08:30:00Z', symbol: 'XAUUSD', direction: 'BUY', type: 'MARKET', quantity: 1, entryPrice: 2345.60, fillPrice: 2346.10, status: 'filled', broker: 'alpaca' },
    { id: '4', time: '2026-04-11T07:15:00Z', symbol: 'GBPUSD', direction: 'SELL', type: 'STOP', quantity: 5000, entryPrice: 1.2648, fillPrice: null, status: 'pending', broker: 'alpaca' },
    { id: '5', time: '2026-04-11T06:00:00Z', symbol: 'ETHUSD', direction: 'BUY', type: 'LIMIT', quantity: 0.5, entryPrice: 3280.00, fillPrice: null, status: 'cancelled', broker: 'alpaca' },
    { id: '6', time: '2026-04-10T22:30:00Z', symbol: 'USDJPY', direction: 'BUY', type: 'MARKET', quantity: 10000, entryPrice: 153.42, fillPrice: 153.45, status: 'filled', broker: 'alpaca' },
    { id: '7', time: '2026-04-10T20:15:00Z', symbol: 'XAGUSD', direction: 'SELL', type: 'MARKET', quantity: 50, entryPrice: 27.85, fillPrice: 27.82, status: 'filled', broker: 'alpaca' },
    { id: '8', time: '2026-04-10T18:00:00Z', symbol: 'BTCUSD', direction: 'SELL', type: 'LIMIT', quantity: 0.02, entryPrice: 69000.00, fillPrice: 69000.00, status: 'filled', broker: 'alpaca' },
  ];
}

function getMockPipeline(): PipelineStage[] {
  return [
    { name: 'Signal', status: 'pass', detail: 'BTCUSD BUY 72% confidence' },
    { name: 'Risk Veto', status: 'pass', detail: 'No breakers active' },
    { name: 'Allocation', status: 'pass', detail: 'Within exposure limit' },
    { name: 'Order', status: 'pass', detail: 'MARKET order submitted' },
    { name: 'Fill', status: 'pass', detail: 'Filled at $68,425.30' },
  ];
}

function getMockBrokerStatus(): BrokerStatus {
  return {
    name: 'Alpaca',
    connected: true,
    mode: 'paper',
    accountEquity: 100684.52,
    lastPing: '2026-04-11T09:15:30Z',
  };
}

function getMockStats(): ExecutionStats {
  return {
    totalOrders: 247,
    fillRate: 89.5,
    avgSlippage: 0.03,
    todayOrders: 8,
    todayFills: 5,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function getStatusStyle(status: OrderStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case 'filled': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'rejected': return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
    case 'pending': return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    case 'cancelled': return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' };
  }
}

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case 'filled': return <CheckCircle className="w-3.5 h-3.5" />;
    case 'rejected': return <XCircle className="w-3.5 h-3.5" />;
    case 'pending': return <Clock className="w-3.5 h-3.5" />;
    case 'cancelled': return <Minus className="w-3.5 h-3.5" />;
  }
}

function formatOrderPrice(symbol: string, price: number | null): string {
  if (price === null) return '—';
  if (symbol === 'BTCUSD' || symbol === 'ETHUSD') return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (symbol === 'XAUUSD') return `$${price.toFixed(2)}`;
  if (symbol === 'XAGUSD') return `$${price.toFixed(2)}`;
  if (symbol === 'USDJPY' || symbol === 'GBPJPY') return price.toFixed(2);
  return price.toFixed(4);
}

// ─── Sub-components ──────────────────────────────────────────

function PipelineVisualization({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
      {stages.map((stage, i) => {
        const isPass = stage.status === 'pass';
        const isFail = stage.status === 'fail';
        return (
          <div key={stage.name} className="flex items-center gap-1 sm:gap-2">
            <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border ${
              isPass ? 'bg-emerald-500/10 border-emerald-500/20' :
              isFail ? 'bg-rose-500/10 border-rose-500/20' :
              'bg-zinc-500/10 border-zinc-500/20'
            }`}>
              <span className={`text-xs font-semibold ${
                isPass ? 'text-emerald-400' : isFail ? 'text-rose-400' : 'text-zinc-400'
              }`}>
                {stage.name}
              </span>
              <span className={`w-2 h-2 rounded-full ${
                isPass ? 'bg-emerald-500' : isFail ? 'bg-rose-500' : stage.status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-500'
              }`} />
              {stage.detail && (
                <span className="text-[9px] text-[var(--text-secondary)] text-center max-w-[80px] truncate">
                  {stage.detail}
                </span>
              )}
            </div>
            {i < stages.length - 1 && (
              <ArrowRight className={`w-4 h-4 flex-shrink-0 ${isPass ? 'text-emerald-500/50' : 'text-zinc-600'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function ExecutionClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [broker, setBroker] = useState<BrokerStatus | null>(null);
  const [stats, setStats] = useState<ExecutionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    // TODO: replace with real API calls to /api/v1/execution, /api/v1/broker, etc.
    await new Promise((resolve) => setTimeout(resolve, 300));
    setOrders(getMockOrders());
    setPipeline(getMockPipeline());
    setBroker(getMockBrokerStatus());
    setStats(getMockStats());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
              <ListOrdered className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Execution <span className="text-amber-400">Log</span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Order history, pipeline status, and broker connection
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 animate-pulse h-32" />
            ))}
          </div>
        ) : (
          <>
            {/* Top row: Broker + Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {/* Broker Connection Status */}
              {broker && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">Broker Connection</h2>
                    <div className="flex items-center gap-1.5">
                      {broker.connected ? (
                        <>
                          <Wifi className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-400">Connected</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-4 h-4 text-rose-400" />
                          <span className="text-xs font-bold text-rose-400">Disconnected</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Broker</span>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{broker.name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Mode</span>
                      <p className="text-sm font-semibold">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                          broker.mode === 'paper'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {broker.mode.toUpperCase()}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Account Equity</span>
                      <p className="text-sm font-bold font-mono text-[var(--foreground)]">
                        ${broker.accountEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Last Ping</span>
                      <p className="text-xs font-mono text-[var(--text-secondary)]">
                        {new Date(broker.lastPing).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Execution Stats */}
              {stats && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-[var(--text-secondary)]" />
                    <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">Execution Stats</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Total Orders</span>
                      <p className="text-2xl font-bold font-mono text-[var(--foreground)]">{stats.totalOrders}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Fill Rate</span>
                      <p className="text-2xl font-bold font-mono text-emerald-400">{stats.fillRate}%</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Avg Slippage</span>
                      <p className="text-lg font-bold font-mono text-[var(--foreground)]">{stats.avgSlippage}%</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Today</span>
                      <p className="text-lg font-bold font-mono text-[var(--foreground)]">
                        {stats.todayFills}/{stats.todayOrders}
                        <span className="text-xs text-[var(--text-secondary)] ml-1">fills</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pipeline Visualization */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 mb-8">
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4 uppercase tracking-wider">Last Signal Pipeline</h2>
              <PipelineVisualization stages={pipeline} />
            </div>

            {/* Order History Table */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">Order History</h2>
                <span className="text-xs text-[var(--text-secondary)]">{orders.length} orders</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left px-4 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Time</th>
                      <th className="text-left px-4 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Symbol</th>
                      <th className="text-left px-4 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Dir</th>
                      <th className="text-left px-4 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Type</th>
                      <th className="text-right px-4 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Qty</th>
                      <th className="text-right px-4 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Entry</th>
                      <th className="text-right px-4 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Fill</th>
                      <th className="text-left px-4 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Status</th>
                      <th className="text-left px-4 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Broker</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const statusStyle = getStatusStyle(order.status);
                      return (
                        <tr key={order.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--glass-bg)] transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)] whitespace-nowrap">
                            {new Date(order.time).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-[var(--foreground)]">{order.symbol}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                              order.direction === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}>
                              {order.direction}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)] font-mono">{order.type}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-[var(--foreground)]">{order.quantity}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-[var(--foreground)]">
                            {formatOrderPrice(order.symbol, order.entryPrice)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-[var(--foreground)]">
                            {formatOrderPrice(order.symbol, order.fillPrice)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                              {getStatusIcon(order.status)}
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)]">{order.broker}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
