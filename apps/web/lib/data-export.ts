/**
 * TradeClaw Data Export/Import
 *
 * Handles serialising and deserialising all user data into a single portable
 * JSON blob.  Server-side data (alerts, paper-trading, webhooks, plugins,
 * telegram-subscribers) is read/written via the file-system helpers.
 * Client-side data (strategies, watchlist) is merged by the /data page component.
 */

import fs from 'fs';
import path from 'path';
import { readAlerts, type PriceAlert } from './price-alerts';
import { getPortfolio, type Portfolio } from './paper-trading';
import { readWebhooks, type WebhookConfig } from './webhooks';
import { listPlugins, validatePluginCode, type PluginIndicator } from './plugin-system';
import { readSubscribers, type TelegramSubscriber } from './telegram-subscribers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SanitisedWebhook {
  id: string;
  name: string;
  url: string;
  hasSecret: boolean;
  pairs: string[] | 'all';
  minConfidence: number;
  enabled: boolean;
  createdAt: string;
  deliveryCount: number;
}

export interface ServerExportData {
  alerts: PriceAlert[];
  paperTrading: Portfolio;
  webhooks: SanitisedWebhook[];
  plugins: PluginIndicator[];
  telegramSettings: TelegramSubscriber[];
}

export interface ExportPayload {
  version: '1.0';
  exportedAt: string;
  instance: { name: string; version: string };
  data: ServerExportData & {
    /** Populated client-side before download */
    strategies: unknown[];
    watchlist: string[];
  };
}

export interface ImportPreviewResult {
  counts: {
    alerts: number;
    paperTradingPositions: number;
    paperTradingHistory: number;
    webhooks: number;
    plugins: number;
    telegramSettings: number;
    strategies: number;
    watchlist: number;
  };
  conflicts: {
    alerts: number;
    webhooks: number;
    plugins: number;
  };
  valid: boolean;
  errors: string[];
}

