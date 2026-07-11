function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildAuditMatrix(request) {
  const runs = [];
  const runIds = new Set();

  for (const symbol of request.symbols) {
    for (const timeframe of request.timeframes) {
      for (const period of request.periods) {
        for (const strategy of request.strategies) {
          const id = [symbol, timeframe, period, strategy].map(slug).join("__");
          if (runIds.has(id)) {
            throw new Error(
              `Duplicate audit run id ${id}; adjust strategy labels or request values to avoid artifact overwrite.`,
            );
          }
          runIds.add(id);
          runs.push({
            id,
            symbol,
            timeframe,
            period,
            strategy,
            initialBalance: request.initialBalance,
            riskPerTradePercent: request.riskPerTradePercent,
            includeSlippage: request.includeSlippage,
          });
        }
      }
    }
  }

  if (runs.length > request.maxRuns) {
    throw new Error(
      `Audit matrix creates ${runs.length} runs, above maxRuns=${request.maxRuns}. ` +
        "Reduce the matrix; broad brute-force searches are expensive and encourage overfitting.",
    );
  }

  if (request.mode === "computer" && runs.length > 8) {
    throw new Error(
      `Computer-only mode is capped at 8 runs; this request creates ${runs.length}. ` +
        "Use deterministic or hybrid mode for larger matrices.",
    );
  }

  return runs;
}
