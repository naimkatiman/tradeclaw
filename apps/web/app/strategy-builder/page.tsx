'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { ThemeToggle } from '../components/theme-toggle';

type ConditionType = 'RSI' | 'MACD' | 'EMA_CROSS' | 'BB' | 'STOCH' | 'PRICE_ACTION';
type ActionType = 'ENTRY_LONG' | 'ENTRY_SHORT' | 'EXIT' | 'ALERT';
type Operator = '>' | '<' | '>=' | '<=' | 'crosses_above' | 'crosses_below';

interface StrategyBlock {
  id: string;
  type: 'IF' | 'AND' | 'OR' | 'THEN';
  condition?: {
    indicator: ConditionType;
    operator: Operator;
    value: number;
  };
  action?: {
    type: ActionType;
    param?: number;
  };
}

interface Strategy {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  blocks: StrategyBlock[];
}

const CONDITION_LABELS: Record<ConditionType, string> = {
  RSI: 'RSI (14)',
  MACD: 'MACD histogram',
  EMA_CROSS: 'EMA 9 vs EMA 21',
  BB: 'Price vs Bollinger Band',
  STOCH: 'Stochastic %K',
  PRICE_ACTION: 'Price change %',
};

const ACTION_LABELS: Record<ActionType, string> = {
  ENTRY_LONG: 'Enter Long (BUY)',
  ENTRY_SHORT: 'Enter Short (SELL)',
  EXIT: 'Exit position',
  ALERT: 'Send alert',
};

const OPERATOR_LABELS: Record<Operator, string> = {
  '>': 'is above',
  '<': 'is below',
  '>=': 'is above or equal to',
  '<=': 'is below or equal to',
  'crosses_above': 'crosses above',
  'crosses_below': 'crosses below',
};