export interface ImportResult {
  imported: {
    alerts: number;
    paperTradingPositions: number;
    paperTradingHistory: number;
    webhooks: number;
    plugins: number;
    telegramSettings: number;
  };
  skipped: {
    alerts: number;
    webhooks: number;
    plugins: number;
  };
  mode: 'merge' | 'replace';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const PKG_VERSION = (() => {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

function sanitiseWebhooks(webhooks: WebhookConfig[]): SanitisedWebhook[] {
  return webhooks.map(({ secret, deliveryLog: _log, failCount: _fc, lastDelivery: _ld, ...rest }) => ({
    id: rest.id,
    name: rest.name,
    url: rest.url,
    hasSecret: Boolean(secret),
    pairs: rest.pairs,
    minConfidence: rest.minConfidence,
    enabled: rest.enabled,
    createdAt: rest.createdAt,
    deliveryCount: rest.deliveryCount,
  }));
}

export function collectServerData(): ServerExportData {
  return {
    alerts: readAlerts(),
    paperTrading: getPortfolio(),
    webhooks: sanitiseWebhooks(readWebhooks()),
    plugins: listPlugins(),
    telegramSettings: readSubscribers(),
  };
}

export function buildExportPayload(
  serverData: ServerExportData,
  clientData: { strategies: unknown[]; watchlist: string[] } = { strategies: [], watchlist: [] }
): ExportPayload {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    instance: { name: 'TradeClaw', version: PKG_VERSION },
    data: { ...serverData, ...clientData },
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateImportPayload(raw: unknown): string[] {
  const errors: string[] = [];

  if (typeof raw !== 'object' || raw === null) {
    errors.push('Payload must be a JSON object');
    return errors;
  }

  const payload = raw as Record<string, unknown>;

  if (payload.version !== '1.0') {
    errors.push(`Unsupported export version: ${String(payload.version ?? 'missing')}`);
  }

  if (typeof payload.exportedAt !== 'string') {
    errors.push('Missing or invalid exportedAt field');
  }

  if (typeof payload.data !== 'object' || payload.data === null) {
    errors.push('Missing data object');
    return errors;
  }

  const data = payload.data as Record<string, unknown>;
  const arrayFields = ['alerts', 'webhooks', 'plugins', 'telegramSettings', 'strategies', 'watchlist'] as const;

  for (const field of arrayFields) {
    if (data[field] !== undefined && !Array.isArray(data[field])) {
      errors.push(`data.${field} must be an array`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Preview (dry-run)
// ---------------------------------------------------------------------------

export function previewImport(raw: unknown): ImportPreviewResult {
  const errors = validateImportPayload(raw);
  if (errors.length > 0) {
    return {
      counts: {
        alerts: 0,
        paperTradingPositions: 0,
        paperTradingHistory: 0,
        webhooks: 0,
        plugins: 0,
        telegramSettings: 0,
        strategies: 0,
        watchlist: 0,
      },
      conflicts: { alerts: 0, webhooks: 0, plugins: 0 },
      valid: false,
      errors,
    };
  }

  const payload = raw as ExportPayload;
  const data = payload.data;
  const current = collectServerData();

  const currentAlertIds = new Set(current.alerts.map(a => a.id));
  const currentWebhookIds = new Set(current.webhooks.map(w => w.id));
  const currentPluginIds = new Set(current.plugins.map(p => p.id));

  const incomingAlerts = Array.isArray(data.alerts) ? (data.alerts as PriceAlert[]) : [];
  const incomingWebhooks = Array.isArray(data.webhooks) ? (data.webhooks as SanitisedWebhook[]) : [];
  const incomingPlugins = Array.isArray(data.plugins) ? (data.plugins as PluginIndicator[]) : [];
  const incomingTelegram = Array.isArray(data.telegramSettings) ? data.telegramSettings : [];
  const incomingStrategies = Array.isArray(data.strategies) ? data.strategies : [];
  const incomingWatchlist = Array.isArray(data.watchlist) ? data.watchlist : [];
  const pt = data.paperTrading as Partial<Portfolio> | undefined;
  const ptPositions = Array.isArray(pt?.positions) ? pt.positions : [];
  const ptHistory = Array.isArray(pt?.history) ? pt.history : [];

  return {
    counts: {
      alerts: incomingAlerts.length,
      paperTradingPositions: ptPositions.length,
      paperTradingHistory: ptHistory.length,
      webhooks: incomingWebhooks.length,
      plugins: incomingPlugins.length,
      telegramSettings: incomingTelegram.length,
      strategies: incomingStrategies.length,
      watchlist: incomingWatchlist.length,
    },
    conflicts: {
      alerts: incomingAlerts.filter(a => currentAlertIds.has(a.id)).length,
      webhooks: incomingWebhooks.filter(w => currentWebhookIds.has(w.id)).length,
      plugins: incomingPlugins.filter(p => currentPluginIds.has(p.id)).length,
    },
    valid: true,
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Import (server-side data only; client data is handled in the browser)
// ---------------------------------------------------------------------------

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function writeJson(filePath: string, data: unknown): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function importServerData(payload: ExportPayload, mode: 'merge' | 'replace'): ImportResult {
  const data = payload.data;
  const current = collectServerData();

  // ── Alerts ──────────────────────────────────────────────────────────────
  const currentAlertIds = new Set(current.alerts.map(a => a.id));
  const incomingAlerts = Array.isArray(data.alerts) ? (data.alerts as PriceAlert[]) : [];
  let finalAlerts: PriceAlert[];
  let skippedAlerts = 0;

  if (mode === 'replace') {
    finalAlerts = incomingAlerts;
  } else {
    const newAlerts = incomingAlerts.filter(a => !currentAlertIds.has(a.id));
    skippedAlerts = incomingAlerts.length - newAlerts.length;
    finalAlerts = [...current.alerts, ...newAlerts];
  }
  writeJson(path.join(DATA_DIR, 'price-alerts.json'), {
    alerts: finalAlerts,
    lastChecked: new Date().toISOString(),
  });

  // ── Paper trading ────────────────────────────────────────────────────────
  const incomingPT = data.paperTrading as Partial<Portfolio> | undefined;
  let ptPositionsCount = 0;
  let ptHistoryCount = 0;

  if (incomingPT) {
    if (mode === 'replace') {
      writeJson(path.join(DATA_DIR, 'paper-trading.json'), incomingPT);
      ptPositionsCount = (incomingPT.positions ?? []).length;
      ptHistoryCount = (incomingPT.history ?? []).length;
    } else {
      const currentHistIds = new Set(current.paperTrading.history.map(h => h.id));
      const newHistory = (incomingPT.history ?? []).filter(h => !currentHistIds.has(h.id));
      const merged: Portfolio = {
        ...current.paperTrading,
        history: [...current.paperTrading.history, ...newHistory],
      };
      writeJson(path.join(DATA_DIR, 'paper-trading.json'), merged);
      ptPositionsCount = current.paperTrading.positions.length;
      ptHistoryCount = merged.history.length;
    }
  }

  // ── Webhooks ─────────────────────────────────────────────────────────────
  const currentWebhookIds = new Set(current.webhooks.map(w => w.id));
  const incomingWebhooks = Array.isArray(data.webhooks) ? (data.webhooks as SanitisedWebhook[]) : [];
  let finalWebhooks: SanitisedWebhook[];
  let skippedWebhooks = 0;

  if (mode === 'replace') {
    finalWebhooks = incomingWebhooks;
  } else {
    const newWebhooks = incomingWebhooks.filter(w => !currentWebhookIds.has(w.id));
    skippedWebhooks = incomingWebhooks.length - newWebhooks.length;
    finalWebhooks = [...current.webhooks, ...newWebhooks];
  }
  writeJson(path.join(DATA_DIR, 'webhooks.json'), finalWebhooks);

  // ── Plugins ──────────────────────────────────────────────────────────────
  const currentPluginIds = new Set(current.plugins.map(p => p.id));
  const allIncomingPlugins = Array.isArray(data.plugins) ? (data.plugins as PluginIndicator[]) : [];
  // Validate plugin code before importing — reject any that fail validation
  const incomingPlugins = allIncomingPlugins.filter(p => {
    if (!p.code) return false;
    const { valid } = validatePluginCode(p.code);
    return valid;
  });
  let finalPlugins: PluginIndicator[];
  let skippedPlugins = 0;

  if (mode === 'replace') {
    finalPlugins = incomingPlugins;
    skippedPlugins = allIncomingPlugins.length - incomingPlugins.length;
  } else {
    const newPlugins = incomingPlugins.filter(p => !currentPluginIds.has(p.id));
    skippedPlugins = allIncomingPlugins.length - newPlugins.length;
    finalPlugins = [...current.plugins, ...newPlugins];
  }
  writeJson(path.join(DATA_DIR, 'plugins.json'), finalPlugins);

  // ── Telegram subscribers ─────────────────────────────────────────────────
  const incomingTelegram = Array.isArray(data.telegramSettings)
    ? (data.telegramSettings as TelegramSubscriber[])
    : [];

  if (mode === 'replace') {
    writeJson(path.join(DATA_DIR, 'telegram-subscribers.json'), incomingTelegram);
  } else {
    const currentChatIds = new Set(current.telegramSettings.map(s => s.chatId));
    const newSubs = incomingTelegram.filter(s => !currentChatIds.has(s.chatId));
    writeJson(path.join(DATA_DIR, 'telegram-subscribers.json'), [
      ...current.telegramSettings,
      ...newSubs,
    ]);
  }

  return {
    imported: {
      alerts: finalAlerts.length,
      paperTradingPositions: ptPositionsCount,
      paperTradingHistory: ptHistoryCount,
      webhooks: finalWebhooks.length,
      plugins: finalPlugins.length,
      telegramSettings: incomingTelegram.length,
    },
    skipped: {
      alerts: skippedAlerts,
      webhooks: skippedWebhooks,
      plugins: skippedPlugins,
    },
    mode,
  };
}
