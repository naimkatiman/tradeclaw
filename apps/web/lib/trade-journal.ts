// Trade Journal — localStorage-based trade logging with signal context enrichment

export type TradeDirection = 'BUY' | 'SELL';
export type TradeOutcome = 'WIN' | 'LOSS' | 'OPEN';

export interface SignalContext {
  direction: TradeDirection;
  confidence: number;
  rsi: number;
  macd: number;
  ema20: number;
  ema50: number;
  fetchedAt: string;
}

export interface JournalEntry {
  id: string;
  pair: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number;
  entryTime: string;
  exitTime?: string;
  notes: string;
  tags: string[];
  signalContext?: SignalContext;
  outcome: TradeOutcome;
  pnlPct?: number;
}

export interface WeeklySummary {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  entries: JournalEntry[];
  totalTrades: number;
  wins: number;
  losses: number;
  openTrades: number;
  totalPnlPct: number;
  bestTrade: JournalEntry | null;
  worstTrade: JournalEntry | null;
  winRate: number;
}

const STORAGE_KEY = 'tc-trade-journal';

function loadEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: JournalEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getEntries(): JournalEntry[] {
  return loadEntries();
}

export function addEntry(entry: Omit<JournalEntry, 'id'>): JournalEntry {
  const entries = loadEntries();
  const newEntry: JournalEntry = { ...entry, id: `je-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  saveEntries([newEntry, ...entries]);
  return newEntry;
}

export function updateEntry(id: string, patch: Partial<JournalEntry>): JournalEntry | null {
  const entries = loadEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const updated = { ...entries[idx], ...patch };
  entries[idx] = updated;
  saveEntries(entries);
  return updated;
}

export function deleteEntry(id: string): void {
  const entries = loadEntries().filter(e => e.id !== id);
  saveEntries(entries);
}

function getISOWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatWeekLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${start.getFullYear()}`;
}

export function getWeeklySummary(referenceDate?: Date): WeeklySummary {
  const ref = referenceDate ?? new Date();
  const { start, end } = getISOWeekBounds(ref);
  const all = loadEntries();
  const entries = all.filter(e => {
    const t = new Date(e.entryTime);
    return t >= start && t <= end;
  });

  const closed = entries.filter(e => e.outcome !== 'OPEN' && e.pnlPct !== undefined);
  const wins = closed.filter(e => e.outcome === 'WIN');
  const losses = closed.filter(e => e.outcome === 'LOSS');
  const totalPnlPct = closed.reduce((sum, e) => sum + (e.pnlPct ?? 0), 0);

  let bestTrade: JournalEntry | null = null;
  let worstTrade: JournalEntry | null = null;
  for (const e of closed) {
    if (!bestTrade || (e.pnlPct ?? -Infinity) > (bestTrade.pnlPct ?? -Infinity)) bestTrade = e;
    if (!worstTrade || (e.pnlPct ?? Infinity) < (worstTrade.pnlPct ?? Infinity)) worstTrade = e;
  }

  return {
    weekLabel: formatWeekLabel(start, end),
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    entries,
    totalTrades: entries.length,
    wins: wins.length,
    losses: losses.length,
    openTrades: entries.filter(e => e.outcome === 'OPEN').length,
    totalPnlPct: parseFloat(totalPnlPct.toFixed(2)),
    bestTrade,
    worstTrade,
    winRate: closed.length > 0 ? parseFloat(((wins.length / closed.length) * 100).toFixed(1)) : 0,
  };
}

export function calculatePnl(entry: number, exit: number, direction: TradeDirection): number {
  const raw = direction === 'BUY'
    ? ((exit - entry) / entry) * 100
    : ((entry - exit) / entry) * 100;
  return parseFloat(raw.toFixed(2));
}
