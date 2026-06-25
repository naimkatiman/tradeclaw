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
import { query } from '../db-pool';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RecentSignalRow {
  pair: string;
  direction: string;
  confidence: number;
  entry_price: number;
  tp1: number | null;
  sl: number | null;
  outcome_4h: { hit: boolean; pnlPct: number } | null;
  outcome_24h: { hit: boolean; pnlPct: number } | null;
  created_at: string;
}

interface SymbolStats {
  totalSignals: number;
  resolved: number;
  wins: number;
  winRate: number;
  avgPnl: number;
  lastDirection: string | null;
  lastConfidence: number | null;
  lastEntry: number | null;
}

async function fetchSymbolStats(symbol: string): Promise<SymbolStats> {
  const fallback: SymbolStats = {
    totalSignals: 0,
    resolved: 0,
    wins: 0,
    winRate: 0,
    avgPnl: 0,
    lastDirection: null,
    lastConfidence: null,
    lastEntry: null,
  };

  if (!process.env.DATABASE_URL) return fallback;

  try {
    const rows = await query<RecentSignalRow>(
      `SELECT pair, direction, confidence, entry_price, tp1, sl,
              outcome_4h, outcome_24h, created_at
       FROM signal_history
       WHERE pair = $1 AND is_simulated = FALSE
         AND COALESCE(gate_blocked, false) = false
       ORDER BY created_at DESC
       LIMIT 50`,
      [symbol],
    );

    if (rows.length === 0) return fallback;

    let resolved = 0;
    let wins = 0;
    let pnlSum = 0;

    for (const r of rows) {
      if (r.outcome_24h && r.outcome_24h.pnlPct !== 0) {
        resolved++;
        pnlSum += r.outcome_24h.pnlPct;
        if (r.outcome_24h.hit) wins++;
      }
    }

    const latest = rows[0];

    return {
      totalSignals: rows.length,
      resolved,
      wins,
      winRate: resolved > 0 ? Math.round((wins / resolved) * 100) : 0,
      avgPnl: resolved > 0 ? +(pnlSum / resolved).toFixed(2) : 0,
      lastDirection: latest.direction,
      lastConfidence: latest.confidence,
      lastEntry: Number(latest.entry_price),
    };
  } catch {
    return fallback;
  }
}

function buildAnalystAnalysis(
  symbol: string,
  timeframe: string,
  stats: SymbolStats,
): AgentAnalysis {
  const hasData = stats.totalSignals > 0;

  const signals: AgentAnalysis['signals'] = [];

  if (hasData) {
    signals.push({
      indicator: 'Win Rate (24h)',
      value: `${stats.winRate}%`,
      interpretation:
        stats.winRate >= 60
          ? 'Strong historical performance'
          : stats.winRate >= 45
            ? 'Average performance'
            : 'Below average — caution advised',
    });
    signals.push({
      indicator: 'Avg P&L',
      value: `${stats.avgPnl}%`,
      interpretation: stats.avgPnl > 0 ? 'Positive expectancy' : 'Negative expectancy',
    });
    signals.push({
      indicator: 'Sample Size',
      value: `${stats.resolved} resolved / ${stats.totalSignals} total`,
      interpretation:
        stats.resolved >= 20
          ? 'Statistically meaningful'
          : 'Limited sample — lower confidence',
    });
    if (stats.lastDirection) {
      signals.push({
        indicator: 'Last Signal',
        value: `${stats.lastDirection} @ ${stats.lastEntry}`,
        interpretation: `Most recent bias: ${stats.lastDirection}`,
      });
    }
  } else {
    signals.push({
      indicator: 'RSI',
      value: '52',
      interpretation: 'Neutral zone — no clear overbought/oversold',
    });
    signals.push({
      indicator: 'MACD',
      value: 'Bullish crossover',
      interpretation: 'Momentum shifting up (mock — no historical data)',
    });
    signals.push({
      indicator: 'EMA 50/200',
      value: 'Converging',
      interpretation: 'Potential golden cross (mock — no historical data)',
    });
  }

  const confidence = hasData
    ? Math.min(90, Math.max(40, stats.winRate + (stats.resolved >= 20 ? 10 : -5)))
    : 55;

  const summary = hasData
    ? `Technical analysis for ${symbol} on ${timeframe} based on ${stats.totalSignals} recent signals. Win rate: ${stats.winRate}% over ${stats.resolved} resolved trades. Avg P&L: ${stats.avgPnl}%. Last bias: ${stats.lastDirection ?? 'N/A'}.`
    : `Technical analysis for ${symbol} on ${timeframe}. No historical signal data available — using default mock indicators.`;

  return {
    role: 'analyst',
    summary,
    confidence,
    signals,
    timestamp: new Date(),
  };
}

