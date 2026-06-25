'use client';

import { useEffect, useMemo, useState, type DragEvent as ReactDragEvent } from 'react';
import { GitBranch, Plus, Sparkles, Trash2 } from 'lucide-react';
import { PageNavBar } from '../../components/PageNavBar';
import { ThemeToggle } from '../components/theme-toggle';
import { calculateAllIndicators } from '../lib/ta-engine';
import type { OHLCV } from '../lib/ohlcv';
import {
  describeRuleTree,
  evaluateRuleTree,
  type ComparisonOperator,
  type IndicatorSnapshot,
  type RuleConditionNode,
  type RuleGroupNode,
  type RuleMetric,
  type RuleNode,
} from '../../lib/strategy-rules';

type TreeKey = 'entry' | 'exit';
type DragBlockKind = 'condition' | 'group';
type DragPayload = { kind: DragBlockKind };

type PreviewRow = {
  candle: OHLCV;
  snapshot: IndicatorSnapshot;
  entryResult: ReturnType<typeof evaluateRuleTree>;
  exitResult: ReturnType<typeof evaluateRuleTree>;
};

const DRAG_MIME = 'application/x-tradeclaw-rule-block';
const PREVIEW_LIMIT = 6;
const SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD'];
const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'];

const METRICS: Array<{ value: RuleMetric; label: string }> = [
  { value: 'RSI', label: 'RSI' },
  { value: 'MACD', label: 'MACD' },
  { value: 'EMA_SPREAD', label: 'EMA spread' },
  { value: 'BOLLINGER_POSITION', label: 'Bollinger position' },
  { value: 'STOCHASTIC', label: 'Stochastic' },
  { value: 'PRICE_CHANGE', label: 'Price change' },
];

const OPERATORS: ComparisonOperator[] = ['>', '>=', '<', '<=', '=', '!='];

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

function condition(metric: RuleMetric = 'RSI', operator: ComparisonOperator = '<', value = 30): RuleConditionNode {
  return { id: uid(), type: 'condition', metric, operator, value };
}

function group(operator: 'AND' | 'OR' = 'AND', children: RuleNode[] = [condition()]): RuleGroupNode {
  return { id: uid(), type: 'group', operator, children };
}

function defaultEntryTree(): RuleGroupNode {
  return group('AND', [
    condition('RSI', '<', 30),
    group('OR', [condition('MACD', '>', 0), condition('EMA_SPREAD', '>', 0.15)]),
  ]);
}

function defaultExitTree(): RuleGroupNode {
  return group('OR', [
    condition('RSI', '>', 68),
    condition('PRICE_CHANGE', '<', -1),
    group('AND', [condition('STOCHASTIC', '>', 80), condition('BOLLINGER_POSITION', '>', 0.85)]),
  ]);
}

function cloneNode(node: RuleNode): RuleNode {
  return node.type === 'condition'
    ? { ...node }
    : { ...node, children: node.children.map((child) => cloneNode(child)) };
}

function updateNode(node: RuleNode, id: string, updater: (current: RuleNode) => RuleNode): RuleNode {
  if (node.id === id) return updater(node);
  if (node.type === 'group') {
    return { ...node, children: node.children.map((child) => updateNode(child, id, updater)) };
  }
  return node;
}

function addChild(node: RuleNode, groupId: string, child: RuleNode): RuleNode {
  if (node.id === groupId && node.type === 'group') {
    return { ...node, children: [...node.children, child] };
  }
  if (node.type === 'group') {
    return { ...node, children: node.children.map((existing) => addChild(existing, groupId, child)) };
  }
  return node;
}

function removeChild(node: RuleNode, targetId: string): RuleNode {
  if (node.type === 'group') {
    return {
      ...node,
      children: node.children
        .filter((child) => child.id !== targetId)
        .map((child) => removeChild(child, targetId)),
    };
  }
  return node;
}

function formatMetric(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return 'n/a';
  const fixed = value.toFixed(digits);
  return fixed.replace(/\.00$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function formatSignedPercent(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  const rounded = formatMetric(value, 2);
  return `${value > 0 ? '+' : ''}${rounded}%`;
}

function createTreeNode(kind: DragBlockKind): RuleNode {
  return kind === 'condition' ? condition() : group('AND', [condition()]);
}

function setDragPayload(event: ReactDragEvent<HTMLElement>, kind: DragBlockKind) {
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind } satisfies DragPayload));
}

