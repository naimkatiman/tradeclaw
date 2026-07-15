import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

export interface TVAlert {
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

export interface AlertStats {
  total: number;
  last24h: number;
  byPair: Record<string, number>;
}

const ALERTS_FILE = path.join(process.cwd(), "data", "tradingview-alerts.json");

const SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: "BTCUSD", BTC: "BTCUSD", BTCUSD: "BTCUSD",
  ETHUSDT: "ETHUSD", ETH: "ETHUSD", ETHUSD: "ETHUSD",
  XAUUSD: "XAUUSD", GOLD: "XAUUSD", XAUUSDT: "XAUUSD",
  XAGUSD: "XAGUSD", SILVER: "XAGUSD",
  EURUSD: "EURUSD", GBPUSD: "GBPUSD",
  USDJPY: "USDJPY", GBPJPY: "GBPJPY",
  SOLUSDT: "SOLUSD", SOL: "SOLUSD",
  BNBUSDT: "BNBUSD", BNB: "BNBUSD",
};

export function normalizeSymbol(symbol: string): string {
  const upper = symbol.toUpperCase().replace(/[-_/]/g, "");
  return SYMBOL_MAP[upper] ?? upper;
}

export function normalizeAction(action: string): "BUY" | "SELL" {
  const lower = action.toLowerCase();
  if (lower === "buy" || lower === "long" || lower === "entry_long") return "BUY";
  return "SELL";
}

function readAlerts(): TVAlert[] {
  try {
    if (!fs.existsSync(ALERTS_FILE)) return [];
    const data = JSON.parse(fs.readFileSync(ALERTS_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAlerts(alerts: TVAlert[]): void {
  const dir = path.dirname(ALERTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
}

export function saveAlert(payload: Omit<TVAlert, "id" | "receivedAt" | "normalizedPair" | "normalizedAction">): TVAlert {
  const alert: TVAlert = {
    ...payload,
    id: randomUUID(),
    receivedAt: new Date().toISOString(),
    normalizedPair: normalizeSymbol(payload.symbol),
    normalizedAction: normalizeAction(payload.action),
  };
  const alerts = readAlerts();
  const updated = [alert, ...alerts].slice(0, 100);
  writeAlerts(updated);
  return alert;
}

export function getAlerts(limit = 20, pair?: string): TVAlert[] {
  const alerts = readAlerts();
  const filtered = pair ? alerts.filter(a => a.normalizedPair === pair) : alerts;
  return filtered.slice(0, limit);
}

export function getAlertStats(): AlertStats {
  const alerts = readAlerts();
  const cutoff = Date.now() - 86400000;
  const byPair: Record<string, number> = {};
  let last24h = 0;
  for (const a of alerts) {
    byPair[a.normalizedPair] = (byPair[a.normalizedPair] ?? 0) + 1;
    if (new Date(a.receivedAt).getTime() > cutoff) last24h++;
  }
  return { total: alerts.length, last24h, byPair };
}
