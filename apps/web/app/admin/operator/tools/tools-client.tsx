'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Activity, Cpu, Plug, Settings, X, Save } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  category: string;
  description: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
  updatedAt: string;
}

const CATEGORY_META: Record<string, { label: string; icon: typeof Activity }> = {
  indicator: { label: 'Indicators', icon: Activity },
  signal_engine: { label: 'Signal Engines', icon: Cpu },
  connector: { label: 'Connectors', icon: Plug },
};

function formatConfig(config: Record<string, unknown>): string {
  try {
    return JSON.stringify(config ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

export function ToolsClient() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingError, setEditingError] = useState<string | null>(null);
  const [editingSaving, setEditingSaving] = useState(false);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/operator/tools');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTools(data.tools ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(id: string, enabled: boolean) {
    setToggling(id);
    setError(null);
    try {
      const res = await fetch('/api/operator/tools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTools((prev) => prev.map((t) => (t.id === id ? data.tool : t)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle');
    } finally {
      setToggling(null);
    }
  }

  function openEditor(tool: Tool) {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setEditingTool(tool);
    setEditingText(formatConfig(tool.config));
    setEditingError(null);
  }

  function closeEditor(restoreFocus = true, force = false) {
    if (editingSaving && !force) return;
    setEditingTool(null);
    setEditingText('');
    setEditingError(null);
    setEditingSaving(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => lastFocusedRef.current?.focus());
    }
  }

  useEffect(() => {
    if (!editingTool) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableSelector =
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusFirstElement = () => {
      editorTextareaRef.current?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeEditor();
        return;
      }

      if (event.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;
      const focusableElements = Array.from(modal.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      );
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !modal.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (!active || active === last || !modal.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.requestAnimationFrame(focusFirstElement);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingTool]);

  async function handleSaveConfig() {
    if (!editingTool) return;
    setEditingError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(editingText);
    } catch (err: unknown) {
      setEditingError(err instanceof Error ? err.message : 'Invalid JSON');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setEditingError('Config must be a JSON object');
      return;
    }

    setEditingSaving(true);
    try {
      const res = await fetch('/api/operator/tools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTool.id, config: parsed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const updatedTool = (data as { tool?: Tool }).tool;
      if (!updatedTool) {
        throw new Error('Invalid tool response');
      }
      setTools((prev) => prev.map((t) => (t.id === editingTool.id ? updatedTool : t)));
      closeEditor(true, true);
    } catch (err: unknown) {
      setEditingError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setEditingSaving(false);
    }
  }

  const grouped = tools.reduce<Record<string, Tool[]>>((acc, tool) => {
    const cat = tool.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {});

  const categories = Object.keys(CATEGORY_META).filter((k) => grouped[k]?.length);

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {tools.length} tools registered
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && tools.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-500">Loading...</div>
      ) : (
        categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          return (
            <div key={cat}>
              <div className="mb-2 flex items-center gap-2">
                <Icon size={14} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">{meta.label}</h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                {grouped[cat].map((tool, i) => (
                  <div
                    key={tool.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${
                      i > 0 ? 'border-t border-white/[0.04]' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{tool.name}</p>
                      {tool.description && (
                        <p className="mt-0.5 text-xs text-zinc-500">{tool.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => openEditor(tool)}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                        title="Edit config"
                      >
                        <Settings size={12} />
                        Config
                      </button>
                      <button
                        onClick={() => handleToggle(tool.id, !tool.enabled)}
                        disabled={toggling === tool.id}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          tool.enabled ? 'bg-emerald-600' : 'bg-zinc-700'
                        } ${toggling === tool.id ? 'opacity-50' : ''}`}
                        aria-label={`${tool.enabled ? 'Disable' : 'Enable'} ${tool.name}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            tool.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {editingTool && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => closeEditor()}
          role="dialog"
          aria-modal="true"
          aria-label={`Edit config for ${editingTool.name}`}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-zinc-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Edit config
                </p>
                <h3 className="mt-0.5 truncate text-base font-semibold text-white">
                  {editingTool.name}
                </h3>
              </div>
              <button
                onClick={() => closeEditor()}
                className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              ref={editorTextareaRef}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void handleSaveConfig();
                }
              }}
              spellCheck={false}
              className="h-72 w-full resize-none rounded-lg border border-white/[0.08] bg-black/40 p-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500/40"
              placeholder='{ "key": "value" }'
            />

            {editingError && (
              <p className="mt-2 text-xs text-red-400">{editingError}</p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => closeEditor()}
                disabled={editingSaving}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={editingSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
              >
                <Save size={12} />
                {editingSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
