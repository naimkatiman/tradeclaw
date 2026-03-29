import { loadConfig } from "./config.js";

export interface Signal {
  symbol: string;
  direction: "BUY" | "SELL" | "HOLD";
  confidence: number;
  price: number;
  timestamp: string;
  indicators?: Record<string, number>;
}

export interface BacktestResult {
  symbol: string;
  days: number;
  totalTrades: number;
  winRate: number;
  profitLoss: number;
  sharpeRatio: number;
  maxDrawdown: number;
  equityCurve: number[];
}

export interface ApiError {
  message: string;
  status?: number;
}

function getHeaders(): Record<string, string> {
  const config = loadConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apikey) {
    headers["Authorization"] = `Bearer ${config.apikey}`;
  }
  return headers;
}

function getBaseUrl(): string {
  const config = loadConfig();
  return config.url.replace(/\/+$/, "");
}

export async function fetchSignals(options?: {
  symbol?: string;
  filter?: string;
}): Promise<Signal[]> {
  const baseUrl = getBaseUrl();
  const params = new URLSearchParams();
  if (options?.symbol) params.set("symbol", options.symbol);
  if (options?.filter) params.set("direction", options.filter);

  const query = params.toString();
  const url = `${baseUrl}/api/signals${query ? `?${query}` : ""}`;

  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `API error (${response.status}): ${body || response.statusText}`,
    );
  }

  const data = (await response.json()) as Signal[] | { signals: Signal[] };
  return Array.isArray(data) ? data : data.signals;
}

export async function fetchBacktest(options: {
  symbol: string;
  days: number;
}): Promise<BacktestResult> {
  const baseUrl = getBaseUrl();
  const params = new URLSearchParams({
    symbol: options.symbol,
    days: String(options.days),
  });

  const url = `${baseUrl}/api/backtest?${params.toString()}`;

  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `API error (${response.status}): ${body || response.statusText}`,
    );
  }

  return (await response.json()) as BacktestResult;
}