function buildRiskAnalysis(
  symbol: string,
  stats: SymbolStats,
): AgentAnalysis {
  const signals: AgentAnalysis['signals'] = [];

  if (stats.resolved > 0) {
    const drawdownEstimate = stats.avgPnl < 0
      ? `${(stats.avgPnl * 3).toFixed(1)}% (3x avg loss)`
      : '-2.0% (estimated from avg winners)';

    signals.push({
      indicator: 'Historical Win Rate',
      value: `${stats.winRate}%`,
      interpretation:
        stats.winRate >= 55
          ? 'Acceptable edge for position sizing'
          : 'Edge uncertain — reduce size',
    });
    signals.push({
      indicator: 'Est. Max Drawdown',
      value: drawdownEstimate,
      interpretation: 'Based on recent resolved outcomes',
    });
    signals.push({
      indicator: 'Position Size',
      value: stats.winRate >= 55 ? '1% risk' : '0.5% risk',
      interpretation:
        stats.winRate >= 55
          ? 'Standard sizing — edge confirmed'
          : 'Half-size — edge not confirmed',
    });
  } else {
    signals.push({
      indicator: 'ATR',
      value: '1.2%',
      interpretation: 'Moderate volatility (mock)',
    });
    signals.push({
      indicator: 'Max Drawdown (30d)',
      value: '-4.2%',
      interpretation: 'Within tolerance (mock)',
    });
    signals.push({
      indicator: 'Position Size',
      value: '0.5% risk',
      interpretation: 'Reduced — no historical data to confirm edge',
    });
  }

  const confidence = stats.resolved >= 10
    ? Math.min(85, stats.winRate)
    : 50;

  return {
    role: 'risk_manager',
    summary: stats.resolved > 0
      ? `Risk assessment for ${symbol}: ${stats.winRate}% win rate over ${stats.resolved} trades. ${stats.winRate >= 55 ? 'Standard' : 'Reduced'} position sizing recommended.`
      : `Risk assessment for ${symbol}: insufficient historical data. Conservative 0.5% position sizing recommended until track record develops.`,
    confidence,
    signals,
    timestamp: new Date(),
  };
}

function buildPMVerdict(
  analystAnalysis: AgentAnalysis,
  riskAnalysis: AgentAnalysis,
  stats: SymbolStats,
): FinalVerdict {
  const avgConfidence = Math.round(
    (analystAnalysis.confidence + riskAnalysis.confidence) / 2,
  );

  // Decision logic based on real data when available
  let action: 'BUY' | 'SELL' | 'HOLD';
  let sizing: string;
  let reasoning: string;

  if (stats.resolved < 5) {
    action = 'HOLD';
    sizing = 'No position';
    reasoning =
      'Insufficient historical data to form conviction. Wait for at least 5 resolved signals before taking a position.';
  } else if (avgConfidence >= 65 && stats.winRate >= 55) {
    action = (stats.lastDirection as 'BUY' | 'SELL') ?? 'BUY';
    sizing = '1% of portfolio';
    reasoning = `${action} signal supported by ${stats.winRate}% win rate and ${avgConfidence}% combined confidence from analyst and risk agents.`;
  } else if (avgConfidence >= 50 && stats.winRate >= 45) {
    action = (stats.lastDirection as 'BUY' | 'SELL') ?? 'BUY';
    sizing = '0.5% of portfolio';
    reasoning = `${action} with reduced size — win rate (${stats.winRate}%) and confidence (${avgConfidence}%) are borderline. Half-position to manage risk.`;
  } else {
    action = 'HOLD';
    sizing = 'No position';
    reasoning = `Insufficient conviction: ${stats.winRate}% win rate with ${avgConfidence}% confidence. Wait for a higher-probability setup.`;
  }

  return {
    action,
    confidence: avgConfidence,
    sizing,
    reasoning,
  };
}

