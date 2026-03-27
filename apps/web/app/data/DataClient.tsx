'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────

interface ExportPayload {
  version: string;
  exportedAt: string;
  instance: { name: string; version: string };
  data: Record<string, unknown>;
}

interface PreviewResult {
  counts: Record<string, number>;
  conflicts: Record<string, number>;
  valid: boolean;
  errors: string[];
}

interface ImportResult {
  imported: Record<string, number>;
  skipped: Record<string, number>;
  mode: string;
}

type DataSection = 'alerts' | 'paperTrading' | 'webhooks' | 'plugins' | 'telegramSettings' | 'strategies' | 'watchlist';

const DATA_SECTIONS: { key: DataSection; label: string; icon: string; storageKey?: string }[] = [
  { key: 'strategies', label: 'Strategies', icon: '🧠', storageKey: 'tc-strategies' },
  { key: 'alerts', label: 'Price Alerts', icon: '🔔' },
  { key: 'watchlist', label: 'Watchlist', icon: '⭐', storageKey: 'screener-watchlist' },
  { key: 'paperTrading', label: 'Paper Trading', icon: '📊' },
  { key: 'webhooks', label: 'Webhooks', icon: '🔗' },
  { key: 'plugins', label: 'Plugins', icon: '🧩' },
  { key: 'telegramSettings', label: 'Telegram', icon: '✈️' },
];

// ─── Component ────────────────────────────────────────────────

