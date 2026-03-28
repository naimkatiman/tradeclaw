'use client';

import { useState, useEffect, useCallback } from 'react';
import { Puzzle, Pause, Play, Pencil, Trash2, BookOpen, AlertTriangle } from 'lucide-react';

/* ── Types ── */
interface PluginParam {
  name: string;
  type: 'number' | 'string' | 'boolean';
  default: number | string | boolean;
  min?: number;
  max?: number;
  description: string;
}

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  code: string;
  params: PluginParam[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

interface TestResult {
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  label: string;
  details?: Record<string, number | string>;
}

const CATEGORIES = ['trend', 'momentum', 'volatility', 'volume', 'custom'] as const;

const TEMPLATE_CODE = `// Your indicator function receives:
// - candles: Array of { open, high, low, close, volume, timestamp }
// - params: Your configured parameters
// - Math: Standard Math object
//
// Must return: { value, signal, strength, label, details? }

const closes = candles.map(c => c.close);
const period = params.period || 14;

// Simple Moving Average
const slice = closes.slice(-period);
const sma = slice.reduce((s, v) => s + v, 0) / slice.length;
const lastClose = closes[closes.length - 1];
const deviation = ((lastClose - sma) / sma) * 100;

return {
  value: Math.round(sma * 100) / 100,
  signal: lastClose > sma ? 'bullish' : lastClose < sma ? 'bearish' : 'neutral',
  strength: Math.min(100, Math.abs(deviation) * 15),
  label: lastClose > sma ? 'Price above SMA — bullish' : 'Price below SMA — bearish',
  details: { sma: Math.round(sma * 100) / 100, deviation: Math.round(deviation * 100) / 100 }
};`;

/* ── Component ── */
export function PluginsClient() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('custom');
  const [code, setCode] = useState(TEMPLATE_CODE);

  const fetchPlugins = useCallback(async () => {
    try {
      const res = await fetch('/api/plugins');
      const data = await res.json();
      setPlugins(data.plugins || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { setTimeout(() => fetchPlugins(), 0); }, [fetchPlugins]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('custom');
    setCode(TEMPLATE_CODE);
    setEditingId(null);
    setTestResult(null);
    setTestError(null);
  };

  const openEditor = (plugin?: Plugin) => {
    if (plugin) {
      setName(plugin.name);
      setDescription(plugin.description);
      setCategory(plugin.category);
      setCode(plugin.code);
      setEditingId(plugin.id);
    } else {
      resetForm();
    }
    setTestResult(null);
    setTestError(null);
    setShowEditor(true);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await fetch('/api/plugins/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        setTestResult(data.result);
      } else {
        setTestError(data.error || 'Validation failed');
      }
    } catch {
      setTestError('Network error');
    }
    setTesting(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/plugins/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, category, code }),
        });
      } else {
        await fetch('/api/plugins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, category, code, version: '1.0.0', author: 'You', params: [] }),
        });
      }
      setShowEditor(false);
      resetForm();
      fetchPlugins();
    } catch { /* */ }
    setSaving(false);
  };

  const handleToggle = async (id: string) => {
    await fetch(`/api/plugins/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toggle: true }),
    });
    fetchPlugins();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/plugins/${id}`, { method: 'DELETE' });
    fetchPlugins();
  };

  const enabledCount = plugins.filter(p => p.enabled).length;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Plugins</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Extend TradeClaw with custom JavaScript indicator modules
          </p>
        </div>
        <button
          onClick={() => openEditor()}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg text-sm transition-colors"
        >
          + New Plugin
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-3 text-center">
          <div className="text-lg font-bold font-mono tabular-nums">{plugins.length}</div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Total</div>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-400">{enabledCount}</div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Active</div>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <div className="text-lg font-bold font-mono tabular-nums">{CATEGORIES.length}</div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Categories</div>
        </div>
      </div>

      {/* Plugin List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-zinc-800 rounded w-1/3 mb-2" />
              <div className="h-3 bg-zinc-800/50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : plugins.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="flex justify-center mb-3"><Puzzle className="h-10 w-10 text-zinc-600" /></div>
          <h3 className="text-lg font-medium text-zinc-300 mb-1">No plugins yet</h3>
          <p className="text-sm text-zinc-500 mb-4">Create your first custom indicator</p>
          <button
            onClick={() => openEditor()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg text-sm transition-colors"
          >
            Create Plugin
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map(plugin => (
            <div key={plugin.id} className="glass-card rounded-xl p-4 hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-zinc-200 truncate">{plugin.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] rounded font-medium uppercase tracking-wider ${
                      plugin.enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {plugin.enabled ? 'Active' : 'Disabled'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-500 uppercase tracking-wider">
                      {plugin.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{plugin.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-600">
                    <span>v{plugin.version}</span>
                    <span>by {plugin.author}</span>
                    <span>{new Date(plugin.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={() => handleToggle(plugin.id)}
                    className={`p-1.5 rounded text-xs transition-colors ${
                      plugin.enabled ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-zinc-500 hover:bg-zinc-800'
                    }`}
                    title={plugin.enabled ? 'Disable' : 'Enable'}
                  >
                    {plugin.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => openEditor(plugin)}
                    className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-xs transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(plugin.id)}
                    className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="glass-card rounded-xl p-4 border-l-2 border-emerald-500/50">
        <h3 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-emerald-400" /> How Plugins Work</h3>
        <div className="text-xs text-zinc-500 space-y-1.5 leading-relaxed">
          <p>Write JavaScript that receives OHLCV candle data and returns a signal result.</p>
          <p>Your function gets: <code className="text-emerald-500/80 bg-emerald-500/5 px-1 rounded">candles[]</code> (OHLCV array), <code className="text-emerald-500/80 bg-emerald-500/5 px-1 rounded">params</code> (your config), and <code className="text-emerald-500/80 bg-emerald-500/5 px-1 rounded">Math</code>.</p>
          <p>Must return: <code className="text-emerald-500/80 bg-emerald-500/5 px-1 rounded">{'{ value, signal, strength, label }'}</code></p>
          <p>Plugins run sandboxed — no network access, no file system, no imports.</p>
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{editingId ? 'Edit Plugin' : 'New Plugin'}</h2>
                <button
                  onClick={() => { setShowEditor(false); resetForm(); }}
                  className="text-zinc-500 hover:text-zinc-300 text-lg"
                >✕</button>
              </div>

              {/* Name + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                    placeholder="My Indicator"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Description</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  placeholder="What does this indicator do?"
                />
              </div>

              {/* Code Editor */}
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">JavaScript Code</label>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-emerald-300 font-mono leading-relaxed focus:outline-none focus:border-emerald-500/50 resize-none"
                  rows={16}
                  spellCheck={false}
                />
              </div>

              {/* Test Result */}
              {testResult && (
                <div className="bg-zinc-950 rounded-lg p-3 border border-emerald-500/20">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Test Result</div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-sm font-mono tabular-nums text-zinc-200">{testResult.value}</div>
                      <div className="text-[9px] text-zinc-600">VALUE</div>
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${
                        testResult.signal === 'bullish' ? 'text-emerald-400' :
                        testResult.signal === 'bearish' ? 'text-rose-400' : 'text-zinc-400'
                      }`}>{testResult.signal.toUpperCase()}</div>
                      <div className="text-[9px] text-zinc-600">SIGNAL</div>
                    </div>
                    <div>
                      <div className="text-sm font-mono tabular-nums text-zinc-200">{testResult.strength}%</div>
                      <div className="text-[9px] text-zinc-600">STRENGTH</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400 truncate">{testResult.label}</div>
                      <div className="text-[9px] text-zinc-600">LABEL</div>
                    </div>
                  </div>
                </div>
              )}

              {testError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-sm text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />{testError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {testing ? 'Testing...' : '▶ Test Code'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Plugin' : 'Save Plugin'}
                </button>
                <button
                  onClick={() => { setShowEditor(false); resetForm(); }}
                  className="px-4 py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
