import 'server-only';

/**
 * Thin client for chart-img.com's TradingView layout-chart endpoint.
 * Mirrors the Hafiz/Impulse bot's chartFetcher.js.
 *
 * Env vars required:
 *   CHART_API_KEY            — chart-img.com API key
 *   CHART_API_BASE_URL       — default https://api.chart-img.com/v2/tradingview/layout-chart
 *   CHART_LAYOUTS            — JSON: { "<name>": "<layoutId>" }
 *   TRADINGVIEW_SESSION_ID   — TV Pro session cookie
 *   TRADINGVIEW_SESSION_SIGN — TV Pro sessionid_sign cookie
 */

const TF_TO_INTERVAL: Record<string, string> = {
  M1: '1',
  M5: '5',
  M15: '15',
  M30: '30',
  H1: '1h',
  H4: '4h',
  D1: '1D',
  W1: '1W',
};

export interface ChartRequest {
  symbol: string;
  timeframe: string;
  layout?: string;
  theme?: 'light' | 'dark';
  width?: number;
  height?: number;
}

export interface ChartResult {
  ok: true;
  bytes: ArrayBuffer;
  contentType: string;
}

export interface ChartError {
  ok: false;
  status: number;
  error: string;
}

function resolveLayoutId(name: string | undefined): string | null {
  const raw = process.env.CHART_LAYOUTS;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (name && parsed[name]) return parsed[name];
    const first = Object.values(parsed)[0];
    return first ?? null;
  } catch {
    return null;
  }
}

export async function fetchLayoutChart(req: ChartRequest): Promise<ChartResult | ChartError> {
  const apiKey = process.env.CHART_API_KEY;
  const sessionId = process.env.TRADINGVIEW_SESSION_ID;
  const sessionSign = process.env.TRADINGVIEW_SESSION_SIGN;
  const baseUrl =
    process.env.CHART_API_BASE_URL ?? 'https://api.chart-img.com/v2/tradingview/layout-chart';

  if (!apiKey) return { ok: false, status: 503, error: 'CHART_API_KEY not set' };
  if (!sessionId || !sessionSign) {
    return { ok: false, status: 503, error: 'TRADINGVIEW_SESSION_* not set' };
  }

  const layoutId = resolveLayoutId(req.layout);
  if (!layoutId) return { ok: false, status: 503, error: 'No CHART_LAYOUTS configured' };

  const interval = TF_TO_INTERVAL[req.timeframe.toUpperCase()];
  if (!interval) {
    return { ok: false, status: 400, error: `unsupported timeframe: ${req.timeframe}` };
  }

  const body = {
    symbol: req.symbol.toUpperCase(),
    interval,
    theme: req.theme ?? 'light',
    width: req.width ?? 1200,
    height: req.height ?? 800,
    timezone: 'Asia/Singapore',
  };

  const url = `${baseUrl}/${layoutId}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'tradingview-session-id': sessionId,
        'tradingview-session-id-sign': sessionSign,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    return {
      ok: false,
      status: 504,
      error: err instanceof Error ? err.message : 'fetch failed',
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return {
      ok: false,
      status: res.status,
      error: text.slice(0, 200) || `chart-img ${res.status}`,
    };
  }

  const contentType = res.headers.get('content-type') ?? 'image/png';
  const bytes = await res.arrayBuffer();
  return { ok: true, bytes, contentType };
}