export function DataClient() {
  // Export state
  const [exportSections, setExportSections] = useState<Set<DataSection>>(
    new Set(DATA_SECTIONS.map(s => s.key))
  );
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  // Import state
  const [importFile, setImportFile] = useState<ExportPayload | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Export ───────────────────────────────────────────────────

  const toggleSection = (key: DataSection) => {
    setExportSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportMsg('');
    try {
      const res = await fetch('/api/export');
      if (!res.ok) throw new Error('Export failed');
      const payload = await res.json() as ExportPayload;

      // Merge client-side data
      for (const section of DATA_SECTIONS) {
        if (section.storageKey && exportSections.has(section.key)) {
          try {
            const raw = localStorage.getItem(section.storageKey);
            if (raw) {
              payload.data[section.key] = JSON.parse(raw);
            }
          } catch { /* skip */ }
        }
      }

      // Remove unchecked sections
      for (const section of DATA_SECTIONS) {
        if (!exportSections.has(section.key)) {
          delete payload.data[section.key];
        }
      }

      // Download
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `tradeclaw-export-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg('Export downloaded successfully');
    } catch (err) {
      setExportMsg(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [exportSections]);

  // ─── Import ───────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    setImportError('');
    setPreview(null);
    setImportResult(null);
    setImportFileName(file.name);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ExportPayload;
      setImportFile(parsed);

      // Auto-preview
      setPreviewing(true);
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      const result = await res.json() as PreviewResult;
      setPreview(result);
      if (!result.valid) {
        setImportError(result.errors.join(', '));
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Invalid file');
      setImportFile(null);
    } finally {
      setPreviewing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      handleFileSelect(file);
    } else {
      setImportError('Please drop a .json file');
    }
  }, [handleFileSelect]);

  const handleImport = useCallback(async () => {
    if (!importFile) return;
    setImporting(true);
    setImportError('');

    try {
      const res = await fetch(`/api/import?mode=${importMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importFile),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }

      const result = await res.json();

      // Write client-side data
      for (const section of DATA_SECTIONS) {
        if (section.storageKey && importFile.data[section.key]) {
          try {
            localStorage.setItem(
              section.storageKey,
              JSON.stringify(importFile.data[section.key])
            );
          } catch { /* skip */ }
        }
      }

      setImportResult(result.result as ImportResult);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }, [importFile, importMode]);

  const resetImport = () => {
    setImportFile(null);
    setImportFileName('');
    setPreview(null);
    setImportResult(null);
    setImportError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20 md:pb-8">
      {/* Header */}
      <div className="border-b border-white/5 bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Data Management</h1>
              <p className="text-sm text-neutral-400">Export and import your TradeClaw data</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">

          {/* ─── Export Card ─────────────────────────────────────── */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <h2 className="text-lg font-semibold text-white">Export Data</h2>
            </div>
            <p className="mb-5 text-sm text-neutral-400">
              Download all your data as a portable JSON file. Select which sections to include.
            </p>

            {/* Section checkboxes */}
            <div className="mb-5 space-y-2">
              {DATA_SECTIONS.map(section => (
                <label
                  key={section.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
                >
                  <input
                    type="checkbox"
                    checked={exportSections.has(section.key)}
                    onChange={() => toggleSection(section.key)}
                    className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-emerald-500 focus:ring-emerald-500/30"
                  />
                  <span className="text-base">{section.icon}</span>
                  <span className="text-sm text-neutral-200">{section.label}</span>
                  {section.storageKey && (
                    <span className="ml-auto rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-500">
                      client
                    </span>
                  )}
                </label>
              ))}
            </div>

            <button
              onClick={handleExport}
              disabled={exporting || exportSections.size === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              {exporting ? 'Exporting…' : `Export ${exportSections.size} Section${exportSections.size !== 1 ? 's' : ''}`}
            </button>

            {exportMsg && (
              <p className={`mt-3 text-center text-sm ${exportMsg.includes('success') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {exportMsg}
              </p>
            )}
          </div>

          {/* ─── Import Card ─────────────────────────────────────── */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <h2 className="text-lg font-semibold text-white">Import Data</h2>
            </div>
            <p className="mb-5 text-sm text-neutral-400">
              Restore data from a TradeClaw export file. Preview before importing.
            </p>

            {!importFile && !importResult ? (
              /* Drop zone */
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-neutral-700 hover:border-neutral-600 hover:bg-white/[0.02]'
                }`}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-neutral-500">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p className="text-sm text-neutral-400">Drop a <code className="text-emerald-400">.json</code> export file here</p>
                <p className="mt-1 text-xs text-neutral-600">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            ) : importResult ? (
              /* Import result */
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-sm font-medium text-emerald-400">Import Complete</span>
                    <span className="ml-auto rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
                      {importResult.mode}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(importResult.imported).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">{formatKey(key)}</span>
                        <span className="font-mono text-neutral-200" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                  {Object.values(importResult.skipped).some(v => v > 0) && (
                    <div className="mt-3 border-t border-white/5 pt-3">
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">Skipped (existing)</p>
                      {Object.entries(importResult.skipped)
                        .filter(([, v]) => v > 0)
                        .map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-neutral-500">{key}</span>
                            <span className="font-mono text-neutral-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {val}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={resetImport}
                  className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/5"
                >
                  Import Another File
                </button>
              </div>
            ) : (
              /* Preview */
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  </svg>
                  <span className="flex-1 truncate text-sm text-neutral-300">{importFileName}</span>
                  <button onClick={resetImport} className="text-neutral-500 hover:text-neutral-300">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {previewing ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="h-5 w-5 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span className="ml-2 text-sm text-neutral-400">Analyzing file…</span>
                  </div>
                ) : preview && preview.valid ? (
                  <>
                    {/* File meta */}
                    {importFile && (
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-neutral-500">
                        <span>v{importFile.version}</span>
                        <span className="mx-2">·</span>
                        <span>{new Date(importFile.exportedAt).toLocaleString()}</span>
                        {importFile.instance && (
                          <>
                            <span className="mx-2">·</span>
                            <span>{importFile.instance.name} {importFile.instance.version}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Counts */}
                    <div className="space-y-1.5">
                      {Object.entries(preview.counts).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
                          <span className="text-neutral-400">{formatKey(key)}</span>
                          <div className="flex items-center gap-2">
                            {preview.conflicts[key as keyof typeof preview.conflicts] > 0 && (
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                                {preview.conflicts[key as keyof typeof preview.conflicts]} conflict{preview.conflicts[key as keyof typeof preview.conflicts] !== 1 ? 's' : ''}
                              </span>
                            )}
                            <span className="font-mono text-neutral-200" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {val}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mode selector */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImportMode('merge')}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          importMode === 'merge'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-white/5 text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        <span className="font-medium">Merge</span>
                        <p className="mt-0.5 text-[10px] opacity-60">Add new, skip existing</p>
                      </button>
                      <button
                        onClick={() => setImportMode('replace')}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          importMode === 'replace'
                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                            : 'border-white/5 text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        <span className="font-medium">Replace</span>
                        <p className="mt-0.5 text-[10px] opacity-60">Overwrite everything</p>
                      </button>
                    </div>

                    {/* Import button */}
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                        importMode === 'replace'
                          ? 'bg-rose-600 hover:bg-rose-500'
                          : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                    >
                      {importing ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : null}
                      {importing ? 'Importing…' : `Import (${importMode})`}
                    </button>
                  </>
                ) : null}
              </div>
            )}

            {importError && (
              <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                <p className="text-sm text-rose-400">{importError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="mb-2 text-sm font-medium text-neutral-300">About Data Portability</h3>
          <ul className="space-y-1.5 text-xs text-neutral-500">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">•</span>
              <span>Export creates a single JSON file with all your data — strategies, alerts, watchlists, paper trading history, and more.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">•</span>
              <span>Webhook signing secrets are <strong className="text-neutral-400">redacted</strong> in exports for security. Re-configure them after import.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">•</span>
              <span><strong className="text-neutral-400">Merge</strong> adds new items and skips duplicates. <strong className="text-neutral-400">Replace</strong> overwrites everything.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">•</span>
              <span>Use this to migrate between instances or back up before resetting.</span>
            </li>
          </ul>
        </div>

        {/* Back link */}
        <div className="mt-4 text-center">
          <Link href="/settings" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
            ← Back to Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}
