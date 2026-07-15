import { spawn } from 'node:child_process';
import { once } from 'node:events';

import {
  buildTradingAgentsCommand,
  type AnalystAgentInput,
  type AnalystAgentOutput,
  type PortfolioManagerAgentInput,
  type PortfolioManagerAgentOutput,
  type RiskAgentInput,
  type RiskAgentOutput,
  type TradingAgentsAssetType,
  type TradingAgentsBridgeConfig,
  type TradingAgentsCommand,
  type TradingAgentsInvocation,
  type TradingAgentsRunResult,
} from '@tradeclaw/trading-agents';

import type { AgentAnalysis, FinalVerdict } from './types';
import {
  MAX_RESEARCH_JOB_ATTEMPTS,
  markResearchJobFailed,
  markResearchJobRetry,
  updateJobStatus,
} from './research-jobs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`TradingAgents bridge returned invalid ${path}`);
  }
}

function requireStringArray(
  value: unknown,
  path: string,
  options: { nonEmpty?: boolean } = {},
): asserts value is string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || item.trim().length === 0) ||
    (options.nonEmpty && value.length === 0)
  ) {
    throw new Error(`TradingAgents bridge returned invalid ${path}`);
  }
}

function requireSourceUrls(value: unknown, path: string): asserts value is string[] {
  requireStringArray(value, path, { nonEmpty: true });
  const allHttpUrls = value.every((source) => {
    try {
      const url = new URL(source);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  });
  if (!allHttpUrls) {
    throw new Error(`TradingAgents bridge returned non-reconstructable ${path}`);
  }
}

function requirePercentage(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`TradingAgents bridge returned invalid ${path}`);
  }
}

function validateAnalystOutput(value: unknown): asserts value is AnalystAgentOutput {
  if (!isRecord(value)) {
    throw new Error('TradingAgents analyst stage did not return analyst output');
  }

  requireNonEmptyString(value.summary, 'analyst.summary');
  requireStringArray(value.bullishFactors, 'analyst.bullishFactors');
  requireStringArray(value.bearishFactors, 'analyst.bearishFactors');
  requireSourceUrls(value.sources, 'analyst.sources');
  requirePercentage(value.confidence, 'analyst.confidence');
}

function validateRiskOutput(value: unknown): asserts value is RiskAgentOutput {
  if (!isRecord(value)) {
    throw new Error('TradingAgents risk stage did not return risk output');
  }

  requireNonEmptyString(value.summary, 'risk.summary');
  if (typeof value.veto !== 'boolean') {
    throw new Error('TradingAgents bridge returned invalid risk.veto');
  }
  requireStringArray(value.risks, 'risk.risks');
  if (value.maxPositionSizePct !== undefined) {
    requirePercentage(value.maxPositionSizePct, 'risk.maxPositionSizePct');
  }
}

function validatePortfolioManagerOutput(
  value: unknown,
): asserts value is PortfolioManagerAgentOutput {
  if (!isRecord(value)) {
    throw new Error('TradingAgents portfolio-manager stage did not return portfolioManager output');
  }

  if (
    value.recommendation !== 'BUY' &&
    value.recommendation !== 'SELL' &&
    value.recommendation !== 'HOLD'
  ) {
    throw new Error('TradingAgents bridge returned invalid portfolioManager.recommendation');
  }
  requireNonEmptyString(value.rationale, 'portfolioManager.rationale');
  if (value.positionSizingPct !== undefined) {
    requirePercentage(value.positionSizingPct, 'portfolioManager.positionSizingPct');
  }
}

export function validateTradingAgentsRunResult(parsed: unknown): TradingAgentsRunResult {
  if (!isRecord(parsed)) {
    throw new Error('TradingAgents bridge output is not a JSON object');
  }

  if (parsed.analyst !== undefined) validateAnalystOutput(parsed.analyst);
  if (parsed.risk !== undefined) validateRiskOutput(parsed.risk);
  if (parsed.portfolioManager !== undefined) {
    validatePortfolioManagerOutput(parsed.portfolioManager);
  }

  return parsed as unknown as TradingAgentsRunResult;
}

function parseTradingAgentsOutput(stdout: string): TradingAgentsRunResult {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error('TradingAgents bridge returned no output');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const lastJsonLine = trimmed
      .split(/\r?\n/)
      .reverse()
      .find((line) => line.trim().startsWith('{'));

    if (!lastJsonLine) {
      throw new Error('TradingAgents bridge output was not valid JSON');
    }
    parsed = JSON.parse(lastJsonLine);
  }

  return validateTradingAgentsRunResult(parsed);
}

