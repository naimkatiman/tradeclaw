function parseNumeric(raw) {
  if (raw == null) return null;
  const normalized = String(raw).replace(/,/g, "").replace(/%/g, "").trim();
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseNumeric(match[1]);
  }
  return null;
}

export function extractBacktestMetrics(rawText) {
  const text = String(rawText ?? "");
  return {
    totalReturnPercent: firstMatch(text, [
      /Total\s+Return\s*[:\n]?\s*([+-]?[\d,.]+\s*%?)/i,
      /Net\s+Return\s*[:\n]?\s*([+-]?[\d,.]+\s*%?)/i,
      /Cumulative\s+(?:P&L|Return)\s*[:\n]?\s*([+-]?[\d,.]+\s*%?)/i,
    ]),
    netProfit: firstMatch(text, [
      /Net\s+Profit\s*[:\n]?\s*\$?([+-]?[\d,.]+)/i,
      /Profit\s*[:\n]?\s*\$?([+-]?[\d,.]+)/i,
    ]),
    winRatePercent: firstMatch(text, [
      /Win\s+Rate\s*[:\n]?\s*([\d,.]+\s*%?)/i,
    ]),
    maxDrawdownPercent: firstMatch(text, [
      /Max(?:imum)?\s+Drawdown\s*[:\n]?\s*([+-]?[\d,.]+\s*%?)/i,
      /Drawdown\s*[:\n]?\s*([+-]?[\d,.]+\s*%?)/i,
    ]),
    profitFactor: firstMatch(text, [
      /Profit\s+Factor\s*[:\n]?\s*([\d,.]+)/i,
    ]),
    sharpeRatio: firstMatch(text, [
      /Sharpe(?:\s+Ratio)?\s*[:\n]?\s*([+-]?[\d,.]+)/i,
    ]),
    expectancy: firstMatch(text, [
      /Expectancy\s*[:\n]?\s*\$?([+-]?[\d,.]+)/i,
    ]),
    totalTrades: firstMatch(text, [
      /Total\s+Trades\s*[:\n]?\s*([\d,.]+)/i,
      /Number\s+of\s+Trades\s*[:\n]?\s*([\d,.]+)/i,
      /(?:^|\n)Trades\s*[:\n]?\s*([\d,.]+)/im,
    ]),
  };
}

export function hasUsefulMetrics(metrics) {
  return Object.values(metrics).filter((value) => value != null).length >= 2;
}