function readDragPayload(event: ReactDragEvent<HTMLElement>): DragPayload | null {
  const raw = event.dataTransfer.getData(DRAG_MIME);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DragPayload>;
    return parsed.kind === 'condition' || parsed.kind === 'group' ? { kind: parsed.kind } : null;
  } catch {
    return null;
  }
}

function snapshotFromIndicators(indicators: ReturnType<typeof calculateAllIndicators>, index: number): IndicatorSnapshot {
  const close = indicators.closes[index] ?? NaN;
  const previousClose = indicators.closes[index - 1] ?? close;
  const ema20 = indicators.ema.ema20[index];
  const ema50 = indicators.ema.ema50[index];
  const upper = indicators.bollinger.upper[index];
  const lower = indicators.bollinger.lower[index];
  const rsi = indicators.rsi.values[index];
  const macd = indicators.macd.macdLine[index];
  const stochastic = indicators.stochastic.k[index];

  return {
    rsi: Number.isFinite(rsi) ? rsi : NaN,
    macd: Number.isFinite(macd) ? macd : NaN,
    emaSpread:
      Number.isFinite(ema20) && Number.isFinite(ema50) && Number.isFinite(close) && close !== 0
        ? ((ema20 - ema50) / close) * 100
        : NaN,
    bollingerPosition:
      Number.isFinite(upper) && Number.isFinite(lower) && Number.isFinite(close) && upper !== lower
        ? (close - lower) / (upper - lower)
        : NaN,
    stochastic: Number.isFinite(stochastic) ? stochastic : NaN,
    priceChange:
      Number.isFinite(previousClose) && Number.isFinite(close) && previousClose !== 0
        ? ((close - previousClose) / previousClose) * 100
        : NaN,
  };
}

function isFiniteSnapshot(snapshot: IndicatorSnapshot): boolean {
  return Object.values(snapshot).every((value) => Number.isFinite(value));
}

function toTreeMetrics(tree: RuleGroupNode) {
  return {
    summary: describeRuleTree(tree),
    children: tree.children.length,
  };
}