async function runTradingAgentsCommand(command: TradingAgentsCommand): Promise<TradingAgentsRunResult> {
  const child = spawn(command.command, command.args, {
    cwd: command.cwd,
    env: command.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const [code, signal] = await Promise.race([
    once(child, 'close') as Promise<[number | null, NodeJS.Signals | null]>,
    once(child, 'error').then(([error]) => {
      throw error;
    }),
  ]);

  if (code !== 0) {
    throw new Error(
      `TradingAgents bridge exited with code ${code}${signal ? ` (${signal})` : ''}${stderr ? `: ${stderr.trim()}` : ''}`,
    );
  }

  return parseTradingAgentsOutput(stdout);
}

function resolveTradingAgentsTransport(): TradingAgentsBridgeConfig['transport'] {
  const transport = process.env.TRADING_AGENTS_TRANSPORT;
  if (transport === 'python-module' || transport === 'http-json' || transport === 'stdio-json') {
    return transport;
  }
  return 'python-module';
}

function createBridgeConfig(): TradingAgentsBridgeConfig {
  return {
    projectRoot: process.env.TRADING_AGENTS_PROJECT_ROOT,
    pythonCommand: process.env.TRADING_AGENTS_PYTHON_COMMAND ?? 'python3',
    transport: resolveTradingAgentsTransport(),
    env: {
      ...process.env,
      TRADING_AGENTS_PIPELINE: 'research',
    },
  };
}

function toIsoTradeDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function resolveAssetType(symbol: string): TradingAgentsAssetType {
  const normalized = symbol.trim().toUpperCase().replace('/', '');
  if (/^(BTC|ETH|SOL|XRP|DOGE|ADA|BNB)/.test(normalized)) return 'crypto';
  if (/^(XAU|XAG)/.test(normalized)) return 'commodity';
  if (/^(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)[A-Z]{3}$/.test(normalized)) return 'forex';
  if (/^(SPX|NDX|DJI|DAX|FTSE|NIKKEI)/.test(normalized)) return 'index';
  return 'stock';
}

function toBridgeAnalystAnalysis(output: AnalystAgentOutput): AgentAnalysis {
  const bullishSignals = output.bullishFactors.map((factor, index) => ({
    indicator: `Bullish factor ${index + 1}`,
    value: factor,
    interpretation: 'TradingAgents bridge output',
  }));
  const bearishSignals = output.bearishFactors.map((factor, index) => ({
    indicator: `Bearish factor ${index + 1}`,
    value: factor,
    interpretation: 'TradingAgents bridge output',
  }));

  return {
    role: 'analyst',
    summary: output.summary,
    confidence: output.confidence,
    signals: [
      ...bullishSignals,
      ...bearishSignals,
      {
        indicator: 'Sources',
        value: output.sources.join(', '),
        interpretation: 'External research references supplied by the bridge',
      },
    ],
    timestamp: new Date(),
  };
}

function toBridgeRiskAnalysis(output: RiskAgentOutput): AgentAnalysis {
  const signals = output.risks.map((risk, index) => ({
    indicator: `Risk ${index + 1}`,
    value: risk,
    interpretation: output.veto ? 'Bridge veto' : 'Bridge risk note',
  }));

  if (output.maxPositionSizePct !== undefined) {
    signals.push({
      indicator: 'Max Position Size',
      value: `${output.maxPositionSizePct}%`,
      interpretation: 'Position limit supplied by the TradingAgents risk stage',
    });
  }

  return {
    role: 'risk_manager',
    summary: output.summary,
    signals,
    timestamp: new Date(),
  };
}

function toBridgeVerdict(output: PortfolioManagerAgentOutput): FinalVerdict {
  return {
    action: output.recommendation,
    reasoning: output.rationale,
    ...(output.positionSizingPct !== undefined
      ? { sizing: `${output.positionSizingPct}% of portfolio` }
      : {}),
  };
}

function assertConsistentVerdict(
  risk: RiskAgentOutput,
  portfolioManager: PortfolioManagerAgentOutput,
): void {
  if (risk.veto && portfolioManager.recommendation !== 'HOLD') {
    throw new Error('TradingAgents stages conflict: risk veto requires a HOLD recommendation');
  }
  if (
    risk.maxPositionSizePct !== undefined &&
    portfolioManager.positionSizingPct !== undefined &&
    portfolioManager.positionSizingPct > risk.maxPositionSizePct
  ) {
    throw new Error('TradingAgents stages conflict: position size exceeds the risk-stage maximum');
  }
}

async function runTradingAgentsBridge(
  jobId: string,
  symbol: string,
  timeframe: string,
  leaseToken?: string,
): Promise<void> {
  if (process.env.TRADING_AGENTS_DISABLE_BRIDGE === '1') {
    throw new Error('TradingAgents bridge is disabled; no fallback research is generated');
  }

  const bridgeConfig = createBridgeConfig();
  const tradeDate = toIsoTradeDate();
  const assetType = resolveAssetType(symbol);

  const analystInvocation: TradingAgentsInvocation = {
    stage: 'analyst',
    payload: {
      role: 'analyst',
      symbol,
      tradeDate,
      assetType,
      selectedAnalysts: ['market', 'social', 'news', 'fundamentals'],
      marketContext: { timeframe },
    } satisfies AnalystAgentInput,
  };
  const analystRun = await runTradingAgentsCommand(
    buildTradingAgentsCommand(analystInvocation, bridgeConfig),
  );
  validateAnalystOutput(analystRun.analyst);
  const analystAnalysis = toBridgeAnalystAnalysis(analystRun.analyst);
  await updateJobStatus(jobId, 'analyst', undefined, undefined, leaseToken);

  const riskInvocation: TradingAgentsInvocation = {
    stage: 'risk',
    payload: {
      role: 'risk',
      symbol,
      tradeDate,
      assetType,
      analystReport: analystRun.analyst,
    } satisfies RiskAgentInput,
  };
  const riskRun = await runTradingAgentsCommand(
    buildTradingAgentsCommand(riskInvocation, bridgeConfig),
  );
  validateRiskOutput(riskRun.risk);
  const riskAnalysis = toBridgeRiskAnalysis(riskRun.risk);
  await updateJobStatus(jobId, 'risk', [analystAnalysis], undefined, leaseToken);

  const pmInvocation: TradingAgentsInvocation = {
    stage: 'portfolio-manager',
    payload: {
      role: 'portfolio-manager',
      symbol,
      tradeDate,
      assetType,
      analystReport: analystRun.analyst,
      riskReview: riskRun.risk,
    } satisfies PortfolioManagerAgentInput,
  };
  const pmRun = await runTradingAgentsCommand(
    buildTradingAgentsCommand(pmInvocation, bridgeConfig),
  );
  validatePortfolioManagerOutput(pmRun.portfolioManager);
  assertConsistentVerdict(riskRun.risk, pmRun.portfolioManager);

  const analyses = [analystAnalysis, riskAnalysis];
  const verdict = toBridgeVerdict(pmRun.portfolioManager);
  await updateJobStatus(jobId, 'pm', analyses, undefined, leaseToken);
  await updateJobStatus(jobId, 'complete', analyses, verdict, leaseToken);
}

/**
 * Runs the configured TradingAgents bridge. Missing, disabled, malformed, or
 * internally inconsistent bridge output fails the job without fabricating a
 * local analyst report, trade direction, confidence, or position size.
 */
export async function runResearchPipeline(
  jobId: string,
  symbol: string,
  timeframe: string,
  context: { leaseToken?: string; attemptCount?: number } = {},
): Promise<void> {
  try {
    await runTradingAgentsBridge(jobId, symbol, timeframe, context.leaseToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    try {
      if (
        context.leaseToken &&
        typeof context.attemptCount === 'number' &&
        context.attemptCount < MAX_RESEARCH_JOB_ATTEMPTS
      ) {
        await markResearchJobRetry(jobId, message, context.leaseToken, context.attemptCount);
      } else if (context.leaseToken) {
        await markResearchJobFailed(jobId, message, context.leaseToken);
      } else {
        await updateJobStatus(jobId, 'failed', undefined, undefined, context.leaseToken);
      }
    } catch {
      // The database may be unreachable or the worker lease may have expired.
    }

    throw new Error(`Research pipeline failed for job ${jobId}: ${message}`);
  }
}

/** @deprecated Use runResearchPipeline instead. */
export const runMockResearch = runResearchPipeline;