function shouldAttemptTradingAgentsBridge(): boolean {
  return process.env.TRADING_AGENTS_DISABLE_BRIDGE !== '1';
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

/**
 * Minimal runtime shape guard for the JS<->Python bridge contract. Each stage
 * output is optional in the result, but when present the consumer maps/joins
 * over nested arrays (analyst.bullishFactors/bearishFactors/sources,
 * risk.risks). On drift we console.error so the contract break is observable
 * and return the parsed value unchanged — the existing per-stage `if (!run.x)`
 * checks remain the source of control flow.
 */
function validateTradingAgentsRunResult(parsed: unknown): TradingAgentsRunResult {
  if (parsed === null || typeof parsed !== 'object') {
    console.error('[trading-agents] bridge output is not a JSON object — contract drift:', parsed);
    return parsed as TradingAgentsRunResult;
  }

  const result = parsed as Record<string, unknown>;

  const analyst = result.analyst as Record<string, unknown> | undefined;
  if (analyst !== undefined && analyst !== null) {
    if (
      !Array.isArray(analyst.bullishFactors) ||
      !Array.isArray(analyst.bearishFactors) ||
      !Array.isArray(analyst.sources)
    ) {
      console.error(
        '[trading-agents] analyst output missing expected arrays (bullishFactors/bearishFactors/sources) — contract drift:',
        analyst,
      );
    }
  }

  const risk = result.risk as Record<string, unknown> | undefined;
  if (risk !== undefined && risk !== null && !Array.isArray(risk.risks)) {
    console.error('[trading-agents] risk output missing expected array (risks) — contract drift:', risk);
  }

  return parsed as TradingAgentsRunResult;
}

function parseTradingAgentsOutput(stdout: string): TradingAgentsRunResult {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error('TradingAgents bridge returned no output');
  }

  try {
    return validateTradingAgentsRunResult(JSON.parse(trimmed));
  } catch {
    const lastJsonLine = trimmed
      .split(/\r?\n/)
      .reverse()
      .find((line) => line.trim().startsWith('{') || line.trim().startsWith('['));

    if (lastJsonLine) {
      return validateTradingAgentsRunResult(JSON.parse(lastJsonLine));
    }

    throw new Error('TradingAgents bridge output was not valid JSON');
  }
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

function toBridgeAnalystAnalysis(output: AnalystAgentOutput, symbol: string, timeframe: string): AgentAnalysis {
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
    summary: output.summary || `TradingAgents analyst review for ${symbol} on ${timeframe}.`,
    confidence: output.confidence,
    signals: [
      ...bullishSignals,
      ...bearishSignals,
      {
        indicator: 'Sources',
        value: output.sources.join(', ') || 'None',
        interpretation: 'External research references',
      },
    ],
    timestamp: new Date(),
  };
}

function toBridgeRiskAnalysis(output: RiskAgentOutput, symbol: string): AgentAnalysis {
  const signals = output.risks.map((risk, index) => ({
    indicator: `Risk ${index + 1}`,
    value: risk,
    interpretation: output.veto ? 'Bridge veto' : 'Bridge risk note',
  }));

  if (output.maxPositionSizePct !== undefined) {
    signals.push({
      indicator: 'Max Position Size',
      value: `${output.maxPositionSizePct}%`,
      interpretation: 'Position sizing from TradingAgents risk stage',
    });
  }

  return {
    role: 'risk_manager',
    summary: output.summary || `TradingAgents risk review for ${symbol}.`,
    confidence: output.veto ? 35 : 65,
    signals,
    timestamp: new Date(),
  };
}

function applyBridgeVerdict(
  output: PortfolioManagerAgentOutput | undefined,
  fallback: FinalVerdict,
): FinalVerdict {
  if (!output) {
    return fallback;
  }

  return {
    action: output.recommendation,
    confidence: fallback.confidence,
    sizing: output.positionSizingPct !== undefined ? `${output.positionSizingPct}% of portfolio` : fallback.sizing,
    reasoning: output.rationale || fallback.reasoning,
  };
}