function MetricPill({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'bad' }) {
  const toneClasses =
    tone === 'good'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      : tone === 'bad'
        ? 'border-red-500/20 bg-red-500/10 text-red-300'
        : 'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]';

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClasses}`}>
      <div className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 font-mono text-xs tabular-nums">{value}</div>
    </div>
  );
}

function RuleConditionEditor({
  node,
  onChange,
  onDelete,
  canDelete = true,
}: {
  node: RuleConditionNode;
  onChange: (id: string, updater: (current: RuleNode) => RuleNode) => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-blue-400">Condition</span>
          <span>Rules can be dragged from the palette into any group</span>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-300 transition-colors hover:bg-red-500/15"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.15fr_0.85fr_0.55fr]">
        <select
          value={node.metric}
          onChange={(event) => onChange(node.id, (current) => current.type === 'condition' ? { ...current, metric: event.target.value as RuleMetric } : current)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs outline-none focus:border-emerald-500/40"
        >
          {METRICS.map((metric) => (
            <option key={metric.value} value={metric.value}>
              {metric.label}
            </option>
          ))}
        </select>

        <select
          value={node.operator}
          onChange={(event) => onChange(node.id, (current) => current.type === 'condition' ? { ...current, operator: event.target.value as ComparisonOperator } : current)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs outline-none focus:border-emerald-500/40"
        >
          {OPERATORS.map((operator) => (
            <option key={operator} value={operator}>
              {operator}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={Number.isFinite(node.value) ? node.value : ''}
          onChange={(event) => onChange(node.id, (current) => current.type === 'condition' ? { ...current, value: Number(event.target.value) } : current)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500/40"
        />
      </div>
    </div>
  );
}

function RuleGroupEditor({
  node,
  treeKey,
  onChange,
  onAddBlock,
  onDelete,
  hoveredTarget,
  setHoveredTarget,
  isRoot = false,
}: {
  node: RuleGroupNode;
  treeKey: TreeKey;
  onChange: (id: string, updater: (current: RuleNode) => RuleNode) => void;
  onAddBlock: (groupId: string, kind: DragBlockKind) => void;
  onDelete: (id: string) => void;
  hoveredTarget: string | null;
  setHoveredTarget: (target: string | null) => void;
  isRoot?: boolean;
}) {
  const dropId = `${treeKey}:${node.id}`;
  const isHovered = hoveredTarget === dropId;

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${isRoot ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--border)] bg-[var(--glass-bg)]'} ${isHovered ? 'ring-1 ring-emerald-500/30 border-emerald-400/40 bg-emerald-500/10' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setHoveredTarget(dropId);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const payload = readDragPayload(event);
        if (payload) onAddBlock(node.id, payload.kind);
        setHoveredTarget(null);
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            Group
          </span>
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--background)] p-1">
            {(['AND', 'OR'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => onChange(node.id, (current) => current.type === 'group' ? { ...current, operator: op } : current)}
                className={`rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${node.operator === op ? 'bg-emerald-500/15 text-emerald-300' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}
              >
                {op}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">Drop a block here to grow this branch</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddBlock(node.id, 'condition')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-emerald-500/30 hover:text-emerald-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Condition
          </button>
          <button
            type="button"
            onClick={() => onAddBlock(node.id, 'group')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-emerald-500/30 hover:text-emerald-300"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Group
          </button>
          {!isRoot && (
            <button
              type="button"
              onClick={() => onDelete(node.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/15"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 border-l border-dashed border-[var(--border)] pl-0 md:pl-4">
        {node.children.map((child) =>
          child.type === 'condition' ? (
            <RuleConditionEditor key={child.id} node={child} onChange={onChange} onDelete={onDelete} />
          ) : (
            <RuleGroupEditor
              key={child.id}
              node={child}
              treeKey={treeKey}
              onChange={onChange}
              onAddBlock={onAddBlock}
              onDelete={onDelete}
              hoveredTarget={hoveredTarget}
              setHoveredTarget={setHoveredTarget}
            />
          )
        )}

        {node.children.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-xs text-[var(--text-secondary)]">
            Drop a condition or group here, or use the buttons above.
          </div>
        )}
      </div>
    </div>
  );
}

function RuleTreePanel({
  title,
  subtitle,
  tree,
  treeKey,
  onChange,
  onAddBlock,
  onDelete,
  hoveredTarget,
  setHoveredTarget,
}: {
  title: string;
  subtitle: string;
  tree: RuleGroupNode;
  treeKey: TreeKey;
  onChange: (id: string, updater: (current: RuleNode) => RuleNode) => void;
  onAddBlock: (groupId: string, kind: DragBlockKind) => void;
  onDelete: (id: string) => void;
  hoveredTarget: string | null;
  setHoveredTarget: (target: string | null) => void;
}) {
  const { summary, children } = toTreeMetrics(tree);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">{title}</div>
          <div className="mt-1 text-sm font-semibold">{subtitle}</div>
          <p className="mt-1 max-w-xl text-[11px] text-[var(--text-secondary)]">
            Build nested AND / OR logic. Drag blocks from the palette into this panel or any nested group.
          </p>
        </div>
        <div className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[10px] text-[var(--text-secondary)]">
          {children} child node{children === 1 ? '' : 's'}
        </div>
      </div>

      <div className="mb-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Current logic</div>
        <div className="mt-1 break-words font-mono text-[11px] leading-relaxed text-[var(--foreground)]">{summary}</div>
      </div>

      <RuleGroupEditor
        node={tree}
        treeKey={treeKey}
        onChange={onChange}
        onAddBlock={onAddBlock}
        onDelete={onDelete}
        hoveredTarget={hoveredTarget}
        setHoveredTarget={setHoveredTarget}
        isRoot
      />
    </section>
  );
}

function PaletteBlock({
  kind,
  title,
  description,
  onDragStart,
}: {
  kind: DragBlockKind;
  title: string;
  description: string;
  onDragStart: (event: ReactDragEvent<HTMLElement>, kind: DragBlockKind) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => onDragStart(event, kind)}
      className="w-full cursor-grab rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-left transition-colors active:cursor-grabbing hover:border-emerald-500/30 hover:bg-emerald-500/5"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-[var(--foreground)]">{title}</div>
          <div className="mt-1 text-[11px] text-[var(--text-secondary)]">{description}</div>
        </div>
        <div className="rounded-full border border-[var(--border)] bg-[var(--glass-bg)] px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
          Drag
        </div>
      </div>
    </button>
  );
}

