function finite(values) {
  return values.filter((value) => Number.isFinite(value));
}

function median(values) {
  const sorted = finite(values).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function formatNumber(value, suffix = "", digits = 2) {
  return Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : "n/a";
}

function escapeTable(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function classifyRun(run) {
  if (run.status !== "completed") return "failed";
  const metrics = run.metrics ?? {};
  const trades = metrics.totalTrades;
  if (!Number.isFinite(trades) || trades < 20) return "insufficient-sample";

  const positiveReturn = Number.isFinite(metrics.totalReturnPercent)
    && metrics.totalReturnPercent > 0;
  const controlledDrawdown = Number.isFinite(metrics.maxDrawdownPercent)
    && Math.abs(metrics.maxDrawdownPercent) <= 25;
  const usefulProfitFactor = Number.isFinite(metrics.profitFactor)
    && metrics.profitFactor >= 1.2;

  if (positiveReturn && controlledDrawdown && usefulProfitFactor) return "promising";
  if (positiveReturn && Number.isFinite(metrics.profitFactor) && metrics.profitFactor > 1) {
    return "marginal";
  }
  return "weak";
}

export function summarizeResults(results) {
  const completed = results.filter((run) => run.status === "completed");
  const classifications = completed.map(classifyRun);
  return {
    requestedRuns: results.length,
    completedRuns: completed.length,
    failedRuns: results.length - completed.length,
    promisingRuns: classifications.filter((value) => value === "promising").length,
    marginalRuns: classifications.filter((value) => value === "marginal").length,
    weakRuns: classifications.filter((value) => value === "weak").length,
    insufficientSampleRuns: classifications.filter((value) => value === "insufficient-sample").length,
    medianReturnPercent: median(completed.map((run) => run.metrics?.totalReturnPercent)),
    medianProfitFactor: median(completed.map((run) => run.metrics?.profitFactor)),
    worstDrawdownPercent: finite(
      completed.map((run) => Math.abs(run.metrics?.maxDrawdownPercent)),
    ).sort((a, b) => b - a)[0] ?? null,
    totalObservedTrades: finite(completed.map((run) => run.metrics?.totalTrades))
      .reduce((sum, value) => sum + value, 0),
  };
}

export function buildMarkdownReport({ request, results, generatedAt, requestHash = "", aiSummary = "" }) {
  const summary = summarizeResults(results);
  const lines = [];

  lines.push(`# TradeClaw Strategy Audit — ${request.customer.name}`);
  lines.push("");
  lines.push(`Generated: ${generatedAt}`);
  if (requestHash) lines.push(`Request fingerprint: \`${requestHash}\``);
  lines.push("");
  lines.push("> Historical simulation only. This report is not investment advice, a performance guarantee, or authorization to execute a trade.");
  lines.push("");
  lines.push("## Executive verdict");
  lines.push("");

  if (summary.completedRuns === 0) {
    lines.push("No run completed successfully. Do not draw a strategy conclusion from this audit.");
  } else if (summary.promisingRuns === 0) {
    lines.push("The tested matrix did not produce a robust-looking cell under the conservative screening rules. Treat the strategy as unvalidated.");
  } else if (summary.promisingRuns / summary.completedRuns < 0.4) {
    lines.push("Some cells look promising, but the result is fragile across the tested matrix. The next step is out-of-sample and sensitivity testing, not live deployment.");
  } else {
    lines.push("The strategy looks comparatively stable across several tested cells, but it remains a historical hypothesis until out-of-sample, walk-forward, and data-quality checks pass.");
  }

  if (aiSummary.trim()) {
    lines.push("");
    lines.push("### AI review");
    lines.push("");
    lines.push(aiSummary.trim());
  }

  lines.push("");
  lines.push("## Scope and assumptions");
  lines.push("");
  lines.push(`- Objective: ${request.objective}`);
  lines.push(`- Strategy rules supplied: ${request.strategyRules}`);
  lines.push(`- Initial balance: ${request.initialBalance}`);
  lines.push(`- Risk per trade: ${request.riskPerTradePercent}%`);
  lines.push(`- Slippage toggle: ${request.includeSlippage ? "enabled" : "disabled"}`);
  lines.push(`- Requested/completed: ${summary.requestedRuns}/${summary.completedRuns}`);
  lines.push("");
  lines.push("## Matrix summary");
  lines.push("");
  lines.push(`- Promising cells: ${summary.promisingRuns}`);
  lines.push(`- Marginal cells: ${summary.marginalRuns}`);
  lines.push(`- Weak cells: ${summary.weakRuns}`);
  lines.push(`- Insufficient-sample cells: ${summary.insufficientSampleRuns}`);
  lines.push(`- Median return: ${formatNumber(summary.medianReturnPercent, "%")}`);
  lines.push(`- Median profit factor: ${formatNumber(summary.medianProfitFactor)}`);
  lines.push(`- Worst observed drawdown: ${formatNumber(summary.worstDrawdownPercent, "%")}`);
  lines.push(`- Total observed trades: ${formatNumber(summary.totalObservedTrades, "", 0)}`);
  lines.push("");
  lines.push("## Run details");
  lines.push("");
  lines.push("| Symbol | TF | Period | Strategy | Return | PF | Win rate | Max DD | Trades | Screen | Runner |");
  lines.push("|---|---:|---:|---|---:|---:|---:|---:|---:|---|---|");

  for (const run of results) {
    const metrics = run.metrics ?? {};
    lines.push([
      `| ${escapeTable(run.symbol)}`,
      escapeTable(run.timeframe),
      escapeTable(run.period),
      escapeTable(run.strategy),
      formatNumber(metrics.totalReturnPercent, "%"),
      formatNumber(metrics.profitFactor),
      formatNumber(metrics.winRatePercent, "%"),
      formatNumber(metrics.maxDrawdownPercent, "%"),
      formatNumber(metrics.totalTrades, "", 0),
      classifyRun(run),
      escapeTable(run.mode ?? "n/a") + " |",
    ].join(" | "));
  }

  lines.push("");
  lines.push("## Failure log");
  lines.push("");
  const failed = results.filter((run) => run.status !== "completed");
  if (failed.length === 0) {
    lines.push("No automation failures were recorded.");
  } else {
    for (const run of failed) lines.push(`- ${run.id}: ${run.error ?? "unknown error"}`);
  }

  lines.push("");
  lines.push("## Required next validation");
  lines.push("");
  lines.push("1. Freeze the rules before expanding the search space.");
  lines.push("2. Run an untouched out-of-sample window and a walk-forward test.");
  lines.push("3. Stress fees, spread, slippage, latency, and missing-candle assumptions.");
  lines.push("4. Reject conclusions driven by one symbol, one period, or fewer than 20 trades.");
  lines.push("5. Paper trade before considering any live use; keep execution outside this browser agent.");
  lines.push("");
  lines.push("## Method note");
  lines.push("");
  lines.push("The labels in this report are screening labels, not forecasts. “Promising” means only that a historical cell passed simple minimum thresholds: positive return, profit factor at least 1.2, maximum drawdown no greater than 25%, and at least 20 observed trades.");

  return `${lines.join("\n")}\n`;
}

export async function createAiReview({ request, results }) {
  if (!process.env.OPENAI_API_KEY) return "";
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-5.5";
  const compactResults = results.map((run) => ({
    symbol: run.symbol,
    timeframe: run.timeframe,
    period: run.period,
    strategy: run.strategy,
    status: run.status,
    metrics: run.metrics,
    classification: classifyRun(run),
  }));

  const response = await client.responses.create({
    model,
    input: `You are reviewing historical backtest evidence for a software QA-style strategy audit.\n\n` +
      `Write 120-180 words. Be skeptical. Discuss robustness, sample size, concentration, drawdown, ` +
      `and missing validation. Do not recommend a trade, asset, position, or live deployment. ` +
      `Do not claim future profitability.\n\n` +
      `Objective: ${request.objective}\nRules: ${request.strategyRules}\n` +
      `Results JSON: ${JSON.stringify(compactResults)}`,
  });
  return response.output_text ?? "";
}