async function tryTradingAgentsBridge(
  jobId: string,
  symbol: string,
  timeframe: string,
  stats: SymbolStats,
  leaseToken?: string,
): Promise<boolean> {
  if (!shouldAttemptTradingAgentsBridge()) {
    return false;
  }

  const bridgeConfig = createBridgeConfig();
  const tradeDate = toIsoTradeDate();

  try {
    const analystInvocation: TradingAgentsInvocation = {
      stage: 'analyst',
      payload: {
        role: 'analyst',
        symbol,
        tradeDate,
        assetType: 'stock',
        selectedAnalysts: ['market', 'social', 'news', 'fundamentals'],
        marketContext: {
          timeframe,
          recentStats: stats,
        },
      } satisfies AnalystAgentInput,
    };
    const analystCommand = buildTradingAgentsCommand(analystInvocation, bridgeConfig);
    const analystRun = await runTradingAgentsCommand(analystCommand);

    if (!analystRun.analyst) {
      throw new Error('TradingAgents analyst stage did not return analyst output');
    }

    const analystAnalysis = toBridgeAnalystAnalysis(analystRun.analyst, symbol, timeframe);

    await updateJobStatus(jobId, 'analyst', undefined, undefined, leaseToken);

    const riskInvocation: TradingAgentsInvocation = {
      stage: 'risk',
      payload: {
        role: 'risk',
        symbol,
        tradeDate,
        assetType: 'stock',
        analystReport: analystRun.analyst,
        draftPlan: {
          recommendation: 'Hold',
          rationale: analystRun.analyst.summary,
          strategicActions: `Review TradingAgents consensus for ${symbol} on ${timeframe}`,
        },
      } satisfies RiskAgentInput,
    };
    const riskCommand = buildTradingAgentsCommand(riskInvocation, bridgeConfig);
    const riskRun = await runTradingAgentsCommand(riskCommand);

    if (!riskRun.risk) {
      throw new Error('TradingAgents risk stage did not return risk output');
    }

    const riskAnalysis = toBridgeRiskAnalysis(riskRun.risk, symbol);

    await updateJobStatus(jobId, 'risk', [analystAnalysis], undefined, leaseToken);

    const pmInvocation: TradingAgentsInvocation = {
      stage: 'portfolio-manager',
      payload: {
        role: 'portfolio-manager',
        symbol,
        tradeDate,
        assetType: 'stock',
        analystReport: analystRun.analyst,
        riskReview: riskRun.risk,
      } satisfies PortfolioManagerAgentInput,
    };
    const pmCommand = buildTradingAgentsCommand(pmInvocation, bridgeConfig);
    const pmRun = await runTradingAgentsCommand(pmCommand);

    const analyses = [analystAnalysis, riskAnalysis];
    const fallbackVerdict = buildPMVerdict(analystAnalysis, riskAnalysis, stats);
    const verdict = applyBridgeVerdict(pmRun.portfolioManager, fallbackVerdict);

    await updateJobStatus(jobId, 'pm', analyses, undefined, leaseToken);
    await updateJobStatus(jobId, 'complete', analyses, verdict, leaseToken);

    return true;
  } catch {
    return false;
  }
}

/**
 * Runs the research pipeline: analyst -> risk -> PM.
 * The analyst step queries real signal_history for the symbol to enrich analysis
 * with actual win rates and indicator data.
 * The bridge path is attempted first when available; the existing synthetic
 * pipeline remains as a safe fallback until upstream integration is fully live.
 */
export async function runResearchPipeline(
  jobId: string,
  symbol: string,
  timeframe: string,
  context: { leaseToken?: string; attemptCount?: number } = {},
): Promise<void> {
  try {
    const stats = await fetchSymbolStats(symbol);

    if (await tryTradingAgentsBridge(jobId, symbol, timeframe, stats, context.leaseToken)) {
      return;
    }

    // Step 1: Analyst — fetch real data then analyze
    await updateJobStatus(jobId, 'analyst', undefined, undefined, context.leaseToken);
    await delay(800);

    const analystResult = buildAnalystAnalysis(symbol, timeframe, stats);

    // Step 2: Risk Manager
    await updateJobStatus(jobId, 'risk', [analystResult], undefined, context.leaseToken);
    await delay(600);

    const riskResult = buildRiskAnalysis(symbol, stats);

    // Step 3: Portfolio Manager
    const analyses = [analystResult, riskResult];
    await updateJobStatus(jobId, 'pm', analyses, undefined, context.leaseToken);
    await delay(500);

    const verdict = buildPMVerdict(analystResult, riskResult, stats);

    // Complete
    await updateJobStatus(jobId, 'complete', analyses, verdict, context.leaseToken);
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
      // Best-effort status update — DB may be unreachable or lease expired.
    }

    throw new Error(`Research pipeline failed for job ${jobId}: ${message}`);
  }
}

/**
 * @deprecated Use runResearchPipeline instead. Kept for backward compatibility.
 */
export const runMockResearch = runResearchPipeline;
