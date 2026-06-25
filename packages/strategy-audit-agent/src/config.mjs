import { readFile } from "node:fs/promises";

const KNOWN_SYMBOLS = new Set([
  "XAUUSD",
  "BTCUSD",
  "ETHUSD",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "XAGUSD",
  "AUDUSD",
]);

const KNOWN_TIMEFRAMES = new Set(["M15", "H1", "H4", "D1"]);
const KNOWN_PERIODS = new Set(["7D", "30D", "90D", "ALL"]);
const KNOWN_STRATEGIES = new Set([
  "EMA Crossover + RSI",
  "MACD Divergence",
  "Bollinger Breakout",
  "ATR Trend Follow",
  "Classic",
  "Regime Aware",
  "HMM Top-3",
  "VWAP+EMA+BB",
  "VWAP + EMA + BB",
  "Full Risk",
]);

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function uniqueStrings(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
  return [...new Set(value.map((item) => requireString(item, label)))];
}

function finiteNumber(value, label, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${label} must be between ${min} and ${max}`);
  }
  return number;
}

function validateKnown(values, known, label, allowExperimentalLabels) {
  if (allowExperimentalLabels) return;
  const unknown = values.filter((value) => !known.has(value));
  if (unknown.length > 0) {
    throw new Error(
      `${label} contains unsupported values: ${unknown.join(", ")}. ` +
        "Set allowExperimentalLabels=true only when the TradeClaw UI exposes them.",
    );
  }
}

export function allowedHostsFromEnv() {
  const configured = process.env.TRADECLAW_ALLOWED_HOSTS;
  const hosts = configured
    ? configured.split(",").map((host) => host.trim()).filter(Boolean)
    : ["tradeclaw.win", "localhost", "127.0.0.1"];
  return new Set(hosts);
}

export function normalizeAuditRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Audit request must be a JSON object");
  }

  const allowExperimentalLabels = input.allowExperimentalLabels === true;
  const baseUrl = new URL(input.baseUrl ?? "https://tradeclaw.win");
  if (!['http:', 'https:'].includes(baseUrl.protocol)) {
    throw new Error("baseUrl must use http or https");
  }
  if (!allowedHostsFromEnv().has(baseUrl.hostname)) {
    throw new Error(
      `baseUrl host ${baseUrl.hostname} is not allowlisted. ` +
        "Set TRADECLAW_ALLOWED_HOSTS explicitly to add a controlled host.",
    );
  }

  const symbols = uniqueStrings(input.symbols ?? ["BTCUSD"], "symbols");
  const timeframes = uniqueStrings(input.timeframes ?? ["H1"], "timeframes");
  const periods = uniqueStrings(input.periods ?? ["90D"], "periods");
  const strategies = uniqueStrings(
    input.strategies ?? ["EMA Crossover + RSI"],
    "strategies",
  );

  validateKnown(symbols, KNOWN_SYMBOLS, "symbols", allowExperimentalLabels);
  validateKnown(timeframes, KNOWN_TIMEFRAMES, "timeframes", allowExperimentalLabels);
  validateKnown(periods, KNOWN_PERIODS, "periods", allowExperimentalLabels);
  validateKnown(strategies, KNOWN_STRATEGIES, "strategies", allowExperimentalLabels);

  const requestedMaxRuns = Number(input.maxRuns ?? 24);
  if (!Number.isInteger(requestedMaxRuns) || requestedMaxRuns < 1 || requestedMaxRuns > 48) {
    throw new Error("maxRuns must be an integer between 1 and 48");
  }

  const mode = input.mode ?? "hybrid";
  if (!["deterministic", "computer", "hybrid"].includes(mode)) {
    throw new Error("mode must be deterministic, computer, or hybrid");
  }

  return {
    schemaVersion: 1,
    customer: {
      name: requireString(input.customer?.name ?? "Pilot customer", "customer.name"),
      reference: typeof input.customer?.reference === "string"
        ? input.customer.reference.trim()
        : "",
    },
    objective: requireString(
      input.objective ?? "Evaluate historical robustness under explicit assumptions",
      "objective",
    ),
    strategyRules: requireString(
      input.strategyRules ?? "Use the selected TradeClaw strategy preset without modification.",
      "strategyRules",
    ),
    baseUrl: baseUrl.origin,
    symbols,
    timeframes,
    periods,
    strategies,
    initialBalance: finiteNumber(input.initialBalance ?? 10_000, "initialBalance", 100, 100_000_000),
    riskPerTradePercent: finiteNumber(
      input.riskPerTradePercent ?? 1,
      "riskPerTradePercent",
      0.01,
      10,
    ),
    includeSlippage: input.includeSlippage !== false,
    mode,
    maxRuns: requestedMaxRuns,
    allowComputerFallback: input.allowComputerFallback !== false,
    allowExperimentalLabels,
    outputLabel: typeof input.outputLabel === "string" && input.outputLabel.trim()
      ? input.outputLabel.trim()
      : "strategy-audit",
  };
}

export async function loadAuditRequest(filePath) {
  const text = await readFile(filePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
  return normalizeAuditRequest(parsed);
}