const EXAMPLE_STRATEGIES: Strategy[] = [
  {
    id: 'rsi-oversold',
    name: 'RSI Oversold Bounce',
    symbol: 'XAUUSD',
    timeframe: 'H1',
    blocks: [
      { id: 'b1', type: 'IF', condition: { indicator: 'RSI', operator: '<', value: 30 } },
      { id: 'b2', type: 'AND', condition: { indicator: 'MACD', operator: '>', value: 0 } },
      { id: 'b3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    id: 'ema-cross',
    name: 'EMA Crossover',
    symbol: 'EURUSD',
    timeframe: 'H4',
    blocks: [
      { id: 'b1', type: 'IF', condition: { indicator: 'EMA_CROSS', operator: 'crosses_above', value: 0 } },
      { id: 'b2', type: 'AND', condition: { indicator: 'RSI', operator: '>', value: 50 } },
      { id: 'b3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
];

function uid() { return Math.random().toString(36).slice(2, 8); }

function validateStrategy(strategy: Strategy): string[] {
  const errors: string[] = [];
  if (!strategy.blocks.some(b => b.type === 'IF')) errors.push('Add at least one IF block');
  if (!strategy.blocks.some(b => b.type === 'THEN')) errors.push('Add at least one THEN block');
  return errors;
}

function BlockCard({
  block,
  index,
  onChange,
  onDelete,
  isFirst,
}: {
  block: StrategyBlock;
  index: number;
  onChange: (id: string, updates: Partial<StrategyBlock>) => void;
  onDelete: (id: string) => void;
  isFirst: boolean;
}) {
  const isAction = block.type === 'THEN';

  return (
    <div className="flex gap-3 items-start">
      {/* Connector line */}
      <div className="flex flex-col items-center pt-3 flex-shrink-0">
        <div className={`w-8 text-center text-[9px] font-bold py-1 rounded border ${
          block.type === 'IF' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
          block.type === 'AND' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
          block.type === 'OR' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
          'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        }`}>
          {block.type}
        </div>
        {!isFirst && index < 10 && (
          <div className="w-px h-3 bg-[var(--border)] mt-1" />
        )}
      </div>

      {/* Block body */}
      <div className="flex-1 bg-[var(--glass-bg)] rounded-xl border border-[var(--border)] p-3 flex items-center gap-2">
        {!isAction && block.condition && (
          <>
            <select
              value={block.condition.indicator}
              onChange={e => onChange(block.id, { condition: { ...block.condition!, indicator: e.target.value as ConditionType } })}
              className="bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[10px] text-[var(--foreground)] outline-none focus:border-emerald-500/30 flex-1"
            >
              {(Object.keys(CONDITION_LABELS) as ConditionType[]).map(k => (
                <option key={k} value={k}>{CONDITION_LABELS[k]}</option>
              ))}
            </select>
            <select
              value={block.condition.operator}
              onChange={e => onChange(block.id, { condition: { ...block.condition!, operator: e.target.value as Operator } })}
              className="bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[10px] text-[var(--foreground)] outline-none focus:border-emerald-500/30 flex-1"
            >
              {(Object.keys(OPERATOR_LABELS) as Operator[]).map(k => (
                <option key={k} value={k}>{OPERATOR_LABELS[k]}</option>
              ))}
            </select>
            {block.condition.operator !== 'crosses_above' && block.condition.operator !== 'crosses_below' && (
              <input
                type="number"
                value={block.condition.value}
                onChange={e => onChange(block.id, { condition: { ...block.condition!, value: Number(e.target.value) } })}
                className="w-16 bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[10px] text-[var(--foreground)] outline-none focus:border-emerald-500/30 font-mono"
              />
            )}
          </>
        )}
        {isAction && block.action && (
          <select
            value={block.action.type}
            onChange={e => onChange(block.id, { action: { ...block.action!, type: e.target.value as ActionType } })}
            className="bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[10px] text-[var(--foreground)] outline-none focus:border-emerald-500/30 flex-1"
          >
            {(Object.keys(ACTION_LABELS) as ActionType[]).map(k => (
              <option key={k} value={k}>{ACTION_LABELS[k]}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => onDelete(block.id)}
          className="text-[var(--text-secondary)] hover:text-red-400 text-sm px-1 transition-colors flex-shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function StrategyPreview({ strategy }: { strategy: Strategy }) {
  if (!strategy.blocks.length) return null;

  const conditions = strategy.blocks.filter(b => b.type !== 'THEN');
  const actions = strategy.blocks.filter(b => b.type === 'THEN');

  const condStr = conditions.map(b => {
    if (!b.condition) return '';
    const op = OPERATOR_LABELS[b.condition.operator];
    const val = b.condition.operator === 'crosses_above' || b.condition.operator === 'crosses_below' ? '' : ` ${b.condition.value}`;
    return `${b.type === 'IF' ? '' : b.type + ' '}${CONDITION_LABELS[b.condition.indicator]} ${op}${val}`;
  }).join(' ');

  const actStr = actions.map(b => b.action ? ACTION_LABELS[b.action.type] : '').join(', ');

  return (
    <div className="bg-[var(--glass-bg)] rounded-xl p-3 border border-[var(--border)] font-mono text-[10px] text-[var(--text-secondary)] leading-relaxed">
      <span className="text-[var(--text-secondary)] font-semibold">Rule: </span>
      {condStr && <span>{condStr} </span>}
      {actStr && <><span className="text-[var(--text-secondary)] font-semibold">→ </span><span className="text-emerald-400">{actStr}</span></>}
    </div>
  );
}

export default function StrategyBuilderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [strategy, setStrategy] = useState<Strategy>({
    id: uid(),
    name: 'My Strategy',
    symbol: 'XAUUSD',
    timeframe: 'H1',
    blocks: [
      { id: uid(), type: 'IF', condition: { indicator: 'RSI', operator: '<', value: 30 } },
      { id: uid(), type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  });
  const [saved, setSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [savedStrategies, setSavedStrategies] = useState<Strategy[]>([]);

  useEffect(() => { loadSavedStrategies(); }, []);

  const loadSavedStrategies = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('tc-strategies') || '[]') as Strategy[];
      setSavedStrategies(stored.slice(0, 20));
    } catch { /* ignore */ }
  };

  const validate = useCallback(() => {
    const errors = validateStrategy(strategy);
    setValidationErrors(errors);
    return errors.length === 0;
  }, [strategy]);

  const addBlock = useCallback((type: StrategyBlock['type']) => {
    const block: StrategyBlock = type === 'THEN'
      ? { id: uid(), type: 'THEN', action: { type: 'ENTRY_LONG' } }
      : { id: uid(), type, condition: { indicator: 'RSI', operator: '<', value: 30 } };
    setStrategy(s => {
      const thenIdx = s.blocks.findIndex(b => b.type === 'THEN');
      const blocks = [...s.blocks];
      if (type === 'THEN' || thenIdx === -1) {
        blocks.push(block);
      } else {
        blocks.splice(thenIdx, 0, block);
      }
      return { ...s, blocks };
    });
  }, []);

  const onChange = useCallback((id: string, updates: Partial<StrategyBlock>) => {
    setStrategy(s => ({ ...s, blocks: s.blocks.map(b => b.id === id ? { ...b, ...updates } : b) }));
  }, []);

  const onDelete = useCallback((id: string) => {
    setStrategy(s => ({ ...s, blocks: s.blocks.filter(b => b.id !== id) }));
  }, []);

  const loadExample = (ex: Strategy) => {
    setStrategy({ ...ex, id: uid(), blocks: ex.blocks.map(b => ({ ...b, id: uid() })) });
    setValidationErrors([]);
  };

  const saveStrategy = () => {
    if (!validate()) return;
    try {
      const stored = JSON.parse(localStorage.getItem('tc-strategies') || '[]') as Strategy[];
      const exists = stored.findIndex(s => s.id === strategy.id);
      if (exists >= 0) stored[exists] = strategy;
      else stored.unshift(strategy);
      const limited = stored.slice(0, 20);
      localStorage.setItem('tc-strategies', JSON.stringify(limited));
      setSaved(true);
      setSavedStrategies(limited);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
  };

  const exportJSON = () => {
    if (!validate()) return;
    const json = JSON.stringify(strategy, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${strategy.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Partial<Strategy>;
        if (!parsed.name || !Array.isArray(parsed.blocks)) {
          setValidationErrors(['Invalid strategy file: missing required fields']);
          return;
        }
        setStrategy({
          name: 'Imported Strategy',
          symbol: 'XAUUSD',
          timeframe: 'H1',
          ...parsed,
          id: uid(),
          blocks: (parsed.blocks || []).map(b => ({ ...b, id: uid() })),
        });
        setValidationErrors([]);
      } catch {
        setValidationErrors(['Failed to parse JSON file']);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runBacktest = () => {
    if (!validate()) return;
    const encoded = btoa(JSON.stringify(strategy));
    router.push(`/backtest?strategy=${encoded}`);
  };

  const deleteSavedStrategy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const stored = JSON.parse(localStorage.getItem('tc-strategies') || '[]') as Strategy[];
      const updated = stored.filter(s => s.id !== id);
      localStorage.setItem('tc-strategies', JSON.stringify(updated));
      setSavedStrategies(updated.slice(0, 20));
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="4" width="5" height="5" rx="1" fill="currentColor" className="text-[var(--border)]" style={{ opacity: 0.6 }}/>
                <rect x="9" y="4" width="5" height="5" rx="1" fill="rgba(16,185,129,0.4)"/>
                <path d="M4.5 6.5H11.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-[var(--border)]"/>
                <rect x="2" y="11" width="5" height="3" rx="1" fill="rgba(16,185,129,0.2)"/>
                <rect x="9" y="11" width="5" height="3" rx="1" fill="currentColor" className="text-[var(--border)]" style={{ opacity: 0.3 }}/>
              </svg>
              <h1 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">Strategy Builder</h1>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Visual IF/THEN rule editor — compose trading logic without code</p>
          </div>
          <ThemeToggle className="text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* Builder canvas */}
          <div className="space-y-4">
            {/* Strategy name + meta */}
            <div className="glass-card rounded-2xl p-5">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="col-span-3 sm:col-span-1">
                  <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Strategy name</label>
                  <input
                    type="text"
                    value={strategy.name}
                    onChange={e => setStrategy(s => ({ ...s, name: e.target.value }))}
                    className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Symbol</label>
                  <select
                    value={strategy.symbol}
                    onChange={e => setStrategy(s => ({ ...s, symbol: e.target.value }))}
                    className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-emerald-500/30"
                  >
                    {['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Timeframe</label>
                  <select
                    value={strategy.timeframe}
                    onChange={e => setStrategy(s => ({ ...s, timeframe: e.target.value }))}
                    className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-emerald-500/30"
                  >
                    {['M15', 'H1', 'H4', 'D1'].map(tf => <option key={tf} value={tf}>{tf}</option>)}
                  </select>
                </div>
              </div>

              {/* Block list */}
              <div className="space-y-2 mb-4">
                {strategy.blocks.map((block, i) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    index={i}
                    onChange={onChange}
                    onDelete={onDelete}
                    isFirst={i === 0}
                  />
                ))}
                {strategy.blocks.length === 0 && (
                  <div className="text-center py-6 text-xs text-[var(--text-secondary)]">Add blocks to build your strategy</div>
                )}
              </div>

              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <div className="mb-4 space-y-1">
                  {validationErrors.map((err, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-red-400">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
                        <circle cx="5" cy="5" r="4.5" stroke="rgba(239,68,68,0.5)"/>
                        <path d="M5 3V5.5M5 7H5.01" stroke="#EF4444" strokeWidth="1" strokeLinecap="round"/>
                      </svg>
                      {err}
                    </div>
                  ))}
                </div>
              )}

              {/* Add block buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(['IF', 'AND', 'OR', 'THEN'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => addBlock(type)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all hover:opacity-90 ${
                      type === 'IF' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      type === 'AND' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      type === 'OR' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    + {type}
                  </button>
                ))}
              </div>

              {/* Rule preview */}
              <StrategyPreview strategy={strategy} />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={saveStrategy}
                className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.99] border ${
                  saved
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                }`}
              >
                {saved ? <><Check className="inline h-3.5 w-3.5 mr-1" />Saved</> : 'Save strategy'}
              </button>

              <button
                onClick={runBacktest}
                className="py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.99] border bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/15 flex items-center justify-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 2L10 6L3 10V2Z" fill="#60A5FA"/>
                </svg>
                Run Backtest
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportJSON}
                className="py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-[0.99] border bg-[var(--glass-bg)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] flex items-center justify-center gap-1.5"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 1v6M3 5l2.5 2.5L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 9h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Export JSON
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-[0.99] border bg-[var(--glass-bg)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] flex items-center justify-center gap-1.5"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 7V1M3 3l2.5-2.5L8 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 9h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Import JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={importJSON}
                className="hidden"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            <div className="glass-card rounded-2xl p-5">
              <div className="text-xs font-semibold text-[var(--foreground)] tracking-tight mb-3">Example strategies</div>
              <div className="space-y-2">
                {EXAMPLE_STRATEGIES.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => loadExample(ex)}
                    className="w-full text-left px-3 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--border)] hover:border-[var(--glass-border-accent)] transition-all group"
                  >
                    <div className="text-xs font-semibold text-[var(--foreground)] transition-colors mb-1">{ex.name}</div>
                    <div className="text-[10px] text-[var(--text-secondary)] font-mono">{ex.symbol} · {ex.timeframe} · {ex.blocks.length} blocks</div>
                  </button>
                ))}
              </div>
            </div>

            {/* My Strategies */}
            {savedStrategies.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <div className="text-xs font-semibold text-[var(--foreground)] tracking-tight mb-3">My Strategies</div>
                <div className="space-y-1.5">
                  {savedStrategies.map(s => (
                    <div key={s.id} className="relative group">
                      <button
                        onClick={() => { setStrategy(s); setValidationErrors([]); }}
                        className="w-full text-left px-3 py-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--border)] hover:border-[var(--glass-border-accent)] transition-all pr-8"
                      >
                        <div className="text-xs font-semibold text-[var(--foreground)] truncate mb-0.5">{s.name}</div>
                        <div className="text-[10px] text-[var(--text-secondary)] font-mono">{s.symbol} · {s.timeframe} · {s.blocks.length} blocks</div>
                      </button>
                      <button
                        onClick={(e) => deleteSavedStrategy(s.id, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-red-400 transition-all text-sm px-1"
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card rounded-2xl p-5">
              <div className="text-xs font-semibold text-[var(--foreground)] tracking-tight mb-2">Block guide</div>
              <div className="space-y-2">
                {[
                  { label: 'IF', color: 'text-blue-400', desc: 'Start condition' },
                  { label: 'AND', color: 'text-purple-400', desc: 'All must be true' },
                  { label: 'OR', color: 'text-yellow-400', desc: 'Any must be true' },
                  { label: 'THEN', color: 'text-emerald-400', desc: 'Action to take' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold w-8 ${item.color}`}>{item.label}</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="text-xs font-semibold text-[var(--foreground)] tracking-tight mb-2">Quick nav</div>
              <div className="space-y-1">
                {[
                  { label: 'Backtesting', href: '/backtest' },
                  { label: 'Paper Trading', href: '/paper-trading' },
                  { label: 'Dashboard', href: '/dashboard' },
                ].map(link => (
                  <a key={link.href} href={link.href} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--glass-bg)] transition-colors group">
                    <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--foreground)] transition-colors">{link.label}</span>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[var(--text-secondary)]"/>
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