function PreviewSnapshotCard({ row }: { row: PreviewRow }) {
  const timestamp = new Date(row.candle.timestamp);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{timestamp.toLocaleString()}</div>
          <div className="mt-1 font-mono text-[11px] text-[var(--text-secondary)]">Close {formatMetric(row.candle.close, 2)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${row.entryResult.matches ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
            Entry {row.entryResult.matches ? 'match' : 'no match'}
          </span>
          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${row.exitResult.matches ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
            Exit {row.exitResult.matches ? 'match' : 'no match'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <MetricPill label="RSI" value={formatMetric(row.snapshot.rsi)} tone={row.snapshot.rsi <= 30 ? 'good' : row.snapshot.rsi >= 70 ? 'bad' : 'neutral'} />
        <MetricPill label="MACD" value={formatMetric(row.snapshot.macd)} />
        <MetricPill label="EMA spread" value={formatSignedPercent(row.snapshot.emaSpread)} />
        <MetricPill label="Bollinger" value={formatMetric(row.snapshot.bollingerPosition, 2)} />
        <MetricPill label="Stochastic" value={formatMetric(row.snapshot.stochastic)} />
        <MetricPill label="Price change" value={formatSignedPercent(row.snapshot.priceChange)} />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-3">
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Entry evaluation</div>
          <div className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">{row.entryResult.explanation}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-3">
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Exit evaluation</div>
          <div className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">{row.exitResult.explanation}</div>
        </div>
      </div>
    </div>
  );
}

export default function StrategyRulesPage() {
  const [trees, setTrees] = useState<{ entry: RuleGroupNode; exit: RuleGroupNode }>(() => ({
    entry: defaultEntryTree(),
    exit: defaultExitTree(),
  }));
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('H1');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [previewState, setPreviewState] = useState<{
    candles: OHLCV[];
    source: string;
    loading: boolean;
    error: string | null;
  }>({
    candles: [],
    source: '',
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    setPreviewState((current) => ({ ...current, loading: true, error: null }));

    (async () => {
      try {
        const res = await fetch(`/api/backtest?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Failed to fetch historical candles' }));
          throw new Error(body.error || `Failed to fetch historical candles (${res.status})`);
        }

        const data = await res.json() as { candles: OHLCV[]; source: string };
        if (!mounted) return;

        setPreviewState({
          candles: Array.isArray(data.candles) ? data.candles : [],
          source: data.source ?? 'unknown',
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!mounted || controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Failed to load preview data';
        setPreviewState({ candles: [], source: '', loading: false, error: message });
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [symbol, timeframe, previewNonce]);

  const previewRows = useMemo(() => {
    if (previewState.candles.length === 0) return [];

    const indicators = calculateAllIndicators(previewState.candles);
    return previewState.candles
      .map((candle, index) => {
        const snapshot = snapshotFromIndicators(indicators, index);
        if (!isFiniteSnapshot(snapshot)) return null;

        return {
          candle,
          snapshot,
          entryResult: evaluateRuleTree(trees.entry, snapshot),
          exitResult: evaluateRuleTree(trees.exit, snapshot),
        } satisfies PreviewRow;
      })
      .filter((row): row is PreviewRow => row !== null)
      .slice(-PREVIEW_LIMIT);
  }, [previewState.candles, trees.entry, trees.exit]);

  const addBlockToTree = (treeKey: TreeKey, groupId: string, kind: DragBlockKind) => {
    const nextBlock = createTreeNode(kind);
    setTrees((current) => ({
      ...current,
      [treeKey]: cloneNode(addChild(current[treeKey], groupId, nextBlock)) as RuleGroupNode,
    }));
  };

  const changeNodeInTree = (treeKey: TreeKey, id: string, updater: (current: RuleNode) => RuleNode) => {
    setTrees((current) => ({
      ...current,
      [treeKey]: cloneNode(updateNode(current[treeKey], id, updater)) as RuleGroupNode,
    }));
  };

  const deleteNodeFromTree = (treeKey: TreeKey, id: string) => {
    setTrees((current) => {
      if (current[treeKey].id === id) return current;
      return {
        ...current,
        [treeKey]: cloneNode(removeChild(current[treeKey], id)) as RuleGroupNode,
      };
    });
  };

  const resetExample = () => {
    setTrees({ entry: defaultEntryTree(), exit: defaultExitTree() });
  };

  const entryMatches = previewRows.filter((row) => row.entryResult.matches).length;
  const exitMatches = previewRows.filter((row) => row.exitResult.matches).length;
  const latestRow = previewRows[previewRows.length - 1];

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <PageNavBar />
      <div className="mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Strategy rules
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Entry / exit rule builder with live historical preview</h1>
            <p className="mt-1 max-w-2xl text-[11px] text-[var(--text-secondary)]">
              Define separate entry and exit trees, drag blocks into each branch, and test the rules against real candles from the backtest data API.
            </p>
          </div>
          <ThemeToggle className="text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Drag palette</div>
                  <div className="text-sm font-semibold">Rule blocks</div>
                </div>
                <div className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[10px] text-[var(--text-secondary)]">
                  Native DnD
                </div>
              </div>
              <p className="mb-4 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                Drag a block into the entry or exit tree, or drop it into a nested group to extend that branch.
              </p>
              <div className="space-y-3">
                <PaletteBlock
                  kind="condition"
                  title="Condition"
                  description="Add a metric comparison like RSI &lt; 30 or MACD &gt; 0."
                  onDragStart={setDragPayload}
                />
                <PaletteBlock
                  kind="group"
                  title="Group"
                  description="Add a nested AND/OR group as a new branch."
                  onDragStart={setDragPayload}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Quick actions</div>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={resetExample}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] transition-colors hover:border-emerald-500/30 hover:text-emerald-300"
                >
                  Reset the example trees
                </button>
                <a
                  href={`/backtest?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] transition-colors hover:border-emerald-500/30 hover:text-emerald-300"
                >
                  Open the full backtest page
                </a>
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <RuleTreePanel
                title="Entry rules"
                subtitle="Define when the strategy is allowed to enter"
                tree={trees.entry}
                treeKey="entry"
                onChange={(id, updater) => changeNodeInTree('entry', id, updater)}
                onAddBlock={(groupId, kind) => addBlockToTree('entry', groupId, kind)}
                onDelete={(id) => deleteNodeFromTree('entry', id)}
                hoveredTarget={hoveredTarget}
                setHoveredTarget={setHoveredTarget}
              />

              <RuleTreePanel
                title="Exit rules"
                subtitle="Define when the strategy should close a position"
                tree={trees.exit}
                treeKey="exit"
                onChange={(id, updater) => changeNodeInTree('exit', id, updater)}
                onAddBlock={(groupId, kind) => addBlockToTree('exit', groupId, kind)}
                onDelete={(id) => deleteNodeFromTree('exit', id)}
                hoveredTarget={hoveredTarget}
                setHoveredTarget={setHoveredTarget}
              />
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Backtest preview</div>
                  <div className="mt-1 text-sm font-semibold">Real historical candles, evaluated with calculateAllIndicators(...)</div>
                  <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    This preview fetches actual candles from <code className="font-mono">/api/backtest</code> and runs the current entry/exit trees over the latest valid bars.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={symbol}
                    onChange={(event) => setSymbol(event.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs outline-none focus:border-emerald-500/40"
                  >
                    {SYMBOLS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={timeframe}
                    onChange={(event) => setTimeframe(event.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs outline-none focus:border-emerald-500/40"
                  >
                    {TIMEFRAMES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setPreviewNonce((value) => value + 1)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-emerald-500/30 hover:text-emerald-300"
                  >
                    Refresh preview
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <MetricPill label="Data source" value={previewState.loading ? 'Loading…' : previewState.source || 'Unavailable'} />
                <MetricPill label="Bars analyzed" value={String(previewRows.length)} />
                <MetricPill label="Entry matches" value={`${entryMatches}/${previewRows.length || 0}`} tone={entryMatches > 0 ? 'good' : 'neutral'} />
                <MetricPill label="Exit matches" value={`${exitMatches}/${previewRows.length || 0}`} tone={exitMatches > 0 ? 'bad' : 'neutral'} />
              </div>

              {previewState.error && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {previewState.error}
                </div>
              )}

              {!previewState.error && previewState.loading && (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                  Loading historical candles…
                </div>
              )}

              {!previewState.error && !previewState.loading && previewRows.length === 0 && (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                  No valid preview bars yet. The selected dataset may not have enough history for every indicator.
                </div>
              )}

              {previewState.source && latestRow && (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[11px] text-[var(--text-secondary)]">
                  Latest valid bar: <span className="font-mono text-[var(--foreground)]">{new Date(latestRow.candle.timestamp).toLocaleString()}</span> ·{' '}
                  Close <span className="font-mono text-[var(--foreground)]">{formatMetric(latestRow.candle.close, 2)}</span> · Source{' '}
                  <span className="font-mono text-[var(--foreground)]">{previewState.source}</span>
                </div>
              )}

              <div className="mt-4 space-y-3">
                {previewRows.map((row) => (
                  <PreviewSnapshotCard
                    key={`${row.candle.timestamp}-${row.candle.close}`}
                    row={row}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-2">How it works</div>
              <ul className="space-y-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                <li>• Entry and exit trees are separate, so you can model both halves of the trade lifecycle.</li>
                <li>• Drag blocks from the palette into a tree or nested group for quick composition.</li>
                <li>• Preview bars come from actual backtest candles and are evaluated with the same TA engine used elsewhere.</li>
                <li>• The builder stays lightweight: native browser drag-and-drop, no extra dependencies.</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
